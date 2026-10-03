(() => {
'use strict';
const S = window.SITE;
const $ = id => document.getElementById(id);
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e; };
const ph = emoji => { const d = el('div', 'ph', emoji); d.setAttribute('aria-hidden', 'true'); return d; };
const byId = id => S.categories.find(c => c.id === id);

function img(src, alt, emoji, eager) {
  const i = new Image();
  i.alt = alt; i.decoding = 'async';
  if (!eager) i.loading = 'lazy';
  i.onerror = () => i.replaceWith(ph(emoji));
  i.src = src;
  return i;
}

async function loadPhotos() {
  if (window.__PHOTOS__) return window.__PHOTOS__; // inlined by the build for speed
  try { const r = await fetch('photos.json', { cache: 'no-cache' }); if (r.ok) return await r.json(); } catch {}
  return { categories: {}, strip: [] };
}

// ---------- static bits ----------
document.querySelectorAll('.mt').forEach(n => { n.textContent = S.makingTime; });
$('factCount').textContent = S.categories.length;
$('factTime').textContent = S.makingTime.replace(/\s*days?$/i, '');

const waLink = text => `https://wa.me/${S.whatsapp}?text=${encodeURIComponent(text)}`;
if (S.whatsapp) {
  const f = $('waFab');
  f.hidden = false;
  f.href = waLink('Hi! I saw the Lil Things by Vaara website.');
}

const select = $('productSelect');
select.innerHTML = '<option value="" disabled selected>Choose...</option>';
S.groups.forEach(g => {
  const og = document.createElement('optgroup');
  og.label = g.title;
  S.categories.filter(c => c.group === g.id).forEach(c => { const pt = S.priceText(c); og.append(new Option(pt ? `${c.name} (${pt})` : c.name, c.name)); });
  if (og.children.length) select.append(og);
});

// ---------- sharing ----------
async function share(title, text, url) {
  if (navigator.share) { try { await navigator.share({ title, text, url }); return; } catch (e) { if (e.name === 'AbortError') return; } }
  window.open(`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`, '_blank', 'noopener');
}
const catShareUrl = c => `${location.origin}/share/${c.id}/`;
$('shareSite').onclick = () => share(S.brand, 'Look at these handmade things by 11-year-old Vaara!', location.origin + '/');

// ---------- gallery viewer ----------
const viewer = $('viewer'), vTrack = $('vTrack');
let current = null, curPhotos = [];
let refPhoto = '', refFor = '';   // photo the customer was looking at when they tapped Order

function openViewer(cat, photos) {
  current = cat; curPhotos = photos;
  $('vTitle').textContent = `${cat.emoji} ${cat.name}`;
  $('vDesc').textContent = cat.desc;
  const vp = S.priceText(cat);
  $('vPrice').hidden = !vp;
  $('vPrice').replaceChildren(...(vp ? [vp + ' ', el('small', '', 'each · final price confirmed on WhatsApp')] : []));
  vTrack.replaceChildren();
  if (photos.length) photos.forEach((p, i) => vTrack.append(img(p.src, `${cat.name} photo ${i + 1}`, cat.emoji, i === 0)));
  else vTrack.append(ph(cat.emoji));
  $('vPrev').hidden = $('vNext').hidden = photos.length < 2;
  if (!viewer.open) viewer.showModal();
  vTrack.scrollLeft = 0;
  updateCount();
  history.replaceState(null, '', '#' + cat.id);
}
function updateCount() {
  const n = vTrack.children.length;
  if (n < 2) { $('vCount').textContent = ''; return; }
  const i = (vTrack.clientWidth ? Math.round(vTrack.scrollLeft / vTrack.clientWidth) : 0) + 1;
  $('vCount').textContent = `${Math.min(i, n)} / ${n}`;
}
vTrack.addEventListener('scroll', updateCount, { passive: true });
$('vPrev').onclick = () => vTrack.scrollBy({ left: -vTrack.clientWidth, behavior: 'smooth' });
$('vNext').onclick = () => vTrack.scrollBy({ left: vTrack.clientWidth, behavior: 'smooth' });
$('vClose').onclick = () => viewer.close();
viewer.addEventListener('click', e => { if (e.target === viewer) viewer.close(); });
viewer.addEventListener('keydown', e => {
  if (e.key === 'ArrowRight') $('vNext').click();
  if (e.key === 'ArrowLeft') $('vPrev').click();
});
viewer.addEventListener('close', () => {
  if (location.hash && byId(location.hash.slice(1))) history.replaceState(null, '', location.pathname + location.search);
});
$('vOrder').onclick = () => {
  const c = current;
  const i = vTrack.clientWidth ? Math.round(vTrack.scrollLeft / vTrack.clientWidth) : 0;
  const p = curPhotos[Math.min(i, curPhotos.length - 1)];
  viewer.close();
  openOrder(c && c.name, p && new URL(p.src, location.origin + '/').href);
};
$('vShare').onclick = () => current && share(`${current.name} · ${S.brand}`, `${current.name} by Vaara: ${current.desc}`, catShareUrl(current));

// ---------- order dialog ----------
const dlg = $('orderDlg'), form = $('orderForm'), msg = $('msg');
const sendBtn = $('submitBtn'), plainBtn = $('plainBtn'), ccSel = $('cc');
let openedAt = 0;

// country list -> datalist + phone-code menu
const norm = t => (t || '').trim().toLowerCase();
const findCountry = name => S.countries.find(c => norm(c.n) === norm(name) || (c.a || []).includes(norm(name)));
$('countries').replaceChildren(...S.countries.map(c => new Option(c.n)));
{
  const seen = new Set();
  S.countries.forEach(c => {
    if (seen.has(c.c)) return;
    seen.add(c.c);
    ccSel.add(new Option(`+${c.c} ${c.i || c.n}`, c.c));
  });
  ccSel.value = '91';
}
form.country.addEventListener('input', () => { const c = findCountry(form.country.value); if (c) ccSel.value = c.c; });

function updatePriceNote() {
  const c = S.categories.find(x => x.name === select.value), note = $('priceNote');
  const pt = c && S.priceText(c);
  note.hidden = !pt;
  if (!pt) return;
  const q = Math.min(Math.max(parseInt(form.quantity.value, 10) || 1, 1), 100), lo = Number(c.price), hi = Number(c.priceMax) > lo ? Number(c.priceMax) : lo;
  const n = x => (x * q).toLocaleString('en-IN'), cur = S.currency || '₹';
  note.textContent = `Price: ${pt} each` + (q > 1 ? ` (about ${cur}${n(lo)}${hi > lo ? '–' + n(hi) : ''} for ${q})` : '') + '. Final price and shipping are confirmed on WhatsApp.';
}
select.addEventListener('change', updatePriceNote);
form.quantity.addEventListener('input', updatePriceNote);
function openOrder(productName, photoUrl) {
  refPhoto = photoUrl || ''; refFor = productName || '';
  $('oFormWrap').hidden = false; $('oDone').hidden = true;
  msg.className = ''; msg.textContent = ''; $('waFallback').replaceChildren();
  sendBtn.disabled = plainBtn.disabled = false;
  if (productName) select.value = productName;
  updatePriceNote();
  openedAt = Date.now();
  if (!dlg.open) dlg.showModal();
  dlg.scrollTop = 0;
}
document.querySelectorAll('[data-order]').forEach(b => b.addEventListener('click', () => openOrder()));
$('oClose').onclick = () => dlg.close();
$('doneClose').onclick = () => dlg.close();
dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });

const fail = t => { msg.className = 'err'; msg.textContent = t; };

// Works out the full international number (digits only, with country code) or returns null
function fullNumber(raw, cc) {
  raw = (raw || '').trim();
  let d;
  if (/^(\+|00)/.test(raw)) d = raw.replace(/\D/g, '').replace(/^00/, ''); // typed with + : already complete
  else {
    const nat = raw.replace(/\D/g, '').replace(/^0+/, '');
    d = (nat.length >= 11 && nat.startsWith(cc)) ? nat : cc + nat;            // 11+ digits starting with the code: code already included
  }
  if (d.startsWith('91') && d.length !== 12) return { err: 'Indian mobile numbers have 10 digits after +91.' };
  if (!/^\d{8,15}$/.test(d)) return { err: 'Please check your mobile number. Pick your country code and enter the number.' };
  return { digits: d };
}

// Email layer: FormSubmit is called from the visitor's own browser (calling it from our server gets throttled: 429)
async function emailOrder(o) {
  if (!S.formsubmitId) return 'not configured';
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 6000);
  try {
    const r = await fetch(`https://formsubmit.co/ajax/${S.formsubmitId}`, {
      method: 'POST', signal: ctl.signal,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        _subject: `New order: ${o.quantity} x ${o.product} (${o.name})`,
        _template: 'table',
        _captcha: 'false',
        ...(S.notifyCc ? { _cc: S.notifyCc } : {}),
        _honey: '',
        order: `${o.quantity} x ${o.product}`,
        photo_customer_liked: o.photo || '(no specific photo chosen)',
        product_page: o.page || '-',
        price_each: o.priceLabel || '-',
        colours_patterns: o.note || '-',
        name: o.name,
        mobile: `+${o.mobile}`,
        email: o.email,
        address: `${o.address}, ${o.city} - ${o.pin}, ${o.country}`,
        customer_was_sent_to_whatsapp: o.via === 'whatsapp' ? 'yes' : 'no (chose without WhatsApp)',
        received_at: new Date().toISOString(),
      }),
    });
    const b = await r.json().catch(() => ({}));
    return r.ok && String(b.success) !== 'false' ? 'sent' : `failed: ${r.status} ${String(b.message || '').slice(0, 80)}`.trim();
  } catch (e) {
    return e && e.name === 'AbortError' ? 'failed: timeout' : 'failed: network';
  } finally { clearTimeout(t); }
}

function summary(d) {
  return [
    'Hi! I would like to place an order on Lil Things by Vaara.',
    `Item: ${d.quantity} x ${d.product}`,
    d.priceLabel ? `Price: ${d.priceLabel} each (final price confirmed on WhatsApp)` : '',
    d.photo ? `Photo I liked: ${d.photo}` : (d.page ? `Product page: ${d.page}` : ''),
    d.note ? `Colours / patterns: ${d.note}` : '',
    `Name: ${d.name}`,
    `Mobile: +${d.mobile}`,
    `Email: ${d.email}`,
    `Address: ${d.address}, ${d.city} - ${d.pin}, ${d.country}`,
  ].filter(Boolean).join('\n');
}

form.addEventListener('submit', async e => {
  e.preventDefault();
  msg.className = ''; msg.textContent = ''; $('waFallback').replaceChildren();
  const via = e.submitter && e.submitter.value === 'plain' ? 'plain' : 'whatsapp';
  const d = Object.fromEntries(new FormData(form));
  for (const k of ['name', 'email', 'address', 'city', 'pin', 'country', 'note']) d[k] = (d[k] || '').trim();
  const c = findCountry(d.country);
  const india = !!c && c.c === '91' && c.n === 'India';

  if (!d.product) return fail('Please choose what you would like.');
  const qty = parseInt(d.quantity, 10);
  if (!(qty >= 1 && qty <= 100)) return fail('Quantity should be between 1 and 100.');
  if (!d.name) return fail('Please enter your name.');
  const num = fullNumber(d.mobile, d.cc);
  if (num.err) return fail(num.err);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email)) return fail('Please enter a valid email address.');
  if (d.address.length < 5) return fail('Please enter your address.');
  if (!d.city) return fail('Please enter your city.');
  if (!d.country) return fail('Please enter your country.');
  if (india ? !/^\d{6}$/.test(d.pin) : !/^[A-Za-z0-9 -]{3,12}$/.test(d.pin)) return fail(india ? 'Please enter a valid 6-digit pin code.' : 'Please enter a valid postal / zip code.');

  const order = { product: d.product, quantity: qty, note: d.note, name: d.name, mobile: num.digits, email: d.email,
                  address: d.address, city: d.city, pin: d.pin, country: d.country, via, website: d.website, ms: Date.now() - openedAt };
  // reference: the photo they were viewing (only if they kept that product) and the product's own page
  const cat = S.categories.find(x => x.name === d.product);
  if (cat) { order.page = catShareUrl(cat); order.priceLabel = S.priceText(cat); order.price = Number(cat.price) || 0; order.priceMax = Number(cat.priceMax) || 0; }
  if (refPhoto && refFor === d.product) order.photo = refPhoto;
  const waUrl = waLink(summary(order));

  // Open WhatsApp straight away (must happen inside the tap, or the browser blocks it)
  if (via === 'whatsapp' && S.whatsapp) window.open(waUrl, '_blank', 'noopener');

  sendBtn.disabled = plainBtn.disabled = true;
  sendBtn.textContent = 'Sending...';
  let saved = false, orderNum = 0;
  order.mail = await emailOrder(order);            // layer: email (never blocks the order if it fails)
  try {
    const r = await fetch('/api/order', { method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(order) });
    saved = r.ok;                                   // layer: saved on /orders
    if (r.ok) { const j = await r.json().catch(() => ({})); orderNum = Number(j.num) || 0; }
  } catch {}
  if (order.mail === 'sent') saved = true;          // the order reached us by email even if saving failed
  sendBtn.textContent = '💬 Send order on WhatsApp';

  const wa = $('doneWa');
  wa.href = waUrl;
  wa.hidden = !S.whatsapp;
  if (via === 'whatsapp') {
    $('doneTitle').textContent = saved ? 'Almost done!' : 'One more step!';
    $('doneText').textContent = saved
      ? 'Your order is saved. WhatsApp should have opened with your details: please press Send there so we see it right away. Didn\'t open? Tap the button below.'
      : 'We could not save your order online, so please press Send in WhatsApp (it should have opened). That is how we will get your order. Didn\'t open? Tap the button below.';
    wa.textContent = '💬 Open WhatsApp';
  } else if (saved) {
    $('doneTitle').textContent = 'Thank you!';
    $('doneText').textContent = 'Your order request is in. Vaara\'s parents will contact you soon to confirm.';
    wa.textContent = '💬 Also message us on WhatsApp';
  } else {
    sendBtn.disabled = plainBtn.disabled = false;
    fail('Something went wrong and your order was not saved. Please try again, or send it to us on WhatsApp:');
    if (S.whatsapp) { const a = el('a', 'btn wa-btn', '💬 Send order on WhatsApp'); a.href = waUrl; a.target = '_blank'; a.rel = 'noopener'; $('waFallback').append(a); }
    return;
  }
  if (orderNum) $('doneText').textContent += ` Your order number is #${orderNum}.`;
  $('oFormWrap').hidden = true; $('oDone').hidden = false;
  dlg.scrollTop = 0;
  form.reset(); form.country.value = 'India'; ccSel.value = '91'; form.quantity.value = 1;
});

// ---------- hero slideshow (photos are already in the HTML, built at deploy time) ----------
function initSlideshow() {
  const wrap = $('heroSlides');
  const imgs = wrap ? [...wrap.querySelectorAll('img')] : [];
  if (imgs.length < 2) return;
  const dots = el('div', 'dots');
  dots.setAttribute('aria-hidden', 'true');
  imgs.forEach(() => dots.append(document.createElement('i')));
  $('heroCard').append(dots);
  let i = 0, timer = null;
  const show = n => {
    i = (n + imgs.length) % imgs.length;
    imgs.forEach((m, k) => m.classList.toggle('on', k === i));
    [...dots.children].forEach((d, k) => d.classList.toggle('on', k === i));
  };
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const start = () => { if (!reduce && !timer) timer = setInterval(() => show(i + 1), 3500); };
  const stop = () => { clearInterval(timer); timer = null; };
  show(0); start();
  $('heroCard').addEventListener('click', () => { stop(); show(i + 1); start(); });
  document.addEventListener('visibilitychange', () => document.hidden ? stop() : start());
}

// ---------- page content ----------
(async () => {
  const P = await loadPhotos();
  const groupsEl = $('groups');

  S.groups.forEach(g => {
    const cats = S.categories.filter(c => c.group === g.id);
    if (!cats.length) return;
    const sec = el('div', 'group');
    sec.append(el('h3', 'group-title', `${g.emoji} ${g.title}`));
    const grid = el('div', 'grid');
    cats.forEach(c => {
      const photos = P.categories[c.id] || [];
      const card = el('article', 'card');
      card.id = `card-${c.id}`;
      card.style.setProperty('--c', c.color);
      const pic = el('button', 'pic');
      pic.type = 'button';
      pic.setAttribute('aria-label', `See ${c.name} photos`);
      pic.append(photos.length ? img(photos[0].thumb, c.name, c.emoji) : ph(c.emoji));
      pic.append(el('span', 'mto', 'Made to order'));
      if (photos.length > 1) pic.append(el('span', 'badge', `📷 ${photos.length}`));
      pic.onclick = () => openViewer(c, photos);
      const body = el('div', 'body');
      body.append(el('h3', '', c.name), el('p', '', c.desc));
      const pt = S.priceText(c);
      if (pt) { const pr = el('div', 'price', pt); pr.append(el('small', '', ' each')); body.append(pr); }
      const btn = el('button', 'btn', 'Order now');
      btn.type = 'button';
      btn.onclick = () => openOrder(c.name);
      body.append(btn);
      card.append(pic, body);
      grid.append(card);
      c._photos = photos;
    });
    sec.append(grid);
    groupsEl.append(sec);
  });

  initSlideshow();

  // Deep links: /#bracelets opens that gallery
  const openFromHash = () => {
    const c = byId(location.hash.slice(1));
    if (c && !viewer.open) openViewer(c, c._photos || []);
  };
  openFromHash();
  window.addEventListener('hashchange', openFromHash);
})();
})();
