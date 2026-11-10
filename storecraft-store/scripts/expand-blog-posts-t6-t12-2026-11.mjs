/**
 * Expand T6 / T7 blog posts to 700+ words + structured FAQ (post.faq → FaqSection).
 *
 *   cd storecraft-store
 *   node --env-file=.env.local scripts/expand-blog-posts-t6-t12-2026-11.mjs
 *   node --env-file=.env.local scripts/expand-blog-posts-t6-t12-2026-11.mjs --apply
 *
 * Default is DRY RUN — prints proposed $set payloads only. --apply writes Mongo (GO required).
 */
import mongoose from "mongoose";
import BlogPost from "../lib/models/BlogPost.model.js";
import { STORE_CONTACT, STORE_POLICY } from "../config/store-policy.js";

const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
const APPLY = process.argv.includes("--apply");
const SLUGS = [
  "dashboard-mats-pakistan-sun-glare-buying-guide",
  "car-air-press-window-visors-fitment-pakistan",
];

const WHATSAPP = STORE_CONTACT.whatsapp;
const STANDARD_FEE = Number(STORE_POLICY.shipping.standardFeePKR).toLocaleString("en-PK");
const BULKY_FEE = Number(STORE_POLICY.shipping.bulkyFeePKR || 500).toLocaleString("en-PK");
const LAHORE_ETA = `${STORE_POLICY.shipping.cityETAs.lahore.minDays}–${STORE_POLICY.shipping.cityETAs.lahore.maxDays}`;
const RETURNS_DAYS = STORE_POLICY.returns.windowDays;

function a(href, text) {
  return `<a href="${href}">${text}</a>`;
}

function visibleWords(html) {
  return String(html || "")
    .replace(/<[^>]*>/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
}

const DASHBOARD_MATS = {
  content: `
<p>In Pakistani summers the dashboard becomes a mirror: sun pours through the windscreen, bare plastic reflects into your eyes, and anything you leave on the dash slides toward the passenger footwell on the first sharp turn. A <strong>vehicle-specific dashboard mat</strong> is one of the quiet interior upgrades that actually changes daily comfort — but only when the defrost vents, speaker grilles, and centre cutouts match your exact generation.</p>

<h2>Why glare is worse than “just bright”</h2>
<p>High sun angles on motorways, unfinished road glare, and heat-soaked dashboards make it harder to read gauges and navigation at exactly the moment traffic gets messy. Floor mats protect carpet from mud; sun shades block a slice of windshield heat at parking time. A dash mat sits on the top moulding to <strong>kill reflections</strong> and give phones and toll cards a grippy home. It does not replace tint or shades — it complements them.</p>

<h2>Vehicle-specific beats universal every time</h2>
<p>Our ${a("/categories/dashboard-mats", "Dashboard Mats")} shelf is organised around make, model, and year bands, not one-size-fits-all rectangles. Universal mats often cover a centre speaker, block a defrost vent, or bunch up against the base of the windscreen — which is both annoying and unsafe. Before you tap Cash on Delivery, open the product page and read the <strong>vehicle compatibility table</strong>. Example listing: ${a("/toyota-corolla-2014-2026-velvet-dashboard-mat", "Corolla 2014–2026 velvet dashboard mat")}.</p>
<p>A common mistake is assuming a “Corolla mat” from an older listing will stretch to a facelift. Generations change vent layout, audio trim, and even HUD openings. If your year sits outside the table, message us on WhatsApp <strong>${WHATSAPP}</strong> with a dashboard photo instead of guessing.</p>

<h2>What to check on the product page</h2>
<ol>
<li><strong>Year range</strong> — Table wins over SEO title wording if they disagree.</li>
<li><strong>Cutouts</strong> — Photos should show speaker and vent holes where your car has them.</li>
<li><strong>Material</strong> — Most CrazzyCars velvet dash mats are anti-slip fabric, not rigid hard plastic. Follow thickness notes on the listing.</li>
<li><strong>Fitment vs floor mats</strong> — Confusing dash mats with ${a("/categories/floor-mats", "floor mats")} is how wrong parcels get opened. For monsoon footwell protection see ${a("/blogs/best-floor-mats-pakistani-weather-guide", "our floor mat weather guide")}; for parked heat habits see ${a("/blogs/protect-car-interior-from-pakistan-heat", "interior heat protection")}.</li>
</ol>

<h2>Install and daily use</h2>
<p>Clean the dash of dust and silicone dressings before laying the mat flat. Press around vents so the fabric seats — do not force a mat that fights a cutout. Velvet-style mats can be lifted, shaken out, and wiped; avoid soaking electronics near vents. If a corner lifts in extreme cabin heat, a day in the shade usually lets it settle; persistent lift usually means wrong generation, not “bad glue.”</p>

<h2>Ordering, delivery, and COD</h2>
<p>Eligible items support Cash on Delivery with a booking advance by order value (see ${a("/cash-on-delivery", "Cash on Delivery")}). Standard delivery is <strong>Rs ${STANDARD_FEE}</strong> on regular-sized carts; items classified bulky ship at <strong>Rs ${BULKY_FEE}</strong> minimum — dash mats are typically standard size unless bundled with bulky kits. Lahore deliveries are often confirmed in <strong>${LAHORE_ETA} business days</strong> after dispatch; for other cities the courier timeline is confirmed at checkout rather than guessed. Full wording lives in our ${a("/shipping-policy", "shipping policy")}.</p>
<p>We dispatch from Gujranwala; keep your WhatsApp active after ordering so the courier and our team can reach you for address confirmation on COD bookings.</p>

<h2>Returns and wrong-item checks</h2>
<p>Vehicle-specific mats are precision-cut. We accept returns within <strong>${RETURNS_DAYS} days</strong> for defective items or wrong-item shipments as described in our ${a("/returns-policy", "returns policy")}. Change-of-mind returns on trim pieces are not offered — double-check years <em>before</em> booking COD. Photograph the dashboard and compatibility table if you need a second opinion; that minute saves a week of back-and-forth.</p>

<h2>Quick shopping path</h2>
<p>Start in ${a("/categories/dashboard-mats", "Dashboard Mats")}, filter by your car under ${a("/cars", "Shop by Vehicle")}, then compare two listings in the same generation if colours differ. Add the link to your WhatsApp message so support sees the exact SKU. When the mat arrives, dry-fit on the driveway before removing packaging completely so vent alignment is obvious in daylight.</p>

<h2>Common myths we hear on WhatsApp</h2>
<p>“Any black mat will do” — only until it blocks a defrost vent in fog season. “Thicker is always better” — extreme thickness can lift at the windscreen base on curved dashes. “Dash mats fix cracking” — they reduce UV exposure slightly but do not repair structural dash shrinkage on very old cars. Treat a mat as comfort and glare control, not a restoration cure. When unsure between two year bands, send interior photos rather than ordering both on COD.</p>
`.trim(),
  faq: [
    {
      question: "Are dashboard mats on CrazzyCars universal?",
      answer:
        "No. Listings in the Dashboard Mats category are vehicle-specific. Confirm make, model, and years on the product compatibility table before ordering.",
    },
    {
      question: "Will a 2012 Corolla dash mat fit a 2018 Corolla?",
      answer:
        "Usually not — different generations change vent and speaker layout. Use the table on the listing for your exact year band instead of reusing an older order.",
    },
    {
      question: "Does a dash mat replace window tint or sun shades?",
      answer:
        "No. It cuts dashboard glare and stops items sliding; tint and sun shades address different heat and privacy needs.",
    },
    {
      question: "How much is delivery on a dashboard mat order?",
      answer: `Standard delivery is Rs ${STANDARD_FEE} for regular-sized carts. If your order includes bulky items, the minimum delivery fee is Rs ${BULKY_FEE}. Fees are shown at checkout.`,
    },
    {
      question: "How do I confirm fitment before Cash on Delivery?",
      answer: `Match your year to the vehicle compatibility table on the product page. If you are between facelifts, WhatsApp ${WHATSAPP} with a clear dashboard photo and the product link.`,
    },
    {
      question: "What if the cutouts do not line up?",
      answer: `Contact us within ${RETURNS_DAYS} days with order photos if the item is defective or not as described. Wrong generation orders are not eligible for change-of-mind returns — verify years first.`,
    },
  ],
};

const AIR_PRESS = {
  content: `
<p><strong>Air press</strong> kits — window visors or rain deflectors — let you crack the glass in light rain without water dripping onto the seat, and they calm side-window turbulence on motorways. In Pakistan they are popular from Lahore commutes to long GT Road runs. On CrazzyCars they live under ${a("/categories/air-press", "Air Press")} as <strong>vehicle-specific</strong> door-frame kits, not universal stick-on strips that peel after one monsoon.</p>

<h2>Why “universal” air press fails</h2>
<p>Door frames differ in curve, chrome line, and clip pockets between Corolla generations, Civic facelifts, and City body shells. A universal visor set might look fine in product photos but leave gaps at the A-pillar, vibrate at 80 km/h, or foul the seal when you roll the glass fully up. Model-specific kits are moulded for one frame family so the chrome strip (where included) follows the OEM line.</p>

<h2>Read the compatibility table, not just the title</h2>
<p>Marketing titles sometimes compress year ranges for SEO; the <strong>vehicle compatibility table on the product page is the fitment source of truth</strong>. Current shelf examples:</p>
<ul>
<li>${a("/toyota-corolla-2008-2013-premium-air-press-with-chrome-strip", "Toyota Corolla E140 premium air press")} — table typically shows <strong>2009–2014</strong> even when the title says 2008–2013.</li>
<li>${a("/honda-civic-2016-2021-premium-air-press-with-chrome-strip", "Honda Civic X premium air press")} — table: <strong>2016–2021</strong>.</li>
<li>${a("/honda-city-2021-2026-txr-air-press-with-chrome", "Honda City TXR-style air press")} — table: <strong>2021–2026</strong>.</li>
</ul>
<p>If your car year is missing from the table, do not assume a neighbour’s install will transfer — message WhatsApp <strong>${WHATSAPP}</strong> with the product link and a side profile photo of the door frame.</p>

<h2>Install expectations</h2>
<p>Most premium kits are designed for OEM-style clip or tape channels along the door frame — drilling is uncommon when the kit matches the generation. Read the listing notes for chrome vs smoke variants, left/right piece count, and whether rear doors are included. Dry-fit each piece before removing adhesive backing; alignment at the front edge determines water deflection. Install in shade so tape reaches full bond before the first car wash.</p>
<p>After monsoon season, check that drain channels are clear of mud so water routes over the visor lip instead of inside the seal. A vibrating front piece usually means wrong generation or incomplete seating at the clip point, not “highway wind only.”</p>

<h2>Daily use in Pakistani weather</h2>
<p>During dust season, cracked windows with visors reduce cabin temperature creep without inviting grit the way a fully open window would. They are not a substitute for careful parking or interior shades, but they make light-rain ventilation practical when you are waiting outside schools or offices. Chrome-trim variants are cosmetic; the mechanical value is still rain deflection and side-window buffet reduction.</p>

<h2>Pairing with other exterior parts</h2>
<p>Air press sits beside mirror covers, door visors, and body kits in many build lists, but fitment is independent — always verify each SKU. Browse ${a("/categories/air-press", "Air Press")} for your generation, then cross-check related exterior categories from the product page links. For a wider exterior shopping path, use ${a("/cars", "Shop by Vehicle")} so incompatible years are filtered early.</p>

<h2>Ordering, COD, and delivery</h2>
<p>Cash on Delivery is available on eligible items with a booking advance tiered by order value (see ${a("/cash-on-delivery", "Cash on Delivery")}). Delivery is <strong>Rs ${STANDARD_FEE}</strong> on standard carts and <strong>Rs ${BULKY_FEE}</strong> minimum when the order includes bulky lines — air press sets are usually standard size. Lahore customers often see <strong>${LAHORE_ETA} business days</strong> after dispatch; other cities receive a confirmed timeline at checkout per our ${a("/shipping-policy", "shipping policy")}. Keep your phone reachable for courier coordination.</p>

<h2>If something arrives wrong</h2>
<p>Report defects or wrong-item shipments within <strong>${RETURNS_DAYS} days</strong> with photos, as outlined in our ${a("/returns-policy", "returns policy")}. Because kits are generation-specific, ordering the wrong year band is not a change-of-mind return — re-read the table before confirming COD. When in doubt, WhatsApp before payment rather than after delivery.</p>

<h2>Maintenance after a Punjab monsoon</h2>
<p>Road spray packs mud into window channels after heavy rain. Before highway trips, roll each window down partially and wipe the upper seal so grit does not score the glass. Check that visor clips are still seated — vibration usually traces to a clip that never fully clicked on day one. Avoid pressure-washing directly along the visor lip at close range; rinse from above and dry the chrome strip so adhesive channels are not flooded. A quick annual re-check after monsoon season costs five minutes and prevents the slow peel that makes buyers think “air press never works.”</p>

<h2>Choosing chrome vs smoke styling</h2>
<p>Chrome-trim listings match factory bright window lines on many Corolla and City trims; smoke-tint visors look lower-profile on darker paint. Styling does not change rain performance if the moulding is correct — pick based on paint colour and personal taste, not on which photo looked louder in the marketplace. When comparing two listings for the same years, verify piece count (front only vs full set) before assuming the cheaper line is the same kit.</p>
`.trim(),
  faq: [
    {
      question: "Will this air press fit my car?",
      answer:
        "Only if your make, model, and years appear on that product’s vehicle compatibility table. Titles are hints; the table decides fitment.",
    },
    {
      question: "Do I need to drill the door frame?",
      answer:
        "Most CrazzyCars premium kits are designed for OEM-style clip or tape fitment on the matching generation. Follow the listing — drilling is unusual when the kit is correct.",
    },
    {
      question: "Are air press kits universal?",
      answer:
        "No. Kits in the Air Press category are vehicle-specific mouldings for named year bands.",
    },
    {
      question: "Why does the title year range differ from the table?",
      answer:
        "SEO titles sometimes compress years. Always trust the compatibility table on the product page when ordering.",
    },
    {
      question: "How much is shipping for an air press set?",
      answer: `Standard delivery is Rs ${STANDARD_FEE}. Orders containing bulky items use a Rs ${BULKY_FEE} minimum delivery fee. Checkout shows the fee for your cart.`,
    },
    {
      question: "How can I confirm fitment before COD?",
      answer: `Send your car year and a door-frame photo to WhatsApp ${WHATSAPP} with the product link. Match the compatibility table before booking Cash on Delivery.`,
    },
  ],
};

const PROPOSED = {
  "dashboard-mats-pakistan-sun-glare-buying-guide": DASHBOARD_MATS,
  "car-air-press-window-visors-fitment-pakistan": AIR_PRESS,
};

if (!uri) {
  console.error("Missing MONGODB_URI / MONGO_URI");
  process.exit(1);
}

for (const slug of SLUGS) {
  const patch = PROPOSED[slug];
  const wc = visibleWords(patch.content);
  if (wc < 700) {
    console.error(`${slug}: content is ${wc} visible words (need ≥700)`);
    process.exit(1);
  }
}

await mongoose.connect(uri);

for (const slug of SLUGS) {
  const patch = PROPOSED[slug];
  const existing = await BlogPost.findOne({ slug }).select("slug title status content faq").lean();
  if (!existing) {
    console.warn(`SKIP — no BlogPost found for slug=${slug}`);
    continue;
  }

  const payload = {
    content: patch.content,
    faq: patch.faq,
    contentUpdatedAt: new Date(),
    readTime: Math.max(5, Math.ceil(visibleWords(patch.content) / 200)),
  };

  console.log("\n===", slug, "===");
  console.log("status:", existing.status);
  console.log("current visible words:", visibleWords(existing.content));
  console.log("proposed visible words:", visibleWords(payload.content));
  console.log("faq items:", payload.faq.length);
  console.log("\nProposed $set document:");
  console.log(JSON.stringify({ slug, $set: payload }, null, 2));

  if (APPLY) {
    await BlogPost.updateOne({ slug }, { $set: payload });
    console.log("APPLIED");
  } else {
    console.log("DRY RUN — no write. Re-run with --apply after GO.");
  }
}

await mongoose.disconnect();
console.log("\nDone.");
