// Cloudflare Pages Function
// POST /api/order             -> saves the order (KV binding ORDERS). The page itself emails it via FormSubmit and reports the result in `mail`.
// GET  /api/order  (header x-admin-key: SECRET) -> lists orders (SECRET = env var ADMIN_KEY)
// PATCH /api/order (header x-admin-key) body {id, action} where action is
//   processing | dispatched | delivered | back   -> moves an order along (dispatched/delivered email the customer)
//   set     {amount, paid}                       -> total price and paid tick
//   resend  {kind: received|dispatched|delivered, email?} -> sends a customer email again (can fix the address)
// DELETE /api/order?id=order:... (header x-admin-key) -> deletes one order

import { sendCustomerEmail, safeUrl } from '../_lib/mail.js';

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

const clean = (v, n) => String(v ?? '').replace(/[\u0000-\u001f\u007f]+/g, ' ').trim().slice(0, n);
// only keep links that point at this same site
const refUrl = (v, req) => { try { const u = new URL(String(v || '')); return u.host === new URL(req.url).host ? u.href.slice(0, 300) : ''; } catch { return ''; } };
const isIndia = c => /^\s*(india|bharat|in)\s*$/i.test(c);

export async function onRequestPost({ request, env, waitUntil }) {
  // 1) Only accept orders sent from our own site
  const origin = request.headers.get('origin');
  if (origin && new URL(origin).host !== new URL(request.url).host) return json({ error: 'forbidden' }, 403);

  let d;
  try { d = await request.json(); } catch { return json({ error: 'bad request' }, 400); }
  if (!d || typeof d !== 'object') return json({ error: 'bad request' }, 400);

  // 2) Bots: hidden field filled, or form submitted impossibly fast. Pretend success.
  if (d.website) return json({ ok: true });
  if (!(Number(d.ms) >= 3000)) return json({ error: 'too fast' }, 429);

  const o = {
    product: clean(d.product, 80),
    quantity: Math.min(Math.max(parseInt(d.quantity, 10) || 1, 1), 100),
    note: clean(d.note, 500),
    name: clean(d.name, 80),
    mobile: clean(d.mobile, 20).replace(/\D/g, ''), // full international number incl. country code, e.g. 919876543210 or 14155550123
    email: clean(d.email, 120),
    address: clean(d.address, 250),
    city: clean(d.city, 60),
    pin: clean(d.pin, 12),
    country: clean(d.country, 60),
    photo: refUrl(d.photo, request),
    page: refUrl(d.page, request),
    via: d.via === 'plain' ? 'plain' : 'whatsapp',
    mail: /^(sent|failed|not configured)/.test(String(d.mail || '')) ? clean(d.mail, 100) : '',
  };

  const ok =
    o.product && o.name && o.address.length >= 5 && o.city && o.country &&
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(o.email) &&
    /^\d{8,15}$/.test(o.mobile) && (!o.mobile.startsWith('91') || o.mobile.length === 12) &&
    (isIndia(o.country) ? /^\d{6}$/.test(o.pin) : /^[A-Za-z0-9 -]{3,12}$/.test(o.pin));
  if (!ok) return json({ error: 'invalid' }, 400);
  if (!env.ORDERS) return json({ error: 'storage not configured' }, 500);

  // 3) Simple rate limit: one order per phone number / IP every 20 seconds
  const now = Date.now();
  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  for (const k of [`rl:ip:${ip}`, `rl:m:${o.mobile}`]) {
    const last = Number(await env.ORDERS.get(k));
    if (last && now - last < 20000) return json({ error: 'slow down' }, 429);
  }
  await Promise.all([
    env.ORDERS.put(`rl:ip:${ip}`, String(now), { expirationTtl: 60 }),
    env.ORDERS.put(`rl:m:${o.mobile}`, String(now), { expirationTtl: 60 }),
  ]);

  // 4) Save (shown on /orders)
  const createdAt = new Date(now).toISOString();
  const id = `order:${createdAt}_${crypto.randomUUID().slice(0, 8)}`;
  // Order number: 1001, 1002, ... (simple counter). Once, number the orders that came before numbers existed, so new ones follow them.
  try { if (!(await env.ORDERS.get('meta:legacyDone'))) { await loadOrders(env); await env.ORDERS.put('meta:legacyDone', '1'); } } catch {}
  let num = (Number(await env.ORDERS.get('meta:counter')) || 1000) + 1;
  try { await env.ORDERS.put('meta:counter', String(num)); } catch { num = 0; }
  const rec = { id, num: num || undefined, createdAt, ...o, status: 'pending', history: [{ s: 'pending', at: createdAt }], emails: {} };
  try { await env.ORDERS.put(id, JSON.stringify(rec)); } catch { return json({ error: 'could not save' }, 500); }

  // Email the customer "we got your order" in the background (never delays or breaks the order)
  const site = new URL(request.url).origin;
  const job = sendCustomerEmail(env, 'received', rec, site).then(async res => {
    try { const cur = (await env.ORDERS.get(id, 'json')) || rec; cur.emails = { ...cur.emails, received: res }; await env.ORDERS.put(id, JSON.stringify(cur)); } catch {}
  });
  if (waitUntil) waitUntil(job); else await job;
  return json({ ok: true, num: rec.num });
}

// Reads all orders. Any order without a number gets one now (oldest first).
async function loadOrders(env) {
  const list = await env.ORDERS.list({ prefix: 'order:', limit: 1000 });
  const orders = (await Promise.all(list.keys.map(k => env.ORDERS.get(k.name, 'json')))).filter(Boolean);
  const missing = orders.filter(o => !o.num).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  if (missing.length) {
    let n = Number(await env.ORDERS.get('meta:counter')) || 1000;
    for (const o of missing) { o.num = ++n; await env.ORDERS.put(o.id, JSON.stringify(o)); }
    await env.ORDERS.put('meta:counter', String(n));
  }
  return orders;
}

export async function onRequestGet({ request, env }) {
  const key = request.headers.get('x-admin-key');
  if (!env.ADMIN_KEY || !key || key !== env.ADMIN_KEY) return json({ error: 'unauthorized' }, 401);
  if (!env.ORDERS) return json({ error: 'storage not configured' }, 500);

  const orders = await loadOrders(env);
  orders.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return json(orders);
}

export async function onRequestDelete({ request, env }) {
  const key = request.headers.get('x-admin-key');
  if (!env.ADMIN_KEY || !key || key !== env.ADMIN_KEY) return json({ error: 'unauthorized' }, 401);
  if (!env.ORDERS) return json({ error: 'storage not configured' }, 500);
  const id = new URL(request.url).searchParams.get('id') || '';
  if (!/^order:[\w:.\-]+$/.test(id)) return json({ error: 'bad id' }, 400); // only real orders, never rate-limit keys
  await env.ORDERS.delete(id);
  return json({ ok: true });
}

const STEPS = ['pending', 'processing', 'dispatched', 'delivered'];
const KINDS = ['received', 'dispatched', 'delivered'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function onRequestPatch({ request, env }) {
  const key = request.headers.get('x-admin-key');
  if (!env.ADMIN_KEY || !key || key !== env.ADMIN_KEY) return json({ error: 'unauthorized' }, 401);
  if (!env.ORDERS) return json({ error: 'storage not configured' }, 500);
  let d;
  try { d = await request.json(); } catch { return json({ error: 'bad request' }, 400); }
  if (!d || !/^order:[\w:.\-]+$/.test(String(d.id || ''))) return json({ error: 'bad id' }, 400);
  const rec = await env.ORDERS.get(d.id, 'json');
  if (!rec) return json({ error: 'not found' }, 404);
  const site = new URL(request.url).origin;
  const save = () => env.ORDERS.put(d.id, JSON.stringify(rec));

  // --- price and paid tick
  if (d.action === 'set') {
    if ('amount' in d) {
      if (d.amount === '' || d.amount === null) delete rec.amount;
      else {
        const n = Number(d.amount);
        if (!Number.isFinite(n) || n < 0 || n > 10000000) return json({ error: 'Please enter a valid amount.' }, 400);
        rec.amount = Math.round(n * 100) / 100;
      }
    }
    if ('paid' in d) { rec.paid = !!d.paid; if (rec.paid) rec.paidAt = new Date().toISOString(); else delete rec.paidAt; }
    await save();
    return json({ ok: true, order: rec });
  }

  // --- send a customer email again (optionally with a corrected address)
  if (d.action === 'resend') {
    if (!KINDS.includes(d.kind)) return json({ error: 'bad email type' }, 400);
    if (d.email !== undefined) {
      const e = clean(d.email, 120);
      if (!EMAIL_RE.test(e)) return json({ error: 'Please enter a valid email address.' }, 400);
      rec.email = e;
    }
    if (d.kind === 'dispatched' && !rec.shipping) return json({ error: 'Dispatch the order first, so the email has the courier details.' }, 400);
    const email = await sendCustomerEmail(env, d.kind, rec, site);
    rec.emails = { ...(rec.emails || {}), [d.kind]: email };
    await save();
    return json({ ok: true, order: rec, email });
  }

  // --- move along: processing / dispatched / delivered / back
  const cur = STEPS.includes(rec.status) ? rec.status : 'pending';
  let next;
  if (d.action === 'back') { if (cur === 'pending') return json({ error: 'already at start' }, 400); next = STEPS[STEPS.indexOf(cur) - 1]; }
  else if (['processing', 'dispatched', 'delivered'].includes(d.action)) next = d.action;
  else return json({ error: 'bad action' }, 400);

  if (next === 'dispatched') {
    const mode = d.mode === 'hand' ? 'hand' : 'courier';
    const url = safeUrl(d.url);
    if (mode === 'courier' && d.url && !url) return json({ error: 'The tracking link must start with https://' }, 400);
    rec.shipping = { mode, url: mode === 'courier' ? url : '', courier: mode === 'courier' ? clean(d.courier, 60) : '', note: clean(d.note, 200) };
  }
  rec.status = next;
  rec.history = [...(rec.history || [{ s: 'pending', at: rec.createdAt }]), { s: next, at: new Date().toISOString() }];

  let email = null;
  if (d.action !== 'back' && (next === 'dispatched' || next === 'delivered') && d.notify !== false) {
    email = await sendCustomerEmail(env, next, rec, site);
    rec.emails = { ...(rec.emails || {}), [next]: email };
  }
  await save();
  return json({ ok: true, order: rec, email });
}
