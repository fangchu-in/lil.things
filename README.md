# Lil Things by Vaara 🧶

Live site: https://lil-things.pages.dev

## Add photos (no laptop needed)
GitHub → `images` folder → pick a category folder → **Add file → Upload files → Commit**.
The site rebuilds by itself in about a minute. Any number of photos per category.

| Folder | Shows as |
|---|---|
| `diya-holders`, `bracelets`, `scrunchies`, `wallets-pouches`, `headbands`, `bags`, `tote-bags`, `hair-clips`, `leaf-bookmarks`, `coasters`, `sunglass-covers`, `loom-bands`, `painted-bottles`, `painted-rocks` | Card cover (first photo) and swipe gallery (all photos) |
| `strip` | The slideshow in the big photo frame at the top of the page (best with 4 to 8 photos; shown in file-name order) |

- Photos are ordered by file name. Name them `1.jpg`, `2.jpg`, `3.jpg`... The **first one is the cover**, so make it the best.
- Use JPG, PNG or WebP. iPhone: Settings → Camera → Formats → Most Compatible (HEIC is not supported).
- Photos are shrunk automatically (about 200 KB for a phone's first view) and hidden data such as location is removed.
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

## Orders (three layers, so none is lost)
1. **WhatsApp**: the main button saves the order and opens WhatsApp to 9766327697 with the details filled in. The customer just presses Send. (Customers without WhatsApp can use "send without it".)
2. **Saved orders page**: https://lil-things.pages.dev/orders.html (needs the admin key). Each order shows if WhatsApp was opened and if the email went out.
3. **Email via FormSubmit** (https://formsubmit.co): every order is also emailed to the address you activated there. The customer's browser sends it (FormSubmit throttles requests that come from Cloudflare's servers). The form id is `formsubmitId` in `assets/config.js`.

Customers can be from any country: they pick a country code (or type the full number starting with +).
Spam protection: hidden trap field, minimum fill time, same-site check and a rate limit.

## Order status and customer emails
On `/orders.html` every order has a status: **Pending → Processing → Dispatched → Delivered**. Use the tabs at the top to see only one stage.
- **Start making**: marks it Processing (no email).
- **Dispatch…**: choose *Courier* (paste the tracking link, e.g. from trackcourier.io, and optionally the courier name) or *Hand delivery*, add an optional note, and the customer is emailed with a "Track your order" button.
- **Mark delivered**: emails the customer a thank-you. Untick "Email the customer" in the pop-up if you don't want an email.
- **Undo** moves an order back one step (no email). The customer also gets an automatic "we got your order" email when they order.
- Copies of the emails to the customer also go to the addresses in `MAIL_CC` (default in `functions/_lib/mail.js`). Copies of new-order emails to you go to `notifyCc` in `assets/config.js`.

### Switch on customer emails (once, free)
FormSubmit can only email you, so customer emails use Brevo (free: 300 emails a day).
1. Sign up at https://www.brevo.com.
2. Brevo → **Senders, domains & dedicated IPs → Senders → Add a sender**: `vaara@ektitli.org`, then click the verification link Brevo emails there.
3. Brevo → **SMTP & API → API keys → Generate a new API key**. Copy it.
4. Cloudflare → Pages project → Settings → Variables and Secrets → add a **secret** `BREVO_API_KEY` with that key. Optional plain variables: `MAIL_FROM` (default `vaara@ektitli.org`) and `MAIL_CC` (comma separated, default `poojabanwari@gmail.com,vaara@ektitli.org`).
5. Redeploy (Deployments → Retry). Place a test order: the customer address should receive "We got your order", and `/orders.html` shows **Customer: order received: sent**.
Until the key is added nothing breaks: statuses work and the page says customer emails are not switched on.
If customer emails land in spam, in Brevo also **authenticate the domain** `ektitli.org` (adds DNS records).

## Cloudflare Pages setup (once)
1. Pages project `lil-things` → Settings → Builds: **Build command** `npm run build`, **Build output directory** `dist`. Connect it to GitHub repo `fangchu-in/lil.things`, production branch `main`.
2. Workers & Pages → Storage → **KV → Create namespace** called `lil-orders`.
3. Pages project → Settings → **Bindings → Add → KV namespace**: variable name `ORDERS` → `lil-orders` (add it for Production).
4. Settings → **Variables and Secrets → Add** a secret named `ADMIN_KEY` with a long password (this is the key for orders.html).
5. Redeploy (Deployments → Retry) so the binding and secrets take effect.
6. Place one test order, then open `/orders.html`: the order should show an **Email sent** tag and the email should arrive. If it says *Email: failed ...*, tell Claude what it says.

## QR code
`qr/lil-things-qr.png` (and `.svg` for sharp printing) points to https://lil-things.pages.dev/.
