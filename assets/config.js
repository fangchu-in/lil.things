// ====== EDIT ME ======
// Everything you're likely to change lives here.
window.SITE = {
  brand: 'Lil Things by Vaara',

  // WhatsApp number with country code, digits only
  whatsapp: '919766327697',

  makingTime: '7-14 days',

  // Groups are the headings on the page. Categories appear in this order.
  groups: [
    { id: 'crochet', title: 'Crochet', emoji: '🧶' },
    { id: 'loom',    title: 'Loom & painted', emoji: '🎨' },
  ],

  // "id" must match the folder name inside /images
  // "group" must match a group id above.
  categories: [
    { id: 'diya-holders',    group: 'crochet', name: 'Diya Holders',                emoji: '🪔', color: '#FFC93C', desc: 'Decorative crochet holders made for LED tea-lights. A cosy glow for festivals and every day.' },
    { id: 'bracelets',       group: 'crochet', name: 'Bracelets',                   emoji: '📿', color: '#FF8FB1', desc: 'Colourful handmade bracelets, perfect for gifts and for stacking.' },
    { id: 'scrunchies',      group: 'crochet', name: 'Scrunchies',                  emoji: '🎀', color: '#C3A6FF', desc: 'Soft crochet scrunchies in your favourite colours.' },
    { id: 'wallets-pouches', group: 'crochet', name: 'Wallets, Card & Key Pouches', emoji: '👛', color: '#7ED9B6', desc: 'Little crochet wallets, card holders and key pouches for everything you carry.' },
    { id: 'headbands',       group: 'crochet', name: 'Head Bands',                  emoji: '👑', color: '#FF6F61', desc: 'Cosy, cute crochet headbands in fun colours and patterns.' },
    { id: 'bags',            group: 'crochet', name: 'Bags & Phone Sleeves',        emoji: '👜', color: '#FFC93C', desc: 'Crochet bags and snug phone sleeves, made to carry around.' },
    { id: 'loom-bands',      group: 'loom',    name: 'Loom Bands',                  emoji: '🌈', color: '#8EC9FF', desc: 'Bright, bouncy creations made on the rubber-band loom.' },
    { id: 'painted-bottles', group: 'loom',    name: 'Painted Glass Bottles',       emoji: '🍾', color: '#8EC9FF', desc: 'Glass bottles painted by hand. No two are the same.' },
    { id: 'painted-rocks',   group: 'loom',    name: 'Painted Rocks',               emoji: '🪨', color: '#FF8FB1', desc: 'Pebbles turned into tiny artworks.' },

    // ---- HOW TO ADD A NEW CATEGORY ----
    // 1. Remove the two // at the start of the line below and edit the words.
    // 2. In GitHub, create the folder images/coasters and upload photos into it
    //    (GitHub: Add file > Create new file > type  images/coasters/.gitkeep  > Commit).
    // { id: 'coasters', group: 'crochet', name: 'Coasters', emoji: '☕', color: '#7ED9B6', desc: 'Crochet coasters for your cup.' },
    // { id: 'bows',     group: 'crochet', name: 'Bows',     emoji: '🎀', color: '#FF8FB1', desc: 'Cute crochet bows for hair and gifts.' },
  ],
};
