/**
 * FAQPage JSON-LD + grounded Q&A for keyword Phase 4 / Batch 2 categories & PDPs.
 * Answers reuse storePolicyCopy; do not invent fitment or GTINs.
 * CC-0004 intentionally omitted (securityHold).
 */
import {
  deliveryEtaSummary,
  getFaqItems,
  returnsFaqAnswer,
  standardDeliveryFeeStatement,
} from "../storePolicyCopy.js";

/** @param {{ question: string, answer: string }[]} items */
export function faqPageJsonLd(items) {
  const list = (items || []).filter((x) => x?.question && x?.answer);
  if (!list.length) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: list.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };
}

function policyByQuestion(...needles) {
  const faqs = getFaqItems();
  const hit = faqs.find((f) =>
    needles.some((n) => String(f.question || "").toLowerCase().includes(n))
  );
  return hit || null;
}

function sharedPolicyFaqs({ includeFitment = true, includeDeliveryTime = true } = {}) {
  const cod = policyByQuestion("cash on delivery");
  const fees = policyByQuestion("delivery charges");
  const returns = policyByQuestion("return or exchange");
  const fitment = policyByQuestion("fits my car");
  const eta = policyByQuestion("how long does delivery");
  const out = [];
  if (cod) out.push(cod);
  if (fees) out.push(fees);
  if (includeDeliveryTime && eta) out.push(eta);
  if (returns) out.push(returns);
  if (includeFitment && fitment) out.push(fitment);
  return out;
}

function fallbackShared() {
  return [
    {
      question: "Do you offer Cash on Delivery (COD) in Pakistan?",
      answer:
        "Yes. Cash on Delivery is available nationwide. For COD orders, pay delivery charges in advance after placing your order and send the payment screenshot on WhatsApp. The product amount is collected when your order arrives.",
    },
    {
      question: "How much are delivery charges?",
      answer: `${standardDeliveryFeeStatement()} Roof or trunk spoilers and Express (Daewoo) use a different courier rate shown at checkout.`,
    },
    {
      question: "How long does delivery take?",
      answer: `Most orders ship within 1–2 business days after payment confirmation (or COD delivery-charge confirmation). ${deliveryEtaSummary()}`,
    },
    {
      question: "What is your return or exchange policy?",
      answer: returnsFaqAnswer(),
    },
    {
      question: "How do I know if a part fits my car?",
      answer:
        "Open the product page and check vehicle fitment (make/model/years). You can also shop by car under Shop by Vehicle. If you are unsure, message us on WhatsApp with your car year and model.",
    },
  ];
}

function formatPkr(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return null;
  return `Rs. ${Math.round(num).toLocaleString("en-PK")}`;
}

/**
 * @typedef {{
 *   name: string,
 *   priceMode?: 'range' | 'fromMin' | 'rangeHighEnd',
 *   priceQuestion?: string,
 *   extras?: { question: string, answer: string }[],
 * }} CategoryFaqConfig
 */

/** @type {Record<string, CategoryFaqConfig>} */
const CATEGORY_FAQ_EXTRAS = {
  "universal-accessories": { name: "Universal Accessories" },
  "carbon-fiber-accessories": {
    name: "Carbon Fiber Accessories",
    extras: [
      {
        question: "Are these real carbon fiber parts?",
        answer:
          "Most items in this category are ABS plastic with a carbon-fiber-style texture, not woven carbon fiber. Product titles and descriptions state the material — check the product page before ordering.",
      },
    ],
  },
  "led-indicator-lights": { name: "LED Indicator Lights" },
  "interior-lights": { name: "Interior Lights" },
  "quarter-window-louvers": {
    name: "Quarter Window Louvers",
    extras: [
      {
        question: "Do I need to drill to install quarter window covers?",
        answer:
          "Many covers in this category are designed for OEM-style fit without body modification. Always follow the install notes on the specific product page; if you are unsure, WhatsApp us with your car year and model.",
      },
    ],
  },
  "side-mirror-covers": {
    name: "Side Mirror Covers",
    extras: [
      {
        question: "Do you have covers for newer Chinese-brand models like Deepal S05?",
        answer:
          "Yes — for example Deepal S05 Batman-style side mirror covers are listed when in stock. Open the product page for finish options and confirm fitment on the vehicle table, or browse Shop by Car for Deepal S05.",
      },
    ],
  },
  // Batch 2
  "led-headlights-bulbs": {
    name: "LED Headlights & Bulbs",
    priceMode: "fromMin",
    priceQuestion: "What do LED headlights and bulbs cost on CrazzyCars?",
  },
  "splitters-side-skirts": {
    name: "Splitters & Side Skirts",
    extras: [
      {
        question: "Why is delivery sometimes Rs. 500?",
        answer:
          "Delivery is Rs. 250 for regular items, or Rs. 500 when the order includes bulky items (splitters, side skirts, spoilers, floor mats, etc.). Shipping is paid in advance; the rest is Cash on Delivery where eligible.",
      },
    ],
  },
  "spoilers-diffusers": {
    name: "Spoilers & Diffusers",
    extras: [
      {
        question: "Are spoiler delivery fees different?",
        answer:
          "Roof or trunk spoilers use a special courier fee shown at checkout. Carts that include bulky items (including many spoilers) are charged Rs. 500 delivery instead of Rs. 250.",
      },
    ],
  },
  "sos-flasher-led-lights": { name: "SOS Flasher LED Lights" },
  "steering-wheel-covers": { name: "Steering Wheel Covers" },
  "door-handle-covers": { name: "Door Handle Covers" },
  "body-kits-extensions": {
    name: "Body Kits & Extensions",
    extras: [
      {
        question: "Can I use Cash on Delivery on a body kit?",
        answer:
          "No. Products whose name or URL identify them as a body kit cannot use Cash on Delivery. Pay the full order with JazzCash, Meezan, or bank transfer, then send your payment screenshot on WhatsApp. LED underbody light kits are not treated as body kits.",
      },
    ],
  },
  "backlights-tail-lamps": {
    name: "Backlights & Tail Lamps",
    priceMode: "rangeHighEnd",
  },
  "front-grilles": { name: "Front Grilles" },
  gadgets: { name: "Car Gadgets" },
};

/**
 * @param {string} slug
 * @param {{ min?: number|null, max?: number|null }} [range]
 */
export function buildCategoryKeywordFaqs(slug, range = {}) {
  const key = String(slug || "").trim();
  const cfg = CATEGORY_FAQ_EXTRAS[key];
  if (!cfg) return [];

  const shared = sharedPolicyFaqs();
  const items = shared.length ? [...shared] : fallbackShared();

  const minLabel = formatPkr(range.min);
  const maxLabel = formatPkr(range.max);
  const mode = cfg.priceMode || "range";

  if (mode === "fromMin" && minLabel) {
    items.push({
      question: cfg.priceQuestion || `What do ${cfg.name} cost on CrazzyCars?`,
      answer: `Prices on this category currently start from ${minLabel}. Full projector headlight assemblies are higher — always check the product card for the live price. Prices change with stock and deals.`,
    });
  } else if (mode === "rangeHighEnd" && minLabel && maxLabel) {
    items.push({
      question: `What price range do ${cfg.name} sell for on CrazzyCars?`,
      answer: `On this category, live prices currently range from ${minLabel} to ${maxLabel}. Full assemblies sit at the high end — always check the product card for the live price.`,
    });
  } else if (minLabel && maxLabel) {
    items.push({
      question: `What price range do ${cfg.name} sell for on CrazzyCars?`,
      answer: `On this category, live prices currently range from ${minLabel} to ${maxLabel}. Prices change with stock and deals — check the product card for the current price.`,
    });
  }

  for (const extra of cfg.extras || []) items.push(extra);
  return items;
}

export function isKeywordStrategyCategory(slug) {
  return Boolean(CATEGORY_FAQ_EXTRAS[String(slug || "").trim()]);
}

/** Product FAQs keyed by articleNo. CC-0004 intentionally omitted (securityHold). */
const PRODUCT_FAQ_BY_SKU = {
  "CC-UNI-EXT-BCC-RD": (ctx) => [
    {
      question: "Is this a universal fit?",
      answer:
        "Yes. This product is listed as universal fit for cars with exposed brake calipers. Confirm wheel and caliper clearance on your car before installing.",
    },
    {
      question: "What is the current price?",
      answer: ctx.priceLabel
        ? `The current sale price is shown on this page (${ctx.priceLabel}). Always use the live price on the product page.`
        : "The current sale price is shown on this page — always use the live price on the product page.",
    },
  ],
  "CC-0194": () => [
    {
      question: "How is it powered and mounted?",
      answer:
        "It is USB-powered with multiple gesture modes and mounts on the rear windshield with a suction-cup mount, per the product description.",
    },
    {
      question: "Will it fit my car model?",
      answer:
        "This is a universal rear-window accessory, not tied to a specific make/model. Check the product photos and description for mount style.",
    },
  ],
  "CC-0156": () => [
    {
      question: "Which cars does this fit?",
      answer:
        "Fitment is listed on this page for Toyota Corolla (2009–2014 and 2014–2026 rows), and also for Toyota Aqua, Vitz, and Yaris year rows shown in the vehicle compatibility table. Confirm your year against that table before ordering.",
    },
    {
      question: "Is it real carbon fiber?",
      answer:
        "No. It is an ABS texture emblem with a carbon-style finish that peels and sticks over the factory steering logo, per the product description.",
    },
  ],
  "CC-0157": () => [
    {
      question: "Which Corolla years does this fit?",
      answer:
        "Fitment on this page is Toyota Corolla 2014–2026 (see the vehicle compatibility table). The product title lists 2015–2026 — use the table on this page as the fitment source of truth.",
    },
    {
      question: "Is it real carbon fiber?",
      answer:
        "No. It is a carbon-style ABS steering trim (not real fiber), per the product description.",
    },
  ],
  "CC-0174": () => [
    {
      question: "Which Civic does this fit?",
      answer:
        "Honda Civic Rebirth / Civic 2012–2016 per the vehicle compatibility table on this page (often searched as Civic Rebirth).",
    },
    {
      question: "Do I need to modify the body?",
      answer:
        "The product description states OEM-style fit without body modification. Follow the listing notes; WhatsApp us if your year is unclear.",
    },
    {
      question: "Where can I see more Civic Rebirth parts?",
      answer:
        "Browse Shop by Car for Honda Civic Rebirth 2012–2016 accessories on this site.",
    },
  ],
  "CC-HON-INT-SMN-CF-1": () => [
    {
      question: "Which Honda models does this fit?",
      answer:
        "Fitment rows on this page include Honda City (2009–2020 and 2021–2026) and Honda Civic generations from 2006 through 2026 as listed in the vehicle compatibility table. Confirm your exact year on that table.",
    },
    {
      question: "How does it install?",
      answer:
        "It is a steering-center monogram emblem with a durable finish intended to cover the factory steering-wheel center logo (see product description).",
    },
  ],
  "CC-S05-MIR-BAT": () => [
    {
      question: "Which Deepal does this fit?",
      answer:
        "Deepal S05 (2024–present) per the vehicle compatibility table on this page.",
    },
    {
      question: "What finishes are available?",
      answer:
        "Carbon Fiber or Gloss Black options are listed on this product when available — select the option on the product page.",
    },
    {
      question: "Where can I see more Deepal S05 parts?",
      answer: "Browse Shop by Car for Deepal S05 (2024–present) on this site.",
    },
  ],
  "CC-COR-MIRROR-3": () => [
    {
      question: "Which Corolla years does this fit?",
      answer:
        "Toyota Corolla E170–E210 style fitment is listed as 2014–2026 on the vehicle compatibility table on this page. Confirm your year against that table.",
    },
    {
      question: "Is installation plug-and-play?",
      answer:
        "The product description states plug-and-play for this pair. If your mirror wiring differs, WhatsApp us with your year and trim before ordering.",
    },
  ],
  "CC-UNI-INT-GKN-TOY": () => [
    {
      question: "Is this truly universal?",
      answer:
        "The title says universal, but this listing also includes specific Honda and Toyota fitment rows in the vehicle compatibility table. Use that table as the source of truth for your car before ordering.",
    },
    {
      question: "How does the light activate?",
      answer:
        "It is described as a touch-activated crystal LED gear knob / shifter style upgrade — see the product description and images for the exact behavior.",
    },
  ],
  // Batch 2
  "CC-0104": () => [
    {
      question: "Is this a universal fit?",
      answer:
        "Yes. It is listed as a universal anti-rust door lock cover compatible with most cars. Check the product photos for the lock-pin style before ordering.",
    },
    {
      question: "What does it protect against?",
      answer:
        "Per the product description, the covers help cap lock pins against rust, dust, and damage and keep the lock area cleaner longer.",
    },
  ],
  "CC-0003": () => [
    {
      question: "Which Corolla years does this fit?",
      answer:
        "Toyota Corolla 2014–2026 per the vehicle compatibility table on this page (E170–E210 notes). Confirm your year on that table before ordering.",
    },
    {
      question: "Is it real carbon fiber?",
      answer:
        "No. It is a carbon-style ABS gear knob cover that peels and sticks over the factory knob, per the product description.",
    },
  ],
  "CC-0001": () => [
    {
      question: "Which Corolla years does this fit?",
      answer:
        "Toyota Corolla 2014–2026 per the vehicle compatibility table on this page. Confirm your year on that table before ordering.",
    },
    {
      question: "How many pieces are included?",
      answer:
        "This is a 4-piece set for interior door pull handles, per the product title and description.",
    },
  ],
  "CC-UNI-LGT-POL-4X4R": () => [
    {
      question: "Where does it mount?",
      answer:
        "It mounts on the front grill. Configurations such as 3x4, 4x4, and 6x4 are listed when available — check the options on this page.",
    },
    {
      question: "What colors and patterns does it have?",
      answer:
        "It is a red and blue emergency strobe with multiple flash patterns, per the product description.",
    },
  ],
  "CC-RAI-MIR-BAT": () => [
    {
      question: "Which Raize years does this fit?",
      answer:
        "The vehicle compatibility table on this page lists Toyota Raize from 2019. The product title mentions 2025 — use the table on this page as the fitment source of truth before ordering.",
    },
    {
      question: "What style is this?",
      answer:
        "Batman-style side mirror covers designed as an exterior upgrade for Raize, per the product description.",
    },
  ],
  "CC-UNI-LGT-RGB-APP": () => [
    {
      question: "How many pieces are in the kit?",
      answer:
        "It is a 4-piece RGB footwell atmosphere LED kit, per the product title and description.",
    },
    {
      question: "How do I control the colors?",
      answer:
        "The listing describes app or remote control, full color spectrum, and a music sync mode — see the product description for details.",
    },
  ],
  "CC-0008": () => [
    {
      question: "Which Corolla years does this fit?",
      answer:
        "The vehicle compatibility table on this page lists Toyota Corolla 2014–2026. The product title lists 2015–2024 — use the table on this page as the fitment source of truth.",
    },
    {
      question: "Is it real carbon fiber?",
      answer:
        "No. It is a carbon-style ABS gear shifter trim that sticks on without drilling, per the product description.",
    },
  ],
  "CC-0097": () => [
    {
      question: "Which Civic does this fit?",
      answer:
        "Honda Civic Reborn 2006–2012 per the vehicle compatibility table on this page (title also notes 2006–2011). Confirm your year on the table before ordering.",
    },
    {
      question: "How does it install?",
      answer:
        "It is described as a peel-and-stick ABS carbon-texture center console gear shift panel cover.",
    },
  ],
  "CC-0177": () => [
    {
      question: "Which Civic does this fit?",
      answer:
        "Honda Civic Reborn 2006–2012 per the vehicle compatibility table on this page.",
    },
    {
      question: "Do I need to modify the body?",
      answer:
        "The product description states an OEM-style fit that installs without modification. Follow the listing notes; WhatsApp us if your year is unclear.",
    },
  ],
  "CC-0203": () => [
    {
      question: "Is this a universal fit?",
      answer:
        "Yes. It is listed as a universal 3-piece Batman-style front bumper splitter (front lip kit only — not side skirts or a rear diffuser).",
    },
    {
      question: "Why might delivery be Rs. 500?",
      answer:
        "This item is flagged bulky. Delivery is Rs. 500 when the cart includes bulky items (splitters, side skirts, spoilers, floor mats, etc.), or Rs. 250 for regular-only carts.",
    },
  ],
  "CC-0204": () => [
    {
      question: "Is this a universal fit?",
      answer:
        "Yes. It is a universal cut-style rear bumper splitter / rear lip in ABS, per the product description.",
    },
    {
      question: "Why might delivery be Rs. 500?",
      answer:
        "This item is flagged bulky. Delivery is Rs. 500 when the cart includes bulky items, or Rs. 250 for regular-only carts.",
    },
  ],
  "CC-0112": () => [
    {
      question: "Which Civic does this fit?",
      answer:
        "Honda Civic X 2016–2021 per the vehicle compatibility table on this page.",
    },
    {
      question: "How many pieces are included?",
      answer:
        "This is a 3-piece carbon-texture gear shift lever/knob trim set, per the product title and description.",
    },
  ],
  "CC-0171": () => [
    {
      question: "Which Civic does this fit?",
      answer:
        "Honda Civic 11th Gen 2022–present per the vehicle compatibility table on this page.",
    },
    {
      question: "What material is it?",
      answer:
        "Carbon-style covers with an OEM-style fit for the rear quarters, per the product description (not woven carbon fiber unless a listing says otherwise).",
    },
  ],
  "CC-0113": () => [
    {
      question: "Which Civic does this fit?",
      answer:
        "Honda Civic X 2016–2021 per the vehicle compatibility table on this page.",
    },
    {
      question: "How does it install?",
      answer:
        "The listing describes an ABS carbon-texture cover that snaps over the existing knob without tools.",
    },
  ],
  "CC-0165": () => [
    {
      question: "Which Corolla does this fit?",
      answer:
        "Toyota Corolla E140 2009–2014 per the vehicle compatibility table on this page (not the later E170 generation). Confirm your chassis on that table before ordering.",
    },
    {
      question: "Is it a pair?",
      answer:
        "Yes. The listing is a pair of carbon-style side mirror covers, per the product title.",
    },
  ],
  "CC-UNI-EXT-BKT-BTM-GB-BTM": () => [
    {
      question: "Can I use Cash on Delivery on this body kit?",
      answer:
        "No. This is a body kit, so Cash on Delivery is not available. Pay the full order with JazzCash, Meezan, or bank transfer at checkout, then send your payment screenshot on WhatsApp. See our Cash on Delivery page for details.",
    },
    {
      question: "What is included in the kit?",
      answer:
        "The listing includes a front splitter, side skirts (pair), and back bumper lip — these three pieces only, per the product description.",
    },
    {
      question: "Why might delivery be Rs. 500?",
      answer:
        "Body kit / splitter packages are bulky. Delivery is Rs. 500 when the cart includes bulky items; the exact fee is shown at checkout.",
    },
  ],
  "CC-0154": () => [
    {
      question: "Which City years does this fit?",
      answer:
        "The vehicle compatibility table on this page lists Honda City 2021–present. The product title lists 2020–2026 — use the table on this page as the fitment source of truth.",
    },
    {
      question: "Is it real carbon fiber?",
      answer:
        "No. It is ABS plastic with a carbon-style finish (not fiber), per the product description.",
    },
  ],
  "CC-0020": () => [
    {
      question: "Is this a universal fit?",
      answer:
        "Yes. It is listed as a universal hand-stitched steering wheel cover for most wheels. Check the product photos for the stitch/cover style before ordering.",
    },
    {
      question: "What materials are used?",
      answer:
        "The listing describes glossy carbon-style sections with Alcantara/suede grip areas, hand-sewn, per the product description.",
    },
  ],
  "CC-EXT-201": () => [
    {
      question: "Is this a universal fit?",
      answer:
        "Yes. It is listed as a universal eyes-style spoiler kit with integrated running and brake LED lights (3 pieces), per the product title and description.",
    },
    {
      question: "Why might delivery be higher?",
      answer:
        "Spoilers often use a special courier fee shown at checkout, and bulky carts are charged Rs. 500 delivery. Check the fee at checkout before paying.",
    },
  ],
  "CC-0024": () => [
    {
      question: "Which Corolla does this fit?",
      answer:
        "The vehicle compatibility table on this page lists Toyota Corolla 2014–2026. The short description mentions Corolla Grande multimedia years — confirm your year and trim against the table (and product photos) before ordering.",
    },
    {
      question: "Is it real carbon fiber?",
      answer:
        "No. It is a carbon-style multimedia steering wheel trim, per the product description.",
    },
  ],
};

function liveProductPrice(product) {
  const sale = Number(product?.pricing?.salePrice);
  const regular = Number(product?.pricing?.regularPrice);
  if (Number.isFinite(sale) && sale > 0 && (!Number.isFinite(regular) || sale < regular)) {
    return sale;
  }
  if (Number.isFinite(regular) && regular > 0) return regular;
  return null;
}

/**
 * @param {object} product
 * @returns {{ question: string, answer: string }[]}
 */
export function buildProductKeywordFaqs(product) {
  const sku = String(product?.articleNo || "").trim();
  if (!sku || sku === "CC-0004") return [];
  const builder = PRODUCT_FAQ_BY_SKU[sku];
  if (!builder) return [];

  const shared = sharedPolicyFaqs({ includeFitment: false, includeDeliveryTime: false });
  const base = shared.length
    ? shared.filter((f) => /cash on delivery|return or exchange/i.test(f.question))
    : fallbackShared().filter((f) => /cash on delivery|return or exchange/i.test(f.question));

  const priceLabel = formatPkr(liveProductPrice(product));
  return [...base, ...builder({ priceLabel, product })];
}

export function hasProductKeywordFaqs(articleNo) {
  const sku = String(articleNo || "").trim();
  return Boolean(sku && sku !== "CC-0004" && PRODUCT_FAQ_BY_SKU[sku]);
}
