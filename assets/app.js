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
  S.categories.filter(c => c.group === g.id).forEach(c => og.append(new Option(c.name, c.name)));
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
let current = null;

function openViewer(cat, photos) {
  current = cat;
  $('vTitle').textContent = `${cat.emoji} ${cat.name}`;
  $('vDesc').textContent = cat.desc;
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
$('vOrder').onclick = () => { const c = current; viewer.close(); openOrder(c && c.name); };
$('vShare').onclick = () => current && share(`${current.name} · ${S.brand}`, `${current.name} by Vaara: ${current.desc}`, catShareUrl(current));

// ---------- order dialog ----------
const dlg = $('orderDlg'), form = $('orderForm'), msg = $('msg'), submit = $('submitBtn');
let openedAt = 0;

function openOrder(productName) {
  $('oFormWrap').hidden = false; $('oDone').hidden = true;
  msg.className = ''; msg.textContent = ''; $('waFallback').replaceChildren();
  if (productName) select.value = productName;
  openedAt = Date.now();
  if (!dlg.open) dlg.showModal();
  dlg.scrollTop = 0;
}
document.querySelectorAll('[data-order]').forEach(b => b.addEventListener('click', () => openOrder()));
$('oClose').onclick = () => dlg.close();
$('doneClose').onclick = () => dlg.close();
dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });

const fail = t => { msg.className = 'err'; msg.textContent = t; };
const isIndia = c => /^\s*(india|bharat|in)\s*$/i.test(c);

function summary(d) {
  return [
    'Hi! I would like to place an order on Lil Things by Vaara.',
    `Item: ${d.quantity} x ${d.product}`,
    d.note ? `Colours / patterns: ${d.note}` : '',
    `Name: ${d.name}`,
    `Mobile: ${d.mobile}`,
    `Email: ${d.email}`,
    `Address: ${d.address}, ${d.city} - ${d.pin}, ${d.country}`,
  ].filter(Boolean).join('\n');
}

form.addEventListener('submit', async e => {
  e.preventDefault();
  msg.className = ''; msg.textContent = ''; $('waFallback').replaceChildren();
  const d = Object.fromEntries(new FormData(form));
  for (const k of ['name', 'email', 'address', 'city', 'pin', 'country', 'note']) d[k] = (d[k] || '').trim();
  const india = isIndia(d.country);

  let digits = (d.mobile || '').replace(/\D/g, '');
  if (india) digits = digits.replace(/^(?:91|0)(?=\d{10}$)/, '');

  if (!d.product) return fail('Please choose what you would like.');
  const qty = parseInt(d.quantity, 10);
  if (!(qty >= 1 && qty <= 100)) return fail('Quantity should be between 1 and 100.');
  if (!d.name) return fail('Please enter your name.');
  if (india ? !/^\d{10}$/.test(digits) : !/^\d{7,15}$/.test(digits)) return fail(india ? 'Please enter a valid 10-digit mobile number.' : 'Please enter your mobile number with country code.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email)) return fail('Please enter a valid email address.');
  if (d.address.length < 5) return fail('Please enter your address.');
  if (!d.city) return fail('Please enter your city.');
  if (india ? !/^\d{6}$/.test(d.pin) : !/^[A-Za-z0-9 -]{3,12}$/.test(d.pin)) return fail(india ? 'Please enter a valid 6-digit pin code.' : 'Please enter a valid postal code.');
  if (!d.country) return fail('Please enter your country.');

  const order = { ...d, quantity: qty, mobile: digits, ms: Date.now() - openedAt };
  submit.disabled = true; submit.textContent = 'Sending...';
  try {
    const r = await fetch('/api/order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(order) });
    if (!r.ok) throw new Error(String(r.status));
    $('doneWa').href = waLink(summary(order));
    $('doneWa').hidden = !S.whatsapp;
    $('oFormWrap').hidden = true; $('oDone').hidden = false;
    dlg.scrollTop = 0;
    form.reset(); form.country.value = 'India'; form.quantity.value = 1;
  } catch {
    fail('We could not send your order automatically. Please send it to us on WhatsApp instead:');
    if (S.whatsapp) {
      const a = el('a', 'btn wa-btn', '💬 Send order on WhatsApp');
      a.href = waLink(summary(order)); a.target = '_blank'; a.rel = 'noopener';
      $('waFallback').append(a);
    }
  } finally {
    submit.disabled = false; submit.textContent = 'Send my order';
  }
});

// ---------- page content (needs photos.json) ----------
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

  // Scrolling strip: every photo, interleaved so categories mix
  let items = [];
  const lists = [
    ...Object.entries(P.categories).map(([id, l]) => {
      const c = byId(id);
      return l.map(p => ({ src: p.thumb, alt: c ? c.name : "Vaara's work", emoji: c ? c.emoji : '🧶' }));
    }),
    (P.strip || []).map(p => ({ src: p.thumb, alt: "Vaara's work", emoji: '🧶' })),
  ].filter(l => l.length);
  for (let i = 0; lists.some(l => i < l.length); i++) lists.forEach(l => { if (i < l.length) items.push(l[i]); });
  if (!items.length) items = S.categories.map(c => ({ src: '', alt: c.name, emoji: c.emoji }));
  while (items.length < 10) items = items.concat(items);
  const track = $('track');
  track.style.setProperty('--dur', `${Math.max(30, items.length * 3)}s`);
  [...items, ...items].forEach(s => {
    const d = el('div', 'slide');
    d.append(s.src ? img(s.src, s.alt, s.emoji) : ph(s.emoji));
    track.append(d);
  });

  // Deep links: /#bracelets opens that gallery
  const openFromHash = () => {
    const c = byId(location.hash.slice(1));
    if (c && !viewer.open) openViewer(c, c._photos || []);
  };
  openFromHash();
  window.addEventListener('hashchange', openFromHash);
})();
})();
