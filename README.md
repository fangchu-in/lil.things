# Lil Things by Vaara 🧶

Live site: https://lil-things.pages.dev

## Add photos (no laptop needed)
GitHub → `images` folder → pick a category folder → **Add file → Upload files → Commit**.
The site rebuilds by itself in about a minute. Any number of photos per category.

| Folder | Shows as |
|---|---|
| `diya-holders`, `bracelets`, `scrunchies`, `wallets-pouches`, `headbands`, `bags`, `tote-bags`, `hair-clips`, `leaf-bookmarks`, `coasters`, `loom-bands`, `painted-bottles`, `painted-rocks` | Card cover (first photo), swipe gallery (all photos), scrolling strip |
| `strip` | Extra photos only for the scrolling strip |

- Photos are ordered by file name. Name them `1.jpg`, `2.jpg`, `3.jpg`... The **first one is the cover**, so make it the best.
- Use JPG, PNG or WebP. iPhone: Settings → Camera → Formats → Most Compatible (HEIC is not supported).
- Photos are shrunk automatically and hidden data such as location is removed.
- **No photos of Vaara** on the site (by design).

## Edit things
- Names, descriptions, WhatsApp number, making time, categories: `assets/config.js`
- Vaara's story and "things I love": the `story` section of `index.html`

### Add a category (e.g. bows)
1. Open `assets/config.js`, find the two commented examples at the bottom of `categories`, remove the `//` at the start of one line and edit the words.
2. Create the photo folder: GitHub → Add file → Create new file → type `images/bows/.gitkeep` → Commit. Then upload photos into it.

## Sharing
Each category has its own share link with a preview picture and description, for example
`https://lil-things.pages.dev/share/bracelets/` (it opens the bracelets gallery). The Share button inside each gallery uses these links.
`https://lil-things.pages.dev/#bracelets` also opens a gallery directly.

## Orders
- Customers fill the Order pop-up. The order is saved and a WhatsApp button lets them send you the details instantly. If saving ever fails, the form offers WhatsApp instead, so an order is never lost.
- View all orders: https://lil-things.pages.dev/orders.html (needs the admin key).
- Spam protection: hidden trap field, minimum fill time, same-site check and a rate limit.

## Cloudflare Pages setup (once)
1. Pages project `lil-things` → Settings → Builds: **Build command** `npm run build`, **Build output directory** `dist`. Connect it to GitHub repo `fangchu-in/lil.things`, production branch `main`.
2. Workers & Pages → Storage → **KV → Create namespace** called `lil-orders`.
3. Pages project → Settings → **Bindings → Add → KV namespace**: variable name `ORDERS` → `lil-orders` (add it for Production).
4. Settings → **Variables and Secrets → Add** a secret named `ADMIN_KEY` with a long password (this is the key for orders.html).
5. Redeploy (Deployments → Retry) so the binding and key take effect.

## QR code
`qr/lil-things-qr.png` (and `.svg` for sharp printing) points to https://lil-things.pages.dev/.
