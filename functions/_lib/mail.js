// Customer emails (order received / dispatched / delivered), sent through Brevo's API.
// Needs a Cloudflare secret BREVO_API_KEY. Optional: MAIL_FROM (default below), MAIL_CC (comma separated).
// Without the key nothing breaks: orders still work, the email status just says "not configured".

const BRAND = 'Lil Things by Vaara';
const DEFAULT_FROM = 'vaara@ektitli.org';
const DEFAULT_CC = 'poojabanwari@gmail.com,vaara@ektitli.org';
const WHATSAPP = '919766327697';
const MAKING_TIME = '3-14 days';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clean = (v, n) => String(v ?? '').replace(/[\u0000-\u001f\u007f]+/g, ' ').trim().slice(0, n);
const first = name => clean(name, 80).split(/\s+/)[0] || 'there';

export const safeUrl = v => { try { const u = new URL(String(v || '').trim()); return /^https?:$/.test(u.protocol) ? u.href.slice(0, 500) : ''; } catch { return ''; } };

function shell(title, bodyHtml, site) {
  return `<!doctype html><html><body style="margin:0;background:#FFF9F1;font-family:Arial,Helvetica,sans-serif;color:#2E2433">
<div style="max-width:520px;margin:0 auto;padding:20px">
  <div style="background:#FFC93C;border:3px solid #2E2433;border-radius:18px 18px 0 0;padding:14px 18px;font-size:20px;font-weight:bold">🧶 ${esc(BRAND)}</div>
  <div style="background:#fff;border:3px solid #2E2433;border-top:0;border-radius:0 0 18px 18px;padding:20px;line-height:1.5">
    <h2 style="margin:0 0 10px;font-size:22px">${esc(title)}</h2>
    ${bodyHtml}
    <p style="margin:22px 0 0;font-size:14px;color:#6b5f73">Questions? Just reply to this email or message us on
      <a href="https://wa.me/${WHATSAPP}" style="color:#2E2433">WhatsApp</a>.<br>
      <a href="${esc(site)}" style="color:#6b5f73">${esc(site.replace(/^https?:\/\//, ''))}</a></p>
  </div></div></body></html>`;
}

const itemBlock = o => `<div style="background:#FFF3C4;border-radius:12px;padding:12px 14px;margin:12px 0">
  <b>${esc(o.quantity)} × ${esc(o.product)}</b>${o.note ? `<br><span style="font-size:14px">🎨 ${esc(o.note)}</span>` : ''}
  ${o.photo ? `<br><a href="${esc(o.photo)}" style="font-size:14px;color:#2E2433">The photo you liked</a>` : ''}</div>`;

export function buildEmail(kind, o, site) {
  const hi = `<p>Hi ${esc(first(o.name))},</p>`;
  const s = o.shipping || {};
  if (kind === 'received') {
    return {
      subject: `We got your order! ${o.quantity} x ${o.product}`,
      html: shell('Thank you, we got your order! 🎉', `${hi}
        <p>Vaara has received your request and will start making it soon. Everything is handmade, so please allow <b>${MAKING_TIME}</b>.</p>
        ${itemBlock(o)}
        <p style="font-size:14px"><b>Delivery to:</b><br>${esc(o.name)}<br>${esc(o.address)}, ${esc(o.city)} - ${esc(o.pin)}, ${esc(o.country)}</p>
        <p>We will message you if we need to confirm any colours or patterns, and we will email you again when it is on its way.</p>`, site),
      text: `Hi ${first(o.name)},\n\nVaara has received your order: ${o.quantity} x ${o.product}${o.note ? ` (${o.note})` : ''}.\nEverything is handmade, so please allow ${MAKING_TIME}.\n\nDelivery to: ${o.name}, ${o.address}, ${o.city} - ${o.pin}, ${o.country}\n\nWe will email you again when it is on its way.\n\n${BRAND}\nWhatsApp: https://wa.me/${WHATSAPP}`,
    };
  }
  if (kind === 'dispatched') {
    const hand = s.mode === 'hand';
    const link = safeUrl(s.url);
    const how = hand
      ? `<p>Your order will be <b>hand delivered</b>.${s.note ? `<br>${esc(s.note)}` : ''}</p>`
      : `<p>It is on its way with ${s.courier ? `<b>${esc(s.courier)}</b>` : 'the courier'}.${s.note ? `<br>${esc(s.note)}` : ''}</p>
         ${link ? `<p><a href="${esc(link)}" style="display:inline-block;background:#FF6F61;color:#fff;text-decoration:none;font-weight:bold;border:2px solid #2E2433;border-radius:999px;padding:10px 20px">Track your order</a></p>
         <p style="font-size:13px;color:#6b5f73">Or copy this link: ${esc(link)}</p>` : ''}`;
    return {
      subject: hand ? `Your order is on its way (hand delivery)` : `Your order has been dispatched!`,
      html: shell(hand ? 'Your order is on its way! 🚲' : 'Your order has been dispatched! 📦', `${hi}${how}${itemBlock(o)}`, site),
      text: `Hi ${first(o.name)},\n\n${hand ? `Your order will be hand delivered.${s.note ? ' ' + s.note : ''}` : `Your order has been dispatched${s.courier ? ' with ' + s.courier : ''}.${s.note ? ' ' + s.note : ''}${link ? '\nTrack it here: ' + link : ''}`}\n\n${o.quantity} x ${o.product}\n\n${BRAND}\nWhatsApp: https://wa.me/${WHATSAPP}`,
    };
  }
  return { // delivered
    subject: `Delivered! Hope you love it`,
    html: shell('Your order has been delivered! 🎁', `${hi}
      <p>Your order has been delivered. We hope you love it!</p>${itemBlock(o)}
      <p>If you do, we would be so happy to see a photo of it. You can send one on <a href="https://wa.me/${WHATSAPP}" style="color:#2E2433">WhatsApp</a>. Thank you for supporting a little maker 💛</p>`, site),
    text: `Hi ${first(o.name)},\n\nYour order has been delivered: ${o.quantity} x ${o.product}. We hope you love it!\nWe would love to see a photo on WhatsApp: https://wa.me/${WHATSAPP}\n\nThank you for supporting a little maker.\n${BRAND}`,
  };
}

// Returns 'sent' | 'not configured' | 'failed: ...'
export async function sendCustomerEmail(env, kind, order, site) {
  if (!env.BREVO_API_KEY) return 'not configured';
  const from = env.MAIL_FROM || DEFAULT_FROM;
  const to = String(order.email || '').toLowerCase();
  const cc = String(env.MAIL_CC ?? DEFAULT_CC).split(',').map(x => x.trim()).filter(x => x && x.toLowerCase() !== to).map(email => ({ email }));
  const m = buildEmail(kind, order, site);
  try {
    const r = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': env.BREVO_API_KEY, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        sender: { name: BRAND, email: from },
        replyTo: { email: from, name: BRAND },
        to: [{ email: order.email, name: clean(order.name, 80) }],
        ...(cc.length ? { cc } : {}),
        subject: m.subject, htmlContent: m.html, textContent: m.text,
      }),
      signal: AbortSignal.timeout(7000),
    });
    if (r.ok) return 'sent';
    const b = await r.json().catch(() => ({}));
    return `failed: ${r.status} ${clean(b.message, 100)}`.trim();
  } catch (e) { return `failed: ${clean(e && e.message, 100)}`; }
}
