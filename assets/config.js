// ====== EDIT ME ======
// Everything you're likely to change lives here.
window.SITE = {
  brand: 'Lil Things by Vaara',

  // WhatsApp number with country code, digits only
  whatsapp: '919766327697',

  // FormSubmit form id (replaces the email address in FormSubmit links; safe to be public). Leave '' to turn the email layer off.
  // Extra people who get a copy of every new-order email (comma separated, '' for none)
  notifyCc: 'poojabanwari@gmail.com,vaara@ektitli.org',
  formsubmitId: '3eef430afbb3323ac2f996d71046c81e',

  currency: '₹',

  makingTime: '3-14 days', // depends on the product chosen

  // Groups are the headings on the page. Categories appear in this order.
  groups: [
    { id: 'crochet', title: 'Crochet', emoji: '🧶' },
    { id: 'loom',    title: 'Loom & painted', emoji: '🎨' },
  ],

  // Prices (in rupees, per piece): price: 150  or a range:  price: 100, priceMax: 150. Leave out for no price.
  // Shown on the website, in WhatsApp messages and emails, and as a suggestion on /orders.html.
  // "id" must match the folder name inside /images
  // "group" must match a group id above.
  categories: [
    { id: 'diya-holders',    group: 'crochet', name: 'Diya Holders',                emoji: '🪔', color: '#FFC93C', desc: 'Decorative crochet holders made for LED tea-lights. A cosy glow for festivals and every day.', price: 50 },
    { id: 'bracelets',       group: 'crochet', name: 'Bracelets',                   emoji: '📿', color: '#FF8FB1', desc: 'Colourful handmade bracelets, perfect for gifts and for stacking.', price: 75 },
    { id: 'scrunchies',      group: 'crochet', name: 'Scrunchies',                  emoji: '🎀', color: '#C3A6FF', desc: 'Soft crochet scrunchies in your favourite colours.', price: 100, priceMax: 150 },
    { id: 'wallets-pouches', group: 'crochet', name: 'Wallets, Card & Key Pouches', emoji: '👛', color: '#7ED9B6', desc: 'Little crochet wallets, card holders and key pouches for everything you carry.', price: 350 },
    { id: 'keychains',       group: 'crochet', name: 'Crochet Keychains',           emoji: '🔑', color: '#8EC9FF', desc: 'Tiny crochet keychains to brighten up your keys and bags.', price: 30 },
    { id: 'headbands',       group: 'crochet', name: 'Head Bands',                  emoji: '👑', color: '#FF6F61', desc: 'Cosy, cute crochet headbands in fun colours and patterns.', price: 300 },
    { id: 'bags',            group: 'crochet', name: 'Bags & Phone Sleeves',        emoji: '👜', color: '#FFC93C', desc: 'Crochet bags and snug phone sleeves, made to carry around.', price: 350, priceMax: 500 },
    { id: 'tote-bags',       group: 'crochet', name: 'Tote Bags',                   emoji: '🛍️', color: '#7ED9B6', desc: 'Roomy crochet tote bags for books, shopping and everyday adventures.', price: 100 },
    { id: 'hair-clips',      group: 'crochet', name: 'Hair Clips & Bows',            emoji: '💇', color: '#C3A6FF', desc: 'Cute crochet hair clips and bow clips in lots of shapes and colours.', price: 50, priceMax: 100 },
    { id: 'leaf-bookmarks',  group: 'crochet', name: 'Leaf Accessories & Bookmarks', emoji: '🍃', color: '#7ED9B6', desc: 'Crochet leaf bookmarks and little leaf accessories. Perfect for book lovers!', price: 100 },
    { id: 'coasters',        group: 'crochet', name: 'Coasters',                    emoji: '☕', color: '#FFC93C', desc: 'Crochet coasters to keep your table tidy and your cup cosy.', price: 250 },
    { id: 'sunglass-covers', group: 'crochet', name: 'Sunglass Covers',             emoji: '🕶️', color: '#FF8FB1', desc: 'Soft crochet covers that keep your sunglasses safe and scratch-free.', price: 500 },
    { id: 'loom-bands',      group: 'loom',    name: 'Loom Bands',                  emoji: '🌈', color: '#8EC9FF', desc: 'Bright, bouncy creations made on the rubber-band loom.', price: 50 },
    { id: 'painted-bottles', group: 'loom',    name: 'Painted Glass Bottles',       emoji: '🍾', color: '#8EC9FF', desc: 'Glass bottles painted by hand. No two are the same.', price: 300 },
    { id: 'painted-rocks',   group: 'loom',    name: 'Painted Rocks',               emoji: '🪨', color: '#FF8FB1', desc: 'Pebbles turned into tiny artworks.', price: 250 },

    // ---- HOW TO ADD A NEW CATEGORY ----
    // 1. Remove the two // at the start of the line below and edit the words.
    // 2. In GitHub, create the folder images/earrings and upload photos into it
    //    (GitHub: Add file > Create new file > type  images/earrings/.gitkeep  > Commit).
    // { id: 'earrings', group: 'crochet', name: 'Earrings', emoji: '✨', color: '#FF8FB1', desc: 'Tiny crochet earrings.', price: 120 },
  ],

  // Country list for the order form: n = name, c = phone code, i = short label in the code menu, a = other spellings
  countries: [
    { n: 'India', i: 'IN', c: '91', a: ['in', 'bharat'] },
    { n: 'United States', i: 'US/CA', c: '1', a: ['usa', 'us', 'u.s.', 'america'] },
    { n: 'Canada', c: '1' },
    { n: 'United Kingdom', i: 'UK', c: '44', a: ['uk', 'england', 'britain'] },
    { n: 'Australia', i: 'AU', c: '61' },
    { n: 'New Zealand', i: 'NZ', c: '64' },
    { n: 'United Arab Emirates', i: 'UAE', c: '971', a: ['uae', 'dubai'] },
    { n: 'Saudi Arabia', i: 'KSA', c: '966' },
    { n: 'Qatar', i: 'QA', c: '974' },
    { n: 'Kuwait', i: 'KW', c: '965' },
    { n: 'Oman', i: 'OM', c: '968' },
    { n: 'Bahrain', i: 'BH', c: '973' },
    { n: 'Singapore', i: 'SG', c: '65' },
    { n: 'Malaysia', i: 'MY', c: '60' },
    { n: 'Hong Kong', i: 'HK', c: '852' },
    { n: 'Japan', i: 'JP', c: '81' },
    { n: 'Germany', i: 'DE', c: '49' },
    { n: 'France', i: 'FR', c: '33' },
    { n: 'Netherlands', i: 'NL', c: '31' },
    { n: 'Ireland', i: 'IE', c: '353' },
    { n: 'Switzerland', i: 'CH', c: '41' },
    { n: 'Italy', i: 'IT', c: '39' },
    { n: 'Spain', i: 'ES', c: '34' },
    { n: 'Sweden', i: 'SE', c: '46' },
    { n: 'Nepal', i: 'NP', c: '977' },
    { n: 'Sri Lanka', i: 'LK', c: '94' },
    { n: 'Bangladesh', i: 'BD', c: '880' },
    { n: 'South Africa', i: 'ZA', c: '27' },
    { n: 'Kenya', i: 'KE', c: '254' },
  ],
};

// "₹100-150" / "₹75" / "" for a category (used by the website, the build and /orders.html)
window.SITE.priceText = c => {
  const cur = window.SITE.currency || '₹', n = x => Number(x).toLocaleString('en-IN');
  if (!(Number(c && c.price) > 0)) return '';
  return Number(c.priceMax) > Number(c.price) ? `${cur}${n(c.price)}–${n(c.priceMax)}` : `${cur}${n(c.price)}`;
};
