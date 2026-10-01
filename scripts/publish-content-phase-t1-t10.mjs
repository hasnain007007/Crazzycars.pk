/**
 * Publish Content-phase T1–T10 BlogPosts to VPS Mongo (one at a time).
 *
 * Usage (on VPS store container or via docker exec with MONGODB_URI):
 *   node publish-content-phase-t1-t10.mjs --topic=T1
 *   node publish-content-phase-t1-t10.mjs --topic=T9
 *   node publish-content-phase-t1-t10.mjs --backup-only
 *
 * Conditions baked in:
 * - T1 relatedProducts: only ABS/carbon-style disclosed SKUs
 * - T7 body years match VC tables (Corolla E140 2009–2014, Civic X 2016–2021, City 2021–2026)
 * - T8 keeps 45W (verified on CC-0181)
 * - T9 cut specialty-shops line
 * - T5 does not link year/variant guide until it is live (Oct 5)
 */
import { MongoClient, ObjectId } from "mongodb";
import fs from "fs";
import path from "path";

const AUTHOR = {
  name: "CrazzyCars Team",
  avatar: "",
  bio: "Car styling experts based in Gujranwala, helping Pakistani car owners upgrade with confidence.",
};

const P = {
  // T1 — ABS-disclosed only
  cityHandles: "6a5d227089c0c8d16c692043", // CC-0155
  civicXHandles: "6a5d227289c0c8d16c692057", // CC-0173
  corollaKnob: "6a5d224689c0c8d16c691f9e", // CC-0003
  // T2
  splitterUniversal: "6a5d226589c0c8d16c691fc0", // CC-0031 ABS
  splitter3pc: "6a5d226589c0c8d16c691fc3", // CC-0034
  corollaCanards: "6a5d226589c0c8d16c691fc7", // CC-0038
  // T3
  rebornLouver: "6a5d227289c0c8d16c69205c", // CC-0177
  rebirthLouver: "6a5d227289c0c8d16c692058", // CC-0174
  corollaLouver: "6a5d227189c0c8d16c69204b", // CC-0163
  // T4
  swiftHandles: "6a7109942bbf0b2bc05ffdb7", // CC-SWF-DHC-CF
  // T5
  civicKey5: "6aaad6020a9085c6c723eefa", // CC-0213
  civicKey3: "6a6e665bd91f24610892c723",
  cityKey: "6a6e6661d91f24610892c746",
  // T6
  dashCorolla: "6a5ea46f086726a54a151373", // CC-INT-102
  // T7
  airCorolla: "6a5ea46e086726a54a15136b", // CC-EXT-103
  airCivic: "6a5ea46e086726a54a15136c", // CC-EXT-104
  airCity: "6a5ea46e086726a54a15136d", // CC-EXT-105
  // T8
  charger45: "6a5d227289c0c8d16c692060", // CC-0181
  compressorKit: "6a6265230786ea8adbf05b40", // CC-UNI-142
  compressorPump: "6a6265240786ea8adbf05b41", // CC-UNI-143
};

const IMG = {
  t1: "https://crazzycars.pk/media/products/honda-city-2020-2026-carbon-door-handle-cover-abs-1-7ad94ae7db.webp",
  t2: "https://crazzycars.pk/media/products/universal-front-splitter-spike-d5-carbon-fiber-canard-3pcs-1-b2.webp",
  t3: "https://crazzycars.pk/media/products/honda-civic-reborn-2006-2012-carbon-window-quarter-covers-1.webp",
  t4: "https://crazzycars.pk/media/products/suzuki-swift-2022-2025-carbon-fiber-door-handles-cover-1-33c6b8cd63.webp",
  t5: "https://crazzycars.pk/media/products/honda-civic-2022-2026-carbon-fiber-key-fob-cover-5-button-1.webp",
  t6: "https://crazzycars.pk/media/products/toyota-corolla-2014-2026-velvet-dashboard-mat-2-42d6d2480a.webp",
  t7: "https://crazzycars.pk/media/products/honda-civic-2016-2021-premium-air-press-with-chrome-strip-1.webp",
  t8: "https://crazzycars.pk/media/products/4-in-1-45w-fast-car-charger-usb-type-c-built-in-ios-android-cable-1.webp",
  t9: "https://crazzycars.pk/media/products/honda-city-2020-2026-carbon-door-handle-cover-abs-1-7ad94ae7db.webp",
  t10: "https://crazzycars.pk/media/products/universal-front-splitter-spike-d5-carbon-fiber-canard-3pcs-1-b2.webp",
};

function oid(id) {
  return new ObjectId(id);
}
function a(href, text) {
  return `<a href="${href}">${text}</a>`;
}
function faqHtml(items) {
  return (
    `<h2>Frequently Asked Questions</h2>` +
    items.map(([q, ans]) => `<h3>${q}</h3><p>${ans}</p>`).join("")
  );
}
function words(html) {
  return html.replace(/<[^>]*>/g, " ").split(/\s+/).filter(Boolean).length;
}
function now() {
  return new Date();
}

const TOPICS = {
  T1: {
    title:
      "ABS vs Real Carbon Fiber Car Accessories in Pakistan: What’s Actually on the Listing",
    slug: "abs-vs-real-carbon-fiber-car-accessories-pakistan",
    excerpt:
      "If a listing says carbon fiber but the price looks like a trim kit, it is usually ABS with a carbon-look texture. This guide explains the difference—and how CrazzyCars labels it.",
    categories: ["Guides", "Buying Tips"],
    tags: [
      "abs vs carbon fiber",
      "carbon fiber accessories pakistan",
      "carbon look abs",
      "real carbon fiber car trim",
    ],
    featuredImage: {
      url: IMG.t1,
      publicId: "",
      altText: "Carbon-style ABS door handle covers — not woven carbon fiber",
    },
    relatedProducts: [P.cityHandles, P.civicXHandles, P.corollaKnob],
    categoryGuides: [
      {
        slug: "carbon-fiber-accessories",
        title: "ABS vs real carbon fiber (what’s on the listing)",
        href: "/blogs/abs-vs-real-carbon-fiber-car-accessories-pakistan",
      },
      {
        slug: "side-mirror-covers",
        title: "ABS vs real carbon fiber (what’s on the listing)",
        href: "/blogs/abs-vs-real-carbon-fiber-car-accessories-pakistan",
      },
    ],
    seo: {
      metaTitle: "ABS vs Real Carbon Fiber Accessories | CrazzyCars",
      metaDescription:
        "Most “carbon” trims sold online in Pakistan are ABS with a carbon-style finish—not woven fiber. Here’s how to read titles, photos, and fitment before you order.",
      metaKeywords: [
        "abs vs carbon fiber",
        "carbon fiber accessories pakistan",
        "carbon look abs",
      ],
    },
    faq: [
      {
        question: "Are most carbon trims on CrazzyCars real carbon fiber?",
        answer:
          "No. Most are ABS plastic with a carbon-style finish unless the product description clearly says otherwise.",
      },
      {
        question: "How do I know what I’m buying?",
        answer:
          "Read the title, description, and photos, and check the product FAQ. Prefer “carbon-style” / ABS language for trim kits.",
      },
      {
        question: "Does material change fitment?",
        answer:
          "No. Always confirm make, model, and years on the vehicle compatibility table before ordering.",
      },
    ],
    content: () => `
<p>Pakistan’s accessory market uses “carbon fiber” loosely. On CrazzyCars, most interior and exterior trims sold as carbon-style are <strong>ABS plastic with a carbon-look texture or print</strong>—not a woven carbon-fiber panel bonded like a race part.</p>

<h2>Why shops say “carbon” anyway</h2>
<p>Buyers search for that look. A snap-on gear-knob cover or door-handle set at everyday prices is almost never autoclave carbon. It is a moulded ABS piece finished to look like weave. That can still be a useful upgrade: lighter on the wallet, easier to fit, and honest when the listing says “carbon-style,” “carbon look,” or “ABS.”</p>

<h2>How to read a CrazzyCars listing</h2>
<ol>
<li><strong>Title and short description</strong> — Prefer wording like carbon-style / carbon look / ABS. If something were real woven fiber, it should say so clearly and the price/weight would usually reflect it.</li>
<li><strong>Photos</strong> — Edge thickness, back side, and install clips often reveal ABS mouldings.</li>
<li><strong>Vehicle compatibility table</strong> — Material honesty does not replace fitment. Use the table on the product page (make/model/years) as the fitment source of truth.</li>
<li><strong>FAQ on the product</strong> — Many carbon-look PDPs already answer “Is it real carbon fiber?” with an ABS disclosure.</li>
</ol>

<h2>What we do not claim</h2>
<p>We do not invent “100% real carbon” language on ABS kits. Where older titles still say “carbon fiber” out of habit, treat the <strong>description + FAQ + photos</strong> as the honesty layer until titles are cleaned in a separate data-quality pass—not by silently rewriting SEO.</p>

<h2>Where to shop the look (with eyes open)</h2>
<p>Browse ${a("/categories/carbon-fiber-accessories", "Carbon Fiber Accessories")} and ${a("/categories/side-mirror-covers", "Side Mirror Covers")}. Examples of ABS carbon-style listings: ${a("/honda-city-2020-2026-carbon-door-handle-cover-abs", "City door handle covers")}, ${a("/honda-civic-x-2016-2021-carbon-door-handle-cover-full-set", "Civic X door handle covers")}, and ${a("/toyota-corolla-carbon-fiber-gear-knob-cover-2014-2026", "Corolla gear knob cover")}. For styling context, see also ${a("/blogs/side-mirror-covers-carbon-fiber-accents-guide", "Side Mirror Covers & Carbon Fiber Accents")}.</p>

<h2>COD and delivery</h2>
<p>Eligible items can use Cash on Delivery with delivery paid in advance. See ${a("/cash-on-delivery", "Cash on Delivery")} and our ${a("/shipping-policy", "shipping policy")}.</p>

${faqHtml([
  ["Are most carbon trims on CrazzyCars real carbon fiber?", "No. Most are ABS plastic with a carbon-style finish unless the product description clearly says otherwise."],
  ["How do I know what I’m buying?", "Read the title, description, and photos, and check the product FAQ. Prefer “carbon-style” / ABS language for trim kits."],
  ["Does material change fitment?", "No. Always confirm make, model, and years on the vehicle compatibility table before ordering."],
])}
`.trim(),
  },

  T9: {
    title:
      "Returns & Wrong-Item Policy for Car Accessories in Pakistan (CrazzyCars Plain Guide)",
    slug: "car-accessories-returns-wrong-item-pakistan-crazzycars",
    excerpt:
      "Before you open a dispute in your head: here’s exactly when we refund, when we only exchange, and how to start a claim within 7 days.",
    categories: ["Guides", "Buying Tips"],
    tags: [
      "crazzycars returns",
      "wrong item delivered",
      "car accessories return policy pakistan",
      "exchange only",
    ],
    featuredImage: {
      url: IMG.t9,
      publicId: "",
      altText: "Returns and wrong-item policy guide for CrazzyCars Pakistan",
    },
    relatedProducts: [],
    categoryGuides: [],
    seo: {
      metaTitle: "Returns & Wrong Item Policy | CrazzyCars",
      metaDescription:
        "7-day returns for defective or wrong items shipped—with full refund. Change of mind is exchange-only. How to start a claim on CrazzyCars.pk.",
      metaKeywords: [
        "crazzycars returns",
        "wrong item delivered",
        "car accessories return policy pakistan",
      ],
    },
    faq: [
      {
        question: "What is your return window?",
        answer: "7 days for defective items or wrong items shipped.",
      },
      {
        question: "Do I get cash back if I change my mind?",
        answer:
          "No. Change-of-mind returns are exchange-only for a different product or size.",
      },
      {
        question: "Who pays return shipping for a defective or wrong item?",
        answer:
          "For eligible defective/wrong-item returns, the store pays return shipping per our returns policy.",
      },
      {
        question: "Where do I start a claim?",
        answer:
          "Use the Returns Policy page or FAQ, and message WhatsApp with your order number and photos.",
      },
    ],
    content: () => `
<p>Buying body kits, trims, and lights online only works if returns rules are clear. This is the plain-language version of what we already publish in policy and FAQ—not a new promise.</p>

<h2>When you get a full refund</h2>
<p>Within <strong>7 days</strong> of delivery, if the item arrives <strong>defective</strong> or we shipped the <strong>wrong item</strong>, you are eligible for a <strong>full refund</strong>. In those cases we cover return shipping as stated in our returns policy.</p>

<h2>Change of mind</h2>
<p>If the part is correct and undamaged but you changed your mind (wrong colour preference, ordered two styles, etc.), we offer an <strong>exchange</strong> for a different product or size—<strong>not</strong> a cash refund.</p>

<h2>Fitment mistakes vs wrong item</h2>
<p>Ordering the wrong year/generation when the listing’s vehicle table was clear is usually <strong>not</strong> “wrong item shipped.” Use the compatibility table before you confirm COD. If we sent a different SKU than you paid for, that <strong>is</strong> wrong-item territory.</p>

<h2>How to start a claim</h2>
<p>Open the ${a("/returns-policy", "Returns Policy")}, or start from ${a("/faq", "FAQ")}. Keep unboxing photos, the order number, and a clear photo of the part label/packaging. WhatsApp support with those details speeds things up.</p>

<h2>Related reading</h2>
<p>${a("/blogs/cod-vs-online-payment-car-accessories-pakistan", "Cash on Delivery vs Online Payment")} · ${a("/cash-on-delivery", "Cash on Delivery landing")} · ${a("/shipping-policy", "Shipping policy")}</p>

${faqHtml([
  ["What is your return window?", "7 days for defective items or wrong items shipped."],
  ["Do I get cash back if I change my mind?", "No. Change-of-mind returns are exchange-only for a different product or size."],
  ["Who pays return shipping for a defective or wrong item?", "For eligible defective/wrong-item returns, the store pays return shipping per our returns policy."],
  ["Where do I start a claim?", "Use the Returns Policy page or FAQ, and message WhatsApp with your order number and photos."],
])}
`.trim(),
  },

  T10: {
    title: "CrazzyCars Delivery Charges Explained: Rs. 250 Regular vs Rs. 500 Bulky",
    slug: "crazzycars-delivery-charges-regular-vs-bulky-pakistan",
    excerpt:
      "Checkout surprise is usually the bulky fee—not a hidden product markup. Here’s what counts as bulky and how spoilers can differ.",
    categories: ["Guides", "Buying Tips"],
    tags: [
      "crazzycars delivery charges",
      "bulky delivery fee pakistan",
      "spoiler delivery",
      "COD shipping advance",
    ],
    featuredImage: {
      url: IMG.t10,
      publicId: "",
      altText: "Bulky car accessories that often use Rs. 500 delivery",
    },
    relatedProducts: [],
    categoryGuides: [
      {
        slug: "splitters-side-skirts",
        title: "Delivery charges: regular vs bulky",
        href: "/blogs/crazzycars-delivery-charges-regular-vs-bulky-pakistan",
      },
      {
        slug: "spoilers-diffusers",
        title: "Delivery charges: regular vs bulky",
        href: "/blogs/crazzycars-delivery-charges-regular-vs-bulky-pakistan",
      },
      {
        slug: "floor-mats",
        title: "Delivery charges: regular vs bulky",
        href: "/blogs/crazzycars-delivery-charges-regular-vs-bulky-pakistan",
      },
    ],
    seo: {
      metaTitle: "Delivery Charges Regular vs Bulky | CrazzyCars",
      metaDescription:
        "Delivery is Rs. 250 for regular items, or Rs. 500 when the cart includes bulky items (splitters, side skirts, spoilers, floor mats, and similar). Shipping is paid in advance; the rest is COD where eligible.",
      metaKeywords: [
        "crazzycars delivery charges",
        "bulky delivery fee pakistan",
        "spoiler delivery",
      ],
    },
    faq: [
      {
        question: "How much are delivery charges?",
        answer:
          "Rs. 250 regular, or Rs. 500 when the order includes bulky items. Shipping is paid in advance; the rest is COD where eligible.",
      },
      {
        question: "What counts as bulky?",
        answer:
          "Items such as splitters, side skirts, spoilers, and floor mats—and any product marked bulky on its page.",
      },
      {
        question: "Why might a spoiler show a different fee?",
        answer:
          "Roof or trunk spoilers and Express courier can use a special rate shown at checkout.",
      },
    ],
    content: () => `
<p><strong>The rule (live store policy)</strong><br/>
Delivery is <strong>Rs. 250</strong> for regular items, or <strong>Rs. 500</strong> when the order includes <strong>bulky</strong> items (splitters, side skirts, spoilers, floor mats, etc.). Shipping is paid <strong>in advance</strong>; the rest is Cash on Delivery where the item is COD-eligible. There is <strong>no</strong> order-value waiver for delivery.</p>

<h2>What usually triggers Rs. 500</h2>
<p>Carts that include items flagged bulky in catalog—common on ${a("/categories/splitters-side-skirts", "Splitters & Side Skirts")}, ${a("/categories/spoilers-diffusers", "Spoilers & Diffusers")}, and ${a("/categories/floor-mats", "Floor Mats")}. If any line in the cart is bulky, checkout uses the bulky fee.</p>

<h2>Spoilers / special courier</h2>
<p>Roof or trunk spoilers and Express (Daewoo) can use a <strong>different courier rate shown at checkout</strong>. Always trust the checkout line, not a screenshot from last month.</p>

<h2>How this pairs with COD</h2>
<p>You still pay delivery up front (JazzCash / bank / listed methods), then pay for the goods on delivery when COD applies. Body kits named as body kits cannot use COD—see product FAQ and ${a("/cash-on-delivery", "Cash on Delivery")}.</p>

<h2>Related</h2>
<p>${a("/shipping-policy", "Shipping policy")} · ${a("/blogs/cod-vs-online-payment-car-accessories-pakistan", "COD vs online payment guide")} · ${a("/faq", "FAQ")}</p>

${faqHtml([
  ["How much are delivery charges?", "Rs. 250 regular, or Rs. 500 when the order includes bulky items. Shipping is paid in advance; the rest is COD where eligible."],
  ["What counts as bulky?", "Items such as splitters, side skirts, spoilers, and floor mats—and any product marked bulky on its page."],
  ["Why might a spoiler show a different fee?", "Roof or trunk spoilers and Express courier can use a special rate shown at checkout."],
])}
`.trim(),
  },

  T2: {
    title:
      "Front Splitters & Side Skirts in Pakistan: Fit, Look, and Why Delivery Is Often Rs. 500",
    slug: "front-splitters-side-skirts-buying-guide-pakistan",
    excerpt:
      "Front aero kits change the stance fast—and they ship as bulky. Here’s how to choose without wrecking the bumper line or getting surprised at checkout.",
    categories: ["Guides", "Exterior"],
    tags: [
      "car splitter pakistan",
      "side skirts pakistan",
      "abs front splitter",
      "bulky delivery",
    ],
    featuredImage: {
      url: IMG.t2,
      publicId: "",
      altText: "ABS front splitter and canard kit for Pakistani cars",
    },
    relatedProducts: [P.splitterUniversal, P.splitter3pc, P.corollaCanards],
    categoryGuides: [
      {
        slug: "splitters-side-skirts",
        title: "Front splitters & side skirts buying guide",
        href: "/blogs/front-splitters-side-skirts-buying-guide-pakistan",
      },
    ],
    seo: {
      metaTitle: "Splitters & Side Skirts Buying Guide | CrazzyCars",
      metaDescription:
        "How to pick ABS splitters and side skirts for Pakistani roads—universal vs model-specific, install reality, and why bulky carts pay Rs. 500 delivery.",
      metaKeywords: ["car splitter pakistan", "side skirts pakistan", "abs front splitter"],
    },
    faq: [
      {
        question: "Will a universal splitter fit my bumper?",
        answer:
          "Only if the shape matches—compare product photos to your car. When unsure, WhatsApp a bumper photo.",
      },
      {
        question: "Why is delivery Rs. 500?",
        answer:
          "Splitters and side skirts are usually bulky; bulky carts use the bulky delivery fee shown at checkout.",
      },
      {
        question: "Is it real carbon fiber?",
        answer: "Most are ABS unless the listing says otherwise.",
      },
    ],
    content: () => `
<p>Splitters and side skirts are among the quickest exterior upgrades—and among the most returned when buyers ignore bumper shape or year.</p>

<h2>Universal vs vehicle-specific</h2>
<p>Universal 3-piece or 4-piece kits need you to compare photos to <strong>your</strong> bumper. Model-specific kits (for example Corolla canards) still need the vehicle compatibility table on each product—start from ${a("/categories/splitters-side-skirts", "Splitters & Side Skirts")}.</p>

<h2>Material</h2>
<p>Most kits here are <strong>ABS</strong>. They are for look and light aero character, not track crash structures. Examples: ${a("/universal-front-splitter-spike-d5-carbon-fiber-canard-3pcs", "D5 spike canards")}, ${a("/universal-3-piece-front-bumper-splitter-ground-style-abs", "3-piece ground-style splitter")}, ${a("/toyota-corolla-2009-2014-sportline-front-splitter-canards-red-black", "Corolla 2009–2014 Sportline canards")}.</p>

<h2>Install</h2>
<p>Many are adhesive / screw-on. Ground clearance on Pakistani speed breakers matters—aggressive splitters scrape. If you are not comfortable drilling or aligning, use a trusted installer.</p>

<h2>Delivery</h2>
<p>These lines are typically <strong>bulky</strong> → <strong>Rs. 500</strong> delivery when in the cart. See ${a("/blogs/crazzycars-delivery-charges-regular-vs-bulky-pakistan", "delivery charges explained")} or ${a("/shipping-policy", "shipping policy")}.</p>

<h2>Shop</h2>
<p>${a("/categories/splitters-side-skirts", "Splitters & Side Skirts")} · related: ${a("/categories/spoilers-diffusers", "Spoilers & Diffusers")}</p>

${faqHtml([
  ["Will a universal splitter fit my bumper?", "Only if the shape matches—compare product photos to your car. When unsure, WhatsApp a bumper photo."],
  ["Why is delivery Rs. 500?", "Splitters and side skirts are usually bulky; bulky carts use the bulky delivery fee shown at checkout."],
  ["Is it real carbon fiber?", "Most are ABS unless the listing says otherwise."],
])}
`.trim(),
  },

  T3: {
    title: "Quarter Window Louvers in Pakistan: Civic & Corolla Fitment Without Guesswork",
    slug: "quarter-window-louvers-civic-corolla-fitment-pakistan",
    excerpt:
      "Louvers only look right when the glass shape matches. Here’s how to use generation names and the compatibility table before you COD.",
    categories: ["Guides", "Exterior"],
    tags: [
      "quarter window louvers pakistan",
      "civic louver",
      "rear side glass cover",
    ],
    featuredImage: {
      url: IMG.t3,
      publicId: "",
      altText: "Honda Civic quarter window louvers fitment guide",
    },
    relatedProducts: [P.rebornLouver, P.rebirthLouver, P.corollaLouver],
    categoryGuides: [
      {
        slug: "quarter-window-louvers",
        title: "Quarter window louvers: Civic & Corolla fitment",
        href: "/blogs/quarter-window-louvers-civic-corolla-fitment-pakistan",
      },
    ],
    seo: {
      metaTitle: "Quarter Window Louvers Fitment Guide | CrazzyCars",
      metaDescription:
        "How quarter window / rear side glass louvers fit Civic Reborn, Rebirth, and common Corollas—check years, install style, and skip the wrong generation.",
      metaKeywords: [
        "quarter window louvers pakistan",
        "civic louver",
        "rear side glass cover",
      ],
    },
    faq: [
      {
        question: "Do I need to drill?",
        answer: "Many louvers avoid body drilling—follow the product install notes.",
      },
      {
        question: "Will Reborn louvers fit Rebirth?",
        answer: "No. Use the vehicle compatibility table; generations differ.",
      },
      {
        question: "Where do I shop?",
        answer:
          "The Quarter Window Louvers category, filtered by your car on the product page.",
      },
    ],
    content: () => `
<p>Quarter window covers (louvers) sit over the rear side glass. The wrong generation leaves gaps or won’t clip.</p>

<h2>Generations that matter here</h2>
<p>Honda Civic <strong>Reborn</strong>, <strong>Rebirth</strong>, and some Toyota Corolla generations each have different glass corners. Start on ${a("/categories/quarter-window-louvers", "Quarter Window Louvers")}, then open the product’s vehicle table. Examples: ${a("/honda-civic-reborn-2006-2012-carbon-window-quarter-covers", "Civic Reborn covers")}, ${a("/honda-civic-rebirth-2012-2015-carbon-window-quarter-covers", "Civic Rebirth covers")}, ${a("/toyota-corolla-e140-2009-2012-carbon-window-quarter-covers", "Corolla E140 covers")}. For Civic context see ${a("/blogs/honda-civic-accessories-guide-every-generation", "Honda Civic Accessories Guide: Every Generation")} and ${a("/cars/honda-civic-reborn-2006-2012", "Civic Reborn")} / ${a("/cars/honda-civic-rebirth-2012-2016", "Civic Rebirth")} when those rows exist on the SKU.</p>

<h2>Install</h2>
<p>Many covers are designed for OEM-style fit without body drilling. Follow the listing; if unsure, WhatsApp a photo of your rear glass corners.</p>

<h2>Year mismatches</h2>
<p>If the title years and the table disagree, <strong>the table is the source of truth</strong>—same rule as our product FAQs.</p>

${faqHtml([
  ["Do I need to drill?", "Many louvers avoid body drilling—follow the product install notes."],
  ["Will Reborn louvers fit Rebirth?", "No. Use the vehicle compatibility table; generations differ."],
  ["Where do I shop?", "The Quarter Window Louvers category, filtered by your car on the product page."],
])}
`.trim(),
  },

  T4: {
    title: "Door Handle Covers Buying Guide (City, Civic, Corolla & Swift)",
    slug: "door-handle-covers-buying-guide-pakistan-city-civic-corolla",
    excerpt:
      "One of the cheapest exterior refreshes—if the handle shape matches. Use this checklist before you order.",
    categories: ["Guides", "Exterior"],
    tags: [
      "door handle covers pakistan",
      "carbon door handles",
      "city civic corolla handles",
    ],
    featuredImage: {
      url: IMG.t4,
      publicId: "",
      altText: "Carbon-style ABS door handle covers for Pakistani cars",
    },
    relatedProducts: [P.cityHandles, P.civicXHandles, P.swiftHandles],
    categoryGuides: [
      {
        slug: "door-handle-covers",
        title: "Door handle covers buying guide (City, Civic, Corolla & Swift)",
        href: "/blogs/door-handle-covers-buying-guide-pakistan-city-civic-corolla",
      },
    ],
    seo: {
      metaTitle: "Door Handle Covers Buying Guide | CrazzyCars",
      metaDescription:
        "How to pick carbon-style door handle covers for Honda City, Civic, Toyota Corolla, and Suzuki Swift—fitment years, ABS honesty, and install expectations.",
      metaKeywords: [
        "door handle covers pakistan",
        "carbon door handles",
        "city civic corolla handles",
      ],
    },
    faq: [
      {
        question: "Is it real carbon fiber?",
        answer: "Usually ABS with a carbon-style finish—check the listing.",
      },
      {
        question: "Will City 2018 covers fit City 2022?",
        answer: "No—different generations. Use the compatibility table.",
      },
      {
        question: "Do I need tools?",
        answer: "Many sets are snap-on; follow the product photos.",
      },
    ],
    content: () => `
<p>Door handle covers are generation-specific even when the brand name matches.</p>

<h2>Checklist</h2>
<ol>
<li>Confirm <strong>years</strong> on the vehicle table (City Classic vs 2021+, Civic Reborn vs Rebirth vs X vs 11th).</li>
<li>Expect <strong>ABS carbon-style</strong> finish unless stated otherwise (see ${a("/blogs/abs-vs-real-carbon-fiber-car-accessories-pakistan", "ABS vs real carbon fiber")}).</li>
<li>Most are snap-on; don’t force a cover that doesn’t seat.</li>
<li>Browse ${a("/categories/door-handle-covers", "Door Handle Covers")}. Examples: ${a("/honda-city-2020-2026-carbon-door-handle-cover-abs", "City 2020–2026")}, ${a("/honda-civic-x-2016-2021-carbon-door-handle-cover-full-set", "Civic X")}, ${a("/suzuki-swift-2022-2025-carbon-fiber-door-handles-cover", "Swift 2022–2025")}. Deep dive for Swift: ${a("/blogs/suzuki-swift-carbon-door-handle-covers-pakistan", "Suzuki Swift carbon door handle covers")}.</li>
</ol>

${faqHtml([
  ["Is it real carbon fiber?", "Usually ABS with a carbon-style finish—check the listing."],
  ["Will City 2018 covers fit City 2022?", "No—different generations. Use the compatibility table."],
  ["Do I need tools?", "Many sets are snap-on; follow the product photos."],
])}
`.trim(),
  },

  T5: {
    title: "Key Covers & Key Chains in Pakistan: Match the Buttons Before You Order",
    slug: "key-covers-key-chains-match-buttons-pakistan",
    excerpt:
      "A 3-button shell will not sit on a 4-button fob. Here’s the boring check that saves a courier round-trip.",
    categories: ["Guides", "Interior"],
    tags: [
      "key cover pakistan",
      "civic key cover",
      "city key cover",
      "key chain",
    ],
    featuredImage: {
      url: IMG.t5,
      publicId: "",
      altText: "Match key cover button layout before ordering",
    },
    relatedProducts: [P.civicKey5, P.civicKey3, P.cityKey],
    categoryGuides: [
      {
        slug: "key-covers-key-chains",
        title: "Key covers & key chains: match the buttons",
        href: "/blogs/key-covers-key-chains-match-buttons-pakistan",
      },
    ],
    seo: {
      metaTitle: "Key Covers & Key Chains Fit Guide | CrazzyCars",
      metaDescription:
        "Soft and hard key covers fail when the button layout is wrong. How to match Civic/City and other fobs—and when a push-start cover is a different part.",
      metaKeywords: ["key cover pakistan", "civic key cover", "city key cover"],
    },
    faq: [
      {
        question: "How do I pick the right key cover?",
        answer:
          "Match brand and button layout to the product title and photos (for example 3-button vs 4-button). WhatsApp a clear photo of your key if unsure.",
      },
      {
        question: "Are these vehicle-year specific?",
        answer:
          "Many are model/fob specific rather than full VC tables—photos matter.",
      },
      {
        question: "Is a push-start cover the same thing?",
        answer:
          "No—that covers the cabin start button, not the metal/plastic key shell.",
      },
    ],
    content: () => `
<h2>Match photos to your key</h2>
<p>Count buttons, look at the logo window, and compare the product image to your fob in daylight. Browse ${a("/categories/key-covers-key-chains", "Key Covers & Key Chains")}. Examples: ${a("/honda-civic-2022-2026-carbon-fiber-key-fob-cover-5-button", "Civic 5-button fob cover")}, Civic 3-button metal covers, and City metal key covers on the same shelf.</p>

<h2>Not the same as push-start covers</h2>
<p>Engine start button covers and key-fob shells are different parts—see ${a("/blogs/push-start-cover-carbon-key-fob-accessories-pakistan", "Push Start Covers & Carbon Key Fob Accessories")}.</p>

<h2>Year / variant habit</h2>
<p>A general year/variant matching guide is scheduled for 5 October 2026. Until that post is live, treat button layout + product photos as the check for key covers—and use each product’s vehicle table when one is present.</p>

${faqHtml([
  ["How do I pick the right key cover?", "Match brand and button layout to the product title and photos (for example 3-button vs 4-button). WhatsApp a clear photo of your key if unsure."],
  ["Are these vehicle-year specific?", "Many are model/fob specific rather than full VC tables—photos matter."],
  ["Is a push-start cover the same thing?", "No—that covers the cabin start button, not the metal/plastic key shell."],
])}
`.trim(),
  },

  T6: {
    title: "Dashboard Mats in Pakistan: Cut Glare Without Buying the Wrong Year",
    slug: "dashboard-mats-pakistan-sun-glare-buying-guide",
    excerpt:
      "A dash mat only works if the defrost vents and speaker cutouts line up. Here’s how to order without covering a vent.",
    categories: ["Guides", "Interior"],
    tags: ["dashboard mat pakistan", "velvet dash mat", "corolla dash mat"],
    featuredImage: {
      url: IMG.t6,
      publicId: "",
      altText: "Vehicle-specific velvet dashboard mat for Pakistani sun",
    },
    relatedProducts: [P.dashCorolla],
    categoryGuides: [
      {
        slug: "dashboard-mats",
        title: "Dashboard mats: cut glare without the wrong year",
        href: "/blogs/dashboard-mats-pakistan-sun-glare-buying-guide",
      },
    ],
    seo: {
      metaTitle: "Dashboard Mats Buying Guide | CrazzyCars",
      metaDescription:
        "Vehicle-specific velvet dash mats for Pakistani sun—why universal mats fail, how years work, and how they differ from floor mats and sun shades.",
      metaKeywords: ["dashboard mat pakistan", "velvet dash mat", "corolla dash mat"],
    },
    faq: [
      {
        question: "Are these universal?",
        answer: "No—confirm make, model, and years on the product page.",
      },
      {
        question: "Will a 2012 Corolla mat fit 2018?",
        answer: "Usually not (different generations). Use the compatibility table.",
      },
      {
        question: "Does it replace window tint?",
        answer: "No. It reduces dash glare; tint and shades are separate choices.",
      },
    ],
    content: () => `
<h2>Vehicle-specific, not universal</h2>
<p>Our ${a("/categories/dashboard-mats", "Dashboard Mats")} shelf is built around make/model/years. Confirm the table before COD. Example: ${a("/toyota-corolla-2014-2026-velvet-dashboard-mat", "Corolla 2014–2026 velvet dash mat")}.</p>

<h2>vs floor mats / sun shades</h2>
<p>Floor mats protect footwells (${a("/blogs/best-floor-mats-pakistani-weather-guide", "weather guide")}). Sun shades and heat habits are separate (${a("/blogs/protect-car-interior-from-pakistan-heat", "heat guide")}). Dash mats sit on the panel to reduce glare and stop phones sliding.</p>

<h2>Material</h2>
<p>Listings are typically velvet / anti-slip fabric—follow the product page for thickness and cutouts.</p>

${faqHtml([
  ["Are these universal?", "No—confirm make, model, and years on the product page."],
  ["Will a 2012 Corolla mat fit 2018?", "Usually not (different generations). Use the compatibility table."],
  ["Does it replace window tint?", "No. It reduces dash glare; tint and shades are separate choices."],
])}
`.trim(),
  },

  T7: {
    title: "Car Air Press (Window Visors) in Pakistan: Corolla, Civic & City Fitment",
    slug: "car-air-press-window-visors-fitment-pakistan",
    excerpt:
      "Air press kits are door-frame specific. Here’s how to use the Air Press category without ordering the wrong chrome-strip set.",
    categories: ["Guides", "Exterior"],
    tags: ["air press pakistan", "window visor", "rain guard car pakistan"],
    featuredImage: {
      url: IMG.t7,
      publicId: "",
      altText: "Vehicle-specific air press window visors with chrome strip",
    },
    relatedProducts: [P.airCorolla, P.airCivic, P.airCity],
    categoryGuides: [
      {
        slug: "air-press",
        title: "Air press / window visors fitment (Corolla, Civic, City)",
        href: "/blogs/car-air-press-window-visors-fitment-pakistan",
      },
    ],
    seo: {
      metaTitle: "Air Press Window Visors Fitment | CrazzyCars",
      metaDescription:
        "Model-specific air press / rain visors for Corolla, Civic, and City—why universal rarely works, and how to check years before install.",
      metaKeywords: ["air press pakistan", "window visor", "rain guard car pakistan"],
    },
    faq: [
      {
        question: "Will this fit my car?",
        answer:
          "Only if your make/model/years appear on that product’s compatibility table.",
      },
      {
        question: "Do I need to drill?",
        answer:
          "Most kits are designed for OEM-style door-frame fit—follow the listing.",
      },
      {
        question: "Is it universal?",
        answer: "The kits in this category are vehicle-specific.",
      },
    ],
    content: () => `
<p>Air press (window visors) deflect rain and reduce window-down turbulence. On CrazzyCars they live under ${a("/categories/air-press", "Air Press")} as <strong>vehicle-specific</strong> kits. Current shelf examples (years from each product’s vehicle compatibility table—not title marketing alone):</p>
<ul>
<li>${a("/toyota-corolla-2008-2013-premium-air-press-with-chrome-strip", "Toyota Corolla E140")} — table: <strong>2009–2014</strong> (title may say 2008–2013; table wins)</li>
<li>${a("/honda-civic-2016-2021-premium-air-press-with-chrome-strip", "Honda Civic X")} — table: <strong>2016–2021</strong></li>
<li>${a("/honda-city-2021-2026-txr-air-press-with-chrome", "Honda City 7th Gen / TXR-style")} — table: <strong>2021–2026</strong></li>
</ul>

<h2>Fitment</h2>
<p>Open the product and read the vehicle compatibility table. Titles can be narrower or broader than the table—<strong>table wins</strong>.</p>

<h2>Install</h2>
<p>Most are OEM-style door-frame fit. Follow listing notes; WhatsApp your year if unsure. Drilling is usually unnecessary when the kit matches the door.</p>

${faqHtml([
  ["Will this fit my car?", "Only if your make/model/years appear on that product’s compatibility table."],
  ["Do I need to drill?", "Most kits are designed for OEM-style door-frame fit—follow the listing."],
  ["Is it universal?", "The kits in this category are vehicle-specific."],
])}
`.trim(),
  },

  T8: {
    title: "Roadside Kit Basics: Fast Car Chargers & Dual-Cylinder Air Compressors",
    slug: "car-chargers-air-compressors-roadside-pakistan",
    excerpt:
      "A flat tyre or dead phone on GT Road is a bad time to learn what “full kit” means. Here’s how to read those listings.",
    categories: ["Guides"],
    tags: [
      "car air compressor pakistan",
      "45w car charger",
      "roadside emergency kit",
    ],
    featuredImage: {
      url: IMG.t8,
      publicId: "",
      altText: "45W fast car charger and dual-cylinder air compressor",
    },
    relatedProducts: [P.charger45, P.compressorKit, P.compressorPump],
    categoryGuides: [
      {
        slug: "emergency-safety",
        title: "Roadside kit: chargers & air compressors",
        href: "/blogs/car-chargers-air-compressors-roadside-pakistan",
      },
      {
        slug: "utility",
        title: "Roadside kit: chargers & air compressors",
        href: "/blogs/car-chargers-air-compressors-roadside-pakistan",
      },
    ],
    seo: {
      metaTitle: "Car Chargers & Air Compressors Guide | CrazzyCars",
      metaDescription:
        "What to check on 12V fast chargers and dual-cylinder compressors for Pakistani roadside use—ports, kits vs bare pumps, and where they sit in our catalog.",
      metaKeywords: [
        "car air compressor pakistan",
        "45w car charger",
        "roadside emergency kit",
      ],
    },
    faq: [
      {
        question: "Are chargers vehicle-specific?",
        answer: "No—they are 12V accessories unless a listing says otherwise.",
      },
      {
        question: "What’s in a “full kit” compressor?",
        answer:
          "Usually pump + hose + adapters + case—confirm on the product page.",
      },
      {
        question: "Why do items appear in two categories?",
        answer:
          "Some SKUs are dual-tagged under Emergency & Safety and Utility.",
      },
    ],
    content: () => `
<h2>Chargers</h2>
<p>Multi-port 12V chargers (USB / Type-C / built-in leads) are <strong>universal</strong>—confirm plug type and cable set on the listing. Example: ${a("/4-in-1-45w-fast-car-charger-usb-type-c-built-in-ios-android-cable", "4-in-1 45W fast car charger")} on ${a("/categories/emergency-safety", "Emergency & Safety")}.</p>

<h2>Compressors</h2>
<p>Dual-cylinder pumps appear under Emergency & Safety and ${a("/categories/utility", "Utility")}. Check whether the listing is a <strong>full kit with box/hose</strong> (${a("/air-compressor-dual-cylinder-full-kit-with-box-auto-inflator-pump", "full kit")}) or a bare pump (${a("/double-cylinder-air-compressor-pump", "pump only")}). Voltage and duty cycle matter for roadside use—read the product page; we don’t invent PSI claims here.</p>

<h2>Not a medical/first-aid kit</h2>
<p>This category is power and inflation tools, not a full emergency medical loadout.</p>

${faqHtml([
  ["Are chargers vehicle-specific?", "No—they are 12V accessories unless a listing says otherwise."],
  ["What’s in a “full kit” compressor?", "Usually pump + hose + adapters + case—confirm on the product page."],
  ["Why do items appear in two categories?", "Some SKUs are dual-tagged under Emergency & Safety and Utility."],
])}
`.trim(),
  },
};

async function backup(col, outDir) {
  const docs = await col.find({}).toArray();
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = path.join(outDir, `blogposts-backup-${stamp}.json`);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(docs, null, 2));
  return { file, count: docs.length };
}

async function addCategoryGuide(db, guide) {
  if (!guide?.slug || !guide?.href || !guide?.title) return { ok: false, reason: "bad-guide" };
  const cat = await db.collection("categories").findOne({ slug: guide.slug });
  if (!cat) return { ok: false, reason: "category-missing", slug: guide.slug };
  const existing = Array.isArray(cat.relatedGuides) ? cat.relatedGuides : [];
  if (existing.some((g) => g && g.href === guide.href)) {
    return { ok: true, action: "already-present", slug: guide.slug };
  }
  await db.collection("categories").updateOne(
    { _id: cat._id },
    {
      $push: { relatedGuides: { title: guide.title, href: guide.href } },
      $set: { updatedAt: new Date() },
    }
  );
  return { ok: true, action: "pushed", slug: guide.slug };
}

async function publishTopic(db, key) {
  const def = TOPICS[key];
  if (!def) throw new Error(`Unknown topic ${key}`);
  const col = db.collection("blogposts");
  const existing = await col.findOne({ slug: def.slug });
  if (existing) {
    return { key, slug: def.slug, action: "skip-exists", id: String(existing._id) };
  }

  // Resolve featured image from first related product if available
  let featuredImage = def.featuredImage;
  if (def.relatedProducts?.[0]) {
    const prod = await db.collection("products").findOne(
      { _id: oid(def.relatedProducts[0]) },
      { projection: { "media.images": 1, name: 1 } }
    );
    const url = prod?.media?.images?.[0]?.url;
    if (url) {
      featuredImage = {
        url,
        publicId: "",
        altText: def.featuredImage.altText || prod.name || def.title,
      };
    }
  }

  const content = typeof def.content === "function" ? def.content() : def.content;
  const wc = words(content);
  const readTime = Math.max(1, Math.ceil(wc / 200));
  const publishedAt = now();
  const doc = {
    title: def.title,
    slug: def.slug,
    excerpt: def.excerpt,
    content,
    featuredImage,
    author: AUTHOR,
    categories: def.categories,
    tags: def.tags,
    status: "published",
    publishedAt,
    scheduledAt: null,
    views: 0,
    readTime,
    readTimeManual: false,
    seo: def.seo,
    faq: def.faq || [],
    allowComments: true,
    isFeatured: true,
    relatedProducts: (def.relatedProducts || []).map(oid),
    createdAt: publishedAt,
    updatedAt: publishedAt,
  };
  const ins = await col.insertOne(doc);
  const guideResults = [];
  for (const g of def.categoryGuides || []) {
    guideResults.push(await addCategoryGuide(db, g));
  }
  return {
    key,
    slug: def.slug,
    action: "inserted",
    id: String(ins.insertedId),
    words: wc,
    readTime,
    relatedProducts: def.relatedProducts.length,
    categoryGuides: guideResults,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const topicArg = args.find((a) => a.startsWith("--topic="))?.split("=")[1];
  const backupOnly = args.includes("--backup-only");
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI missing");

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();
  const col = db.collection("blogposts");

  const outDir =
    process.env.BACKUP_DIR ||
    "/tmp/content-phase-t1-t10-backups";

  const backupInfo = await backup(col, outDir);
  console.log(JSON.stringify({ backup: backupInfo }, null, 2));
  if (backupOnly) {
    await client.close();
    return;
  }

  if (!topicArg) {
    console.error("Pass --topic=T1|T9|T10|T2|T3|T4|T5|T6|T7|T8");
    process.exit(1);
  }
  const result = await publishTopic(db, topicArg.toUpperCase());
  console.log(JSON.stringify(result, null, 2));
  await client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
