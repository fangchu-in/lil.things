// Build step (runs on Cloudflare Pages on every push):
//  - copies the site into dist/
//  - scans images/<category>/ and writes dist/photos.json (so nobody edits a photo list)
//  - shrinks big phone photos into fast .webp files and strips hidden data (GPS etc.) from them
//  - makes a share page + preview picture per category (so WhatsApp links show the product)
import { cp, mkdir, readdir, rm, writeFile, readFile, copyFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const DIST = path.join(ROOT, 'dist');
const IMG = path.join(ROOT, 'images');
const EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif']);
const SITE_URL = (process.env.SITE_URL || 'https://lil-things.pages.dev').replace(/\/$/, '');
const CREAM = '#FFF9F1';

let sharp = null;
try { sharp = (await import('sharp')).default; } catch { console.warn('! sharp not found: photos copied as-is, no preview pictures'); }

// Read the same config the website uses
const window = {};
new Function('window', await readFile(path.join(ROOT, 'assets/config.js'), 'utf8'))(window);
const SITE = window.SITE;

await rm(DIST, { recursive: true, force: true });
await mkdir(DIST, { recursive: true });
for (const f of ['index.html', 'orders.html', '_headers']) if (existsSync(path.join(ROOT, f))) await copyFile(path.join(ROOT, f), path.join(DIST, f));
await cp(path.join(ROOT, 'assets'), path.join(DIST, 'assets'), { recursive: true });

const natural = (a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
const slug = s => s.toLowerCase().replace(/\.[^.]+$/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'photo';
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// sharp drops metadata (GPS, camera, dates) by default, which is what we want.
async function processImage(srcFile, outDir, base) {
  await mkdir(outDir, { recursive: true });
  const ext = path.extname(srcFile).toLowerCase();
  if (!sharp || ext === '.gif') {
    const name = base + ext;
    await copyFile(srcFile, path.join(outDir, name));
    return { full: name, med: name, thumb: name };
  }
  const full = `${base}.webp`, med = `${base}-m.webp`, thumb = `${base}-t.webp`;
  const img = () => sharp(srcFile, { failOn: 'none' }).rotate();
  // full: gallery · med: top slideshow · thumb: category cards (small = fast on mobile data)
  await img().resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true }).webp({ quality: 78 }).toFile(path.join(outDir, full));
  await img().resize({ width: 800, height: 800, fit: 'cover' }).webp({ quality: 74 }).toFile(path.join(outDir, med));
  await img().resize({ width: 480, height: 480, fit: 'cover' }).webp({ quality: 70 }).toFile(path.join(outDir, thumb));
  return { full, med, thumb };
}

const manifest = { categories: {}, strip: [] };
const firstFile = {}; // category id -> original file path of its first photo
const entries = await readdir(IMG, { withFileTypes: true });

for (const e of entries.filter(x => x.isDirectory()).sort((a, b) => natural(a.name, b.name))) {
  const p = path.join(IMG, e.name);
  const files = (await readdir(p)).filter(f => EXT.has(path.extname(f).toLowerCase())).sort(natural);
  const list = [], used = new Set();
  for (const f of files) {
    let base = slug(f), n = 2;
    while (used.has(base)) base = `${slug(f)}-${n++}`;
    used.add(base);
    try {
      const r = await processImage(path.join(p, f), path.join(DIST, 'images', e.name), base);
      list.push({ src: `images/${e.name}/${r.full}`, med: `images/${e.name}/${r.med}`, thumb: `images/${e.name}/${r.thumb}` });
      if (!firstFile[e.name]) firstFile[e.name] = path.join(p, f);
    } catch (err) { console.warn(`! skipped ${e.name}/${f}: ${err.message}`); }
  }
  if (e.name === 'strip') manifest.strip = list; else manifest.categories[e.name] = list;
}
await writeFile(path.join(DIST, 'photos.json'), JSON.stringify(manifest));

// ---- Bake photos into index.html so the page needs no extra requests to show them ----
{
  const file = path.join(DIST, 'index.html');
  let html = await readFile(file, 'utf8');
  const hero = manifest.strip.slice(0, 8);
  const slides = hero.map((p, i) => `<img src="${p.med}" alt="Handmade creation by Vaara" width="800" height="800" decoding="async"${i === 0 ? ' class="on" fetchpriority="high"' : ' loading="lazy"'}>`).join('');
  html = html
    .replace('<!--HERO_CLASS-->', hero.length ? ' has-photos' : '')
    .replace('<!--HERO_SLIDES-->', slides)
    .replace('<!--PRELOAD-->', hero.length ? `<link rel="preload" as="image" href="${hero[0].med}" fetchpriority="high">` : '')
    .replace('<!--PHOTOS-->', `<script>window.__PHOTOS__=${JSON.stringify(manifest).replace(/</g, '\\u003c')}</script>`);
  await writeFile(file, html);
}

// ---- Preview pictures (1200x630) + share pages ----
const OG_W = 1200, OG_H = 630;
const ogDir = path.join(DIST, 'og');
const haveOg = new Set();
if (sharp) {
  await mkdir(ogDir, { recursive: true });
  const cover = (file, w, h) => sharp(file, { failOn: 'none' }).rotate().resize(w, h, { fit: 'cover' }).jpeg({ quality: 82 }).toBuffer();
  const canvas = () => sharp({ create: { width: OG_W, height: OG_H, channels: 3, background: CREAM } });

  // one product photo, whole photo visible on a cream background
  for (const [id, file] of Object.entries(firstFile)) {
    if (id === 'strip') continue;
    try {
      const inner = await sharp(file, { failOn: 'none' }).rotate().resize(OG_W - 80, OG_H - 80, { fit: 'inside', withoutEnlargement: false }).jpeg({ quality: 85 }).toBuffer();
      await canvas().composite([{ input: inner, gravity: 'centre' }]).jpeg({ quality: 82 }).toFile(path.join(ogDir, `${id}.jpg`));
      haveOg.add(id);
    } catch (err) { console.warn(`! preview for ${id} failed: ${err.message}`); }
  }

  // home: collage of up to 4 product photos, or a simple yarn picture if there are none yet
  const shots = SITE.categories.map(c => firstFile[c.id]).filter(Boolean).slice(0, 4);
  try {
    if (shots.length >= 4) {
      const tiles = await Promise.all(shots.map(f => cover(f, OG_W / 2, OG_H / 2)));
      await canvas().composite(tiles.map((input, i) => ({ input, left: (i % 2) * (OG_W / 2), top: Math.floor(i / 2) * (OG_H / 2) }))).jpeg({ quality: 82 }).toFile(path.join(ogDir, 'home.jpg'));
    } else if (shots.length >= 1) {
      const w = Math.floor(OG_W / shots.length);
      const tiles = await Promise.all(shots.map(f => cover(f, w, OG_H)));
      await canvas().composite(tiles.map((input, i) => ({ input, left: i * w, top: 0 }))).jpeg({ quality: 82 }).toFile(path.join(ogDir, 'home.jpg'));
    } else {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${OG_W}" height="${OG_H}"><rect width="100%" height="100%" fill="#FFC93C"/><circle cx="600" cy="315" r="230" fill="#FF8FB1" stroke="#2E2433" stroke-width="12"/><g fill="none" stroke="#2E2433" stroke-width="10" stroke-linecap="round"><path d="M410 270 C 520 380, 690 380, 800 270"/><path d="M400 340 C 520 450, 700 450, 810 340"/><path d="M430 210 C 540 310, 680 310, 770 210"/></g></svg>`;
      await sharp(Buffer.from(svg)).jpeg({ quality: 85 }).toFile(path.join(ogDir, 'home.jpg'));
    }
  } catch (err) { console.warn(`! home preview failed: ${err.message}`); }
}

for (const c of SITE.categories) {
  const dir = path.join(DIST, 'share', c.id);
  await mkdir(dir, { recursive: true });
  const url = `${SITE_URL}/share/${c.id}/`;
  const image = `${SITE_URL}/og/${haveOg.has(c.id) ? c.id : 'home'}.jpg`;
  const title = `${c.name} | ${SITE.brand}`;
  const pt = SITE.priceText ? SITE.priceText(c) : '';
  const desc = `${c.desc}${pt ? ` ${pt} each.` : ''} Made to order by Vaara, age 11.`;
  await writeFile(path.join(dir, 'index.html'), `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(SITE.brand)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${esc(image)}">
<meta property="og:image:width" content="${OG_W}"><meta property="og:image:height" content="${OG_H}">
<meta name="twitter:card" content="summary_large_image">
<link rel="canonical" href="${esc(SITE_URL)}/#${esc(c.id)}">
<script>location.replace('/#${esc(c.id)}')</script>
</head><body><p><a href="/#${esc(c.id)}">Open ${esc(c.name)} on ${esc(SITE.brand)}</a></p></body></html>
`);
}

const total = Object.values(manifest.categories).reduce((n, l) => n + l.length, 0) + manifest.strip.length;
console.log(`Built dist/ with ${total} photos, ${SITE.categories.length} share pages.`);
