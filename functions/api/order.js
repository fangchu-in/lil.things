// Cloudflare Pages Function
// POST /api/order             -> saves the order (KV binding ORDERS) and emails it via FormSubmit (secret FORMSUBMIT_ID)
// GET  /api/order  (header x-admin-key: SECRET) -> lists orders (SECRET = env var ADMIN_KEY)

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

const clean = (v, n) => String(v ?? '').replace(/[\u0000-\u001f\u007f]+/g, ' ').trim().slice(0, n);
const isIndia = c => /^\s*(india|bharat|in)\s*$/i.test(c);

// Sends the order to the owner's email through FormSubmit. Never throws: returns 'sent' or 'failed: why'.
async function emailOrder(env, o, siteOrigin) {
  if (!env.FORMSUBMIT_ID) return 'not configured';
  try {
    const r = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(env.FORMSUBMIT_ID)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', Origin: siteOrigin, Referer: siteOrigin + '/' },
      body: JSON.stringify({
        _subject: `New order: ${o.quantity} x ${o.product} (${o.name})`,
        _template: 'table',
        _captcha: 'false',
        order: `${o.quantity} x ${o.product}`,
        colours_patterns: o.note || '-',
        name: o.name,
        mobile: `+${o.mobile}`,
        email: o.email,
        address: `${o.address}, ${o.city} - ${o.pin}, ${o.country}`,
        sent_via_whatsapp: o.via === 'whatsapp' ? 'yes (customer was sent to WhatsApp)' : 'no (customer chose without WhatsApp)',
        received_at: o.createdAt,
      }),
      signal: AbortSignal.timeout(7000),
    });
    const body = await r.json().catch(() => ({}));
    if (r.ok && String(body.success) !== 'false') return 'sent';
    return `failed: ${r.status} ${clean(body.message || '', 100)}`.trim();
  } catch (e) {
    return `failed: ${clean(e && e.message, 100)}`;
  }
}

export async function onRequestPost({ request, env }) {
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
    via: d.via === 'plain' ? 'plain' : 'whatsapp',
  };

  const ok =
    o.product && o.name && o.address.length >= 5 && o.city && o.country &&
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(o.email) &&
    /^\d{8,15}$/.test(o.mobile) && (!o.mobile.startsWith('91') || o.mobile.length === 12) &&
    (isIndia(o.country) ? /^\d{6}$/.test(o.pin) : /^[A-Za-z0-9 -]{3,12}$/.test(o.pin));
  if (!ok) return json({ error: 'invalid' }, 400);
  if (!env.ORDERS && !env.FORMSUBMIT_ID) return json({ error: 'storage not configured' }, 500);

  // 3) Simple rate limit: one order per phone number / IP every 20 seconds
  const now = Date.now();
  if (env.ORDERS) {
    const ip = request.headers.get('cf-connecting-ip') || 'unknown';
    for (const k of [`rl:ip:${ip}`, `rl:m:${o.mobile}`]) {
      const last = Number(await env.ORDERS.get(k));
      if (last && now - last < 20000) return json({ error: 'slow down' }, 429);
    }
    await Promise.all([
      env.ORDERS.put(`rl:ip:${ip}`, String(now), { expirationTtl: 60 }),
      env.ORDERS.put(`rl:m:${o.mobile}`, String(now), { expirationTtl: 60 }),
    ]);
  }

  const createdAt = new Date(now).toISOString();
  const id = `order:${createdAt}_${crypto.randomUUID().slice(0, 8)}`;
  const rec = { id, createdAt, ...o };

  // 4) Layer 1: save to KV (shown on /orders). Layer 2: email through FormSubmit.
  let saved = false;
  if (env.ORDERS) {
    try { await env.ORDERS.put(id, JSON.stringify({ ...rec, mail: 'pending' })); saved = true; } catch {}
  }
  const mail = await emailOrder(env, rec, new URL(request.url).origin);
  if (saved) { try { await env.ORDERS.put(id, JSON.stringify({ ...rec, mail })); } catch {} }

  if (!saved && mail !== 'sent') return json({ error: 'could not save' }, 500);
  return json({ ok: true });
}

export async function onRequestGet({ request, env }) {
  const key = request.headers.get('x-admin-key');
  if (!env.ADMIN_KEY || !key || key !== env.ADMIN_KEY) return json({ error: 'unauthorized' }, 401);
  if (!env.ORDERS) return json({ error: 'storage not configured' }, 500);

  const list = await env.ORDERS.list({ prefix: 'order:', limit: 1000 });
  const orders = (await Promise.all(list.keys.map(k => env.ORDERS.get(k.name, 'json')))).filter(Boolean);
  orders.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return json(orders);
}
