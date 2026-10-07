/**
 * FAQPage JSON-LD + grounded Q&A for keyword Phase 4 / Batches 1–4 (+ Batch F PDPs).
 * Answers reuse storePolicyCopy; do not invent fitment or GTINs.
 * CC-0004 / CC-EXT-107 intentionally omitted (securityHold / listing integrity).
 * Parents exterior / interior / led-lighting / carbon-fiber stay out (cannibalization).
 * Category expansion closed after Batch 4 (29/30 non-parent leaves with SKUs).
 */
import { STORE_POLICY } from "../../config/store-policy.js";
import {
  deliveryEtaSummary,
  formatPkrAmount,
  getFaqItems,
  returnsFaqAnswer,
  standardDeliveryFeeStatement,
} from "../storePolicyCopy.js";

function feeAmounts() {
  return {
    regular: formatPkrAmount(STORE_POLICY.shipping.standardFeePKR),
    bulky: formatPkrAmount(STORE_POLICY.shipping.bulkyFeePKR || 500),
  };
}

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
        "Yes. Cash on Delivery is available nationwide. For COD orders, pay a small booking advance (from Rs. 250, or more if the product requires a % advance) after placing your order and send the screenshot on WhatsApp. It is deducted from your total and refunded if the item doesn't fit. The balance is collected on delivery.",
    },
    {
      question: "How much are delivery charges?",
      answer: `${standardDeliveryFeeStatement()} Roof or trunk spoilers and Express (Daewoo) use a different courier rate shown at checkout.`,
    },
    {
      question: "How long does delivery take?",
      answer: `Most orders ship within 1–2 business days after payment confirmation (or COD booking confirmation). ${deliveryEtaSummary()}`,
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
 *   priceMode?: 'range' | 'fromMin' | 'rangeHighEnd' | 'flat',
 *   priceQuestion?: string,
 *   priceFromMinClause?: string,
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
        question: "Why is delivery sometimes higher for bulky items?",
        answer: standardDeliveryFeeStatement(),
      },
    ],
  },
  "spoilers-diffusers": {
    name: "Spoilers & Diffusers",
    extras: [
      {
        question: "Are spoiler delivery fees different?",
        answer: (() => {
          const { regular, bulky } = feeAmounts();
          return `Roof or trunk spoilers use a special courier fee shown at checkout. Carts that include bulky items (including many spoilers) are charged ${bulky} delivery instead of ${regular}.`;
        })(),
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
  // Batch 3 (A4–A10; hubs exterior/interior/led-lighting intentionally omitted)
  "key-covers-key-chains": {
    name: "Key Covers & Key Chains",
    extras: [
      {
        question: "How do I pick the right key cover?",
        answer:
          "Match your key’s brand and button layout to the product title and photos (for example 3-button vs 4-button Civic covers). If unsure, WhatsApp a clear photo of your key.",
      },
    ],
  },
  "floor-mats": {
    name: "Floor Mats",
    extras: [
      {
        question: "Why is delivery often higher for mats?",
        answer: (() => {
          const { regular, bulky } = feeAmounts();
          return `Floor mats are treated as bulky. Delivery is ${bulky} when the cart includes bulky items, or ${regular} for regular-only carts. Shipping is paid in advance; the rest is Cash on Delivery where eligible.`;
        })(),
      },
    ],
  },
  "dashboard-mats": {
    name: "Dashboard Mats",
    priceMode: "flat",
    priceQuestion: "What do dashboard mats cost on CrazzyCars?",
    extras: [
      {
        question: "Are these universal?",
        answer:
          "No. These are vehicle-specific dashboard mats. Open the product page and confirm your car’s make, model, and years before ordering.",
      },
    ],
  },
  "fog-lamps-drl-covers": { name: "Fog Lamps & DRL Covers" },
  "multimedia-steering-controls": {
    name: "Multimedia Steering Controls",
    extras: [
      {
        question: "Do these need professional install?",
        answer:
          "Many kits include a spiral/clock-spring cable and wire into the steering column. Follow the listing notes; if you are unsure about wiring, use a trusted installer or WhatsApp us with your car year and model.",
      },
    ],
  },
  "air-freshener-decoration": {
    name: "Air Fresheners & Decor",
    priceQuestion: "What price range do air fresheners and décor sell for on CrazzyCars?",
  },
  "fender-light": {
    name: "Fender Light",
    priceQuestion: "What do fender lights cost on CrazzyCars?",
  },
  // Batch 4 — last leaf-category expansion round (parents still excluded)
  "emergency-safety": {
    name: "Emergency & Safety",
    extras: [
      {
        question: 'What counts as “emergency & safety” here?',
        answer:
          "This leaf currently lists portable power (for example a multi-port fast car charger) and emergency inflation tools (air compressors). Open each product for what’s in the box.",
      },
      {
        question: "Why do some items also appear under Universal Accessories?",
        answer:
          "A few SKUs are dual-categorized. Use this page when you are browsing chargers and compressors; always confirm the product title and photos before ordering.",
      },
    ],
  },
  "hanging-perfumes": {
    name: "Hanging Perfumes",
    priceQuestion: "What price range do hanging car perfumes sell for on CrazzyCars?",
    extras: [
      {
        question: "Are these vehicle-specific?",
        answer:
          "No. Hanging perfumes and fragrance cards here are universal cabin accessories unless a listing says otherwise.",
      },
      {
        question: "How is this different from Air Fresheners & Decor?",
        answer:
          "This leaf is hanging-only. Dashboard ornaments and other décor live under Air Fresheners & Decor — check the product type on each listing.",
      },
    ],
  },
  utility: {
    name: "Utility",
    priceQuestion: "What price range do Utility tools sell for on CrazzyCars?",
    extras: [
      {
        question: "What is listed in Utility right now?",
        answer:
          "This category currently lists portable air-compressor kits for tyre inflation. Confirm voltage, hose, and whether a carry case is included on the product page.",
      },
    ],
  },
  "air-press": {
    name: "Air Press / Window Visors",
    priceQuestion: "What price range do air press / window visors sell for on CrazzyCars?",
    extras: [
      {
        question: "Will this fit my car?",
        answer:
          "These are vehicle-specific. Open the product and check the vehicle compatibility table (make/model/years) before ordering — titles can be narrower or broader than the table.",
      },
      {
        question: "Do I need to drill?",
        answer:
          "Most air-press / visor kits are designed for OEM-style door-frame fit. Follow the listing install notes; WhatsApp us with your year if unsure.",
      },
    ],
  },
  "exhaust-systems-tips": {
    name: "Exhaust Tips & Systems",
    priceMode: "fromMin",
    priceQuestion: "What do exhaust tips and systems cost on CrazzyCars?",
    priceFromMinClause: "Full cut-off kits are higher",
    extras: [
      {
        question: "Do tip-only upgrades change performance?",
        answer:
          "Tip-only accessories are mainly for look and sound character. They do not replace a full exhaust system — read the product description for what is included.",
      },
    ],
  },
  "car-care-cleaning": {
    name: "Car Care & Cleaning",
    priceQuestion: "What price range do Car Care & Cleaning products sell for on CrazzyCars?",
    extras: [
      {
        question: "What is listed here right now?",
        answer:
          "This category currently includes microfiber towels and a universal steering-wheel cover. Open each product for size, material, and use notes — the shelf is small and changes with stock.",
      },
      {
        question: "Are these vehicle-specific?",
        answer:
          "The products currently listed here are universal. Follow the label and install notes on the product page.",
      },
    ],
  },
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
    const fromMinClause =
      cfg.priceFromMinClause || "Full projector headlight assemblies are higher";
    items.push({
      question: cfg.priceQuestion || `What do ${cfg.name} cost on CrazzyCars?`,
      answer: `Prices on this category currently start from ${minLabel}. ${fromMinClause} — always check the product card for the live price. Prices change with stock and deals.`,
    });
  } else if (mode === "flat" && minLabel) {
    items.push({
      question: cfg.priceQuestion || `What do ${cfg.name} cost on CrazzyCars?`,
      answer: `On this category, live prices are currently ${minLabel} per mat. Prices change with stock and deals — check the product card for the current price.`,
    });
  } else if (mode === "rangeHighEnd" && minLabel && maxLabel) {
    items.push({
      question: cfg.priceQuestion || `What price range do ${cfg.name} sell for on CrazzyCars?`,
      answer: `On this category, live prices currently range from ${minLabel} to ${maxLabel}. Full assemblies sit at the high end — always check the product card for the live price.`,
    });
  } else if (minLabel && maxLabel) {
    items.push({
      question: cfg.priceQuestion || `What price range do ${cfg.name} sell for on CrazzyCars?`,
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
  "CC-0203": () => {
    const { regular, bulky } = feeAmounts();
    return [
      {
        question: "Is this a universal fit?",
        answer:
          "Yes. It is listed as a universal 3-piece Batman-style front bumper splitter (front lip kit only — not side skirts or a rear diffuser).",
      },
      {
        question: "Why might delivery be higher for this item?",
        answer: `This item is flagged bulky. Delivery is ${bulky} when the cart includes bulky items (splitters, side skirts, spoilers, floor mats, etc.), or ${regular} for regular-only carts.`,
      },
    ];
  },
  "CC-0204": () => {
    const { regular, bulky } = feeAmounts();
    return [
      {
        question: "Is this a universal fit?",
        answer:
          "Yes. It is a universal cut-style rear bumper splitter / rear lip in ABS, per the product description.",
      },
      {
        question: "Why might delivery be higher for this item?",
        answer: `This item is flagged bulky. Delivery is ${bulky} when the cart includes bulky items, or ${regular} for regular-only carts.`,
      },
    ];
  },
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
  "CC-UNI-EXT-BKT-BTM-GB-BTM": () => {
    const { bulky } = feeAmounts();
    return [
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
        question: "Why might delivery be higher for this item?",
        answer: `Body kit / splitter packages are bulky. Delivery is ${bulky} when the cart includes bulky items; the exact fee is shown at checkout.`,
      },
    ];
  },
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
  "CC-EXT-201": () => {
    const { bulky } = feeAmounts();
    return [
      {
        question: "Is this a universal fit?",
        answer:
          "Yes. It is listed as a universal eyes-style spoiler kit with integrated running and brake LED lights (3 pieces), per the product title and description.",
      },
      {
        question: "Why might delivery be higher?",
        answer: `Spoilers often use a special courier fee shown at checkout, and bulky carts are charged ${bulky} delivery. Check the fee at checkout before paying.`,
      },
    ];
  },
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
  // Batch 3 B1–B20
  "CC-0207": () => [
    {
      question: "Is this a universal fit?",
      answer:
        "Yes. It is listed as a universal SOS / police-style red-blue LED strip strobe. Check mount style and power notes on this page before ordering.",
    },
    {
      question: "Is it the same as the grill 4×4 police light?",
      answer:
        "No. This is a strip-style strobe. The grill 4×4 police light is a different product — compare photos and titles before checkout.",
    },
  ],
  "CC-0095": () => [
    {
      question: "Which Civic does this fit?",
      answer:
        "The vehicle compatibility table on this page lists Honda Civic Reborn 2006–2012. The product title lists 2007–2012 — use the table on this page as the fitment source of truth.",
    },
    {
      question: "Is it real carbon fiber?",
      answer:
        "No. It is a forged carbon-texture ABS overlay for the hand brake, per the product description. Snap-on; no tools required.",
    },
  ],
  "CC-0144": () => [
    {
      question: "Is this a universal fit?",
      answer:
        "Yes. It is listed as a universal heads-up display that projects speed and driving data. Check the listing for power/OBD notes before ordering.",
    },
    {
      question: "Does it need professional install?",
      answer:
        "Most HUDs are DIY plug-in devices. Follow the product instructions; WhatsApp us if your car’s power setup is unclear.",
    },
  ],
  "CC-0202": () => [
    {
      question: "Which Civic does this fit?",
      answer: "Honda Civic X 2016–2021 per the vehicle compatibility table on this page.",
    },
    {
      question: "How does it install?",
      answer:
        "The listing describes clip-on ABS Batman-style covers with no tools or body modifications. Follow the product photos and notes.",
    },
  ],
  "CC-UNI-LGT-IND-W40": () => [
    {
      question: "Is this a universal fit?",
      answer:
        "Yes. These are listed as universal bright LED indicator bulbs (2 pcs). Confirm the bulb base/socket on your car against the listing before ordering.",
    },
    {
      question: "Will they work as a drop-in halogen replacement?",
      answer:
        "They are sold as brighter, faster LED turn-signal bulbs versus halogen. Socket compatibility still depends on your car — check the product notes or WhatsApp a bulb photo.",
    },
  ],
  "CC-UNI-AMB-DYN-10": () => [
    {
      question: "Is this a universal fit?",
      answer:
        "Yes. It is listed as a multi-point dynamic ambient interior light kit for cars. Check the listing for included points and controller notes.",
    },
    {
      question: "Does install require removing trim?",
      answer:
        "Ambient kits usually need routing wires and placing strips behind or along trim. Follow the product guide; use a trusted installer if you are not comfortable with interior trim work.",
    },
  ],
  "CC-0206": () => [
    {
      question: "Is this a universal fit?",
      answer:
        "Yes. It is a simple universal rear bumper lip in gloss black ABS — a single rear lip, not a full body kit, per the product description.",
    },
    {
      question: "Why might delivery be higher?",
      answer:
        "Splitters and lips are often flagged bulky. Delivery follows the store bulky fee when the cart includes bulky items; the exact fee is shown at checkout.",
    },
  ],
  "CC-0178": () => [
    {
      question: "Which Civic does this fit?",
      answer: "Honda Civic Reborn 2006–2012 per the vehicle compatibility table on this page.",
    },
    {
      question: "Is it real carbon fiber?",
      answer:
        "No. It is ABS plastic with a carbon-style texture, per the product description. OEM-style fit without modification.",
    },
  ],
  "CC-0007": () => [
    {
      question: "Which Corolla does this fit?",
      answer:
        "The vehicle compatibility table on this page lists Toyota Corolla 2014–2026 (E170 generation). The product title lists 2015–2023 — use the table on this page as the fitment source of truth.",
    },
    {
      question: "Is it real carbon fiber?",
      answer:
        "No. It is a 4-piece carbon-style ABS power-window switch trim set with peel-and-stick install, per the product description.",
    },
  ],
  "CC-0147": () => [
    {
      question: "Which Corolla does this fit?",
      answer:
        "The vehicle compatibility table on this page lists Toyota Corolla E140 2009–2014. The product title lists 2008–2013 — use the table on this page as the fitment source of truth before ordering.",
    },
    {
      question: "What functions are included?",
      answer:
        "The listing is a 3-in-1 LED rear bumper reflector set: brake + DRL + turn signal, described as plug-and-play OEM-style replacement.",
    },
  ],
  "CC-OX7-MIR-BAT": () => [
    {
      question: "Which Oshan X7 does this fit?",
      answer:
        "Changan Oshan X7 from 2022–present per the vehicle compatibility table on this page.",
    },
    {
      question: "What finishes are available?",
      answer:
        "The listing offers carbon-style or gloss black Batman-style covers. Confirm the finish option on this page before ordering.",
    },
  ],
  "CC-0169": () => [
    {
      question: "Which Civic does this fit?",
      answer: "Honda Civic 11th Gen 2022–present per the vehicle compatibility table on this page.",
    },
    {
      question: "Is delivery different for spoilers?",
      answer:
        "Roof or trunk spoilers often use a special courier fee shown at checkout, and bulky carts use the bulky delivery rate. Check the fee at checkout before paying.",
    },
  ],
  "CC-0108": () => [
    {
      question: "Which Civic does this fit?",
      answer: "Honda Civic X 2016–2021 per the vehicle compatibility table on this page.",
    },
    {
      question: "Is it real carbon fiber?",
      answer:
        "No. It is a 4-piece carbon-texture ABS interior door-panel trim set with adhesive backing, per the product description.",
    },
  ],
  "CC-0209": () => [
    {
      question: "Is this a universal fit?",
      answer:
        "Yes. It is listed as a universal dynamic RGB LED underbody kit with remote control (color, breathing, strobe, and static modes).",
    },
    {
      question: "Is it waterproof?",
      answer:
        "The listing describes waterproof strips for underbody use. Follow the product install notes for cable routing and ground clearance.",
    },
  ],
  "CC-0118": () => [
    {
      question: "Which Toyota does this fit?",
      answer:
        "The vehicle compatibility table on this page lists Toyota Yaris 2020–present and also Toyota Yaris Cross 2020–present. The product title is written for Yaris 2020–2026 — use the table (and product photos) as the fitment source of truth; WhatsApp us if you drive a Yaris Cross and need confirmation.",
    },
    {
      question: "Is this a full body kit?",
      answer:
        "No. It is a single ABS trunk lip spoiler, not a full body kit, per the product description.",
    },
  ],
  "CC-0146": () => [
    {
      question: "Which Corolla does this fit?",
      answer:
        "The vehicle compatibility table on this page lists Toyota Corolla E170 2014–2026. The product title lists 2014–2020 — use the table on this page as the fitment source of truth.",
    },
    {
      question: "What functions are included?",
      answer:
        "The listing is a 3-in-1 LED rear bumper reflector set: brake + DRL + turn signal, described as plug-and-play stock reflector replacement.",
    },
  ],
  "CC-0088": () => [
    {
      question: "Can I use Cash on Delivery on this body kit?",
      answer:
        "No. This is a body kit, so Cash on Delivery is not available. Pay the full order with JazzCash, Meezan, or bank transfer at checkout, then send your payment screenshot on WhatsApp. See our Cash on Delivery page for details.",
    },
    {
      question: "Which City years does this fit?",
      answer:
        "The vehicle compatibility table on this page lists Honda City 2021–present. The product title lists 2021–2025 — use the table on this page as the fitment source of truth.",
    },
    {
      question: "What material is it?",
      answer:
        "Unpainted fibreglass Modulo-style kit (front, side skirts, and rear) — paint to match your City, per the product description.",
    },
  ],
  "CC-0155": () => [
    {
      question: "Which City years does this fit?",
      answer:
        "The vehicle compatibility table on this page lists Honda City 2021–present. The product title lists 2020–2026 — use the table on this page as the fitment source of truth.",
    },
    {
      question: "Is it real carbon fiber?",
      answer:
        "No. It is ABS plastic with a carbon-style texture for all four handles, snap-on with no drilling, per the product description.",
    },
  ],
  "CC-0127": () => [
    {
      question: "Which Corolla does this fit?",
      answer:
        "The vehicle compatibility table on this page lists Toyota Corolla E140 2009–2014. The product title mentions 2012 / 2008–2013 — use the table on this page as the fitment source of truth.",
    },
    {
      question: "What does it cover?",
      answer:
        "It is a top AC / center dashboard vent-and-button panel overlay for worn factory plastic, per the product description.",
    },
  ],
  "CC-0009": () => [
    {
      question: "Which Alto does this fit?",
      answer: "Suzuki Alto 2020–present per the vehicle compatibility table on this page.",
    },
    {
      question: "What is included?",
      answer:
        "Multimedia steering control buttons with spiral cable in glossy black for volume, media, calls, and navigation from the wheel, per the product description.",
    },
  ],

  // --- Next-tier 29 (Phase 2 Batch F) ---
  "CC-UNI-EXT-FBL-4PC-BK": () => [
    {
      question: "Is this a universal fit?",
      answer:
        "Yes. It is listed as a universal ABS front bumper splitter set (4 pieces). Confirm look and install method on the product photos before ordering.",
    },
    {
      question: "Why might delivery be Rs. 500?",
      answer:
        "This item is flagged bulky. Carts that include bulky items are charged the bulky delivery fee instead of the regular fee; the exact amount is shown at checkout.",
    },
  ],
  "CC-0180": () => [
    {
      question: "Is this a universal fit?",
      answer:
        "Yes. It is listed as a universal rear windshield “Devil Eye” LED light with multiple modes. Check the listing for power/wiring notes.",
    },
    {
      question: "Does it need professional install?",
      answer:
        "Most rear windshield LED strips are DIY with adhesive and a power tap. Follow the product guide; WhatsApp us if your wiring setup is unclear.",
    },
  ],
  "CC-0096": () => [
    {
      question: "Which Civic does this fit?",
      answer:
        "The vehicle compatibility table lists Honda Civic Reborn 2006–2012. The product title lists 2007–2011 — use the table on this page as the fitment source of truth.",
    },
    {
      question: "Is it real carbon fiber?",
      answer:
        "It is sold as a forged carbon-style gear knob cover (ABS/texture finish unless the description says otherwise). Read the product description for the exact material.",
    },
  ],
  "CC-UNI-LGT-REV-T15": () => [
    {
      question: "Is this a universal fit?",
      answer:
        "These are W16W / T15 LED reverse bulbs (4-pack). They only fit cars that use that bulb base — confirm your reverse-light socket before ordering.",
    },
    {
      question: "Are they plug-and-play?",
      answer:
        "Most T15 LED reverse bulbs are drop-in replacements for halogen T15/W16W. If your car throws bulb errors, WhatsApp us with your model year.",
    },
  ],
  "CC-0130": () => [
    {
      question: "Which Civic does this fit?",
      answer: "Honda Civic X 2016–2021 per the vehicle compatibility table on this page.",
    },
    {
      question: "Is this a full kit or single trim?",
      answer:
        "It is listed as a carbon fiber-style interior trim kit for Civic X (multi-piece). Check the product photos and description for exactly which panels are included.",
    },
  ],
  "CC-0231": () => [
    {
      question: "Is this a universal fit?",
      answer:
        "Yes. It is a USB-powered roof star / galaxy projector for cars. Plug into a USB port and aim at the headliner per the listing.",
    },
    {
      question: "Does it drain the battery?",
      answer:
        "It runs from USB. Use a switched USB port or unplug when the car is off if you want to avoid draining a constant-power outlet.",
    },
  ],
  "CC-0111": () => [
    {
      question: "Which Civic does this fit?",
      answer: "Honda Civic X 2016–2021 per the vehicle compatibility table on this page.",
    },
    {
      question: "Is it real carbon fiber?",
      answer:
        "No. It is ABS with a carbon-style finish unless the description says otherwise. Peel-and-stick style install — follow the product notes.",
    },
  ],
  "CC-FG-3CLR-H11": () => [
    {
      question: "Is this a universal fit?",
      answer:
        "These are H11 fog LED bulbs (2 pcs) with switchback colors. They fit vehicles that use H11 fog sockets — confirm your fog bulb type before ordering.",
    },
    {
      question: "What colors are included?",
      answer:
        "The listing describes multi-color / switchback fog LEDs (see product title and photos for the exact modes). Check the description for the controller/wiring notes.",
    },
  ],
  "CC-0143": () => [
    {
      question: "Which Civic does this fit?",
      answer: "Honda Civic Reborn 2006–2012 per the vehicle compatibility table on this page.",
    },
    {
      question: "Do I need to drill?",
      answer:
        "Many quarter louvers are designed for OEM-style fit without body modification. Follow the install notes on this product page; WhatsApp us with your year if unsure.",
    },
  ],
  "CC-0119": () => [
    {
      question: "Which Yaris does this fit?",
      answer: "Toyota Yaris 2020–Present per the vehicle compatibility table on this page.",
    },
    {
      question: "Why might delivery be higher?",
      answer:
        "Spoilers are often bulky. Carts with bulky items use the bulky delivery fee; the amount is shown at checkout.",
    },
  ],
  "CC-0164": () => [
    {
      question: "Which Corolla does this fit?",
      answer:
        "The vehicle compatibility table lists Toyota Corolla E140 2009–2014. The product title lists 2009–2012 — use the table on this page as the fitment source of truth.",
    },
    {
      question: "Is it real carbon fiber?",
      answer:
        "No. It is ABS with a carbon-style texture per typical listing language — confirm on the product description.",
    },
  ],
  "CC-0192": () => [
    {
      question: "Is this a universal fit?",
      answer: "Yes. It is a dashboard perfume / air freshener ornament — not vehicle-specific.",
    },
    {
      question: "How long does the scent last?",
      answer:
        "Scent life varies with heat and cabin airflow. See the product description for refill/replace notes.",
    },
  ],
  "CC-0150": () => [
    {
      question: "Is this a universal fit?",
      answer:
        "Yes. It is listed as a universal Angel Wings RGB decorative LED light. Check power and mount notes on the listing.",
    },
    {
      question: "Is install DIY?",
      answer:
        "Most decorative LED kits are DIY with adhesive mounts and a power connection. Use a trusted installer if you are not comfortable with wiring.",
    },
  ],
  "CC-0002": () => [
    {
      question: "Which Corolla does this fit?",
      answer:
        "Toyota Corolla 2014–2026 (E170–E210) per the vehicle compatibility table on this page.",
    },
    {
      question: "Is it plug-and-play?",
      answer:
        "The listing describes plug-and-play ambient LED AC vent trims. Follow the product install notes for your year.",
    },
  ],
  "CC-UNI-LGT-AGL-YL": () => [
    {
      question: "Is this a universal fit?",
      answer:
        "Yes. These are universal amber LED grill lights (4 pcs) for front grilles. Mounting depends on your grille style — check the photos.",
    },
    {
      question: "Are they road-legal in Pakistan?",
      answer:
        "Decorative grill lights may be restricted depending on how they are used while driving. Use responsibly and follow local traffic rules.",
    },
  ],
  "CC-0158": () => [
    {
      question: "Which Corolla does this fit?",
      answer:
        "The vehicle compatibility table lists Toyota Corolla 2014–2026 (E170–E210). The title lists 2015–2026 — use the table as the source of truth.",
    },
    {
      question: "Why might delivery be higher?",
      answer:
        "Spoilers are often bulky. Bulky carts use the bulky delivery fee shown at checkout.",
    },
  ],
  "CC-TYR-EXT-WQL-GB-20": () => [
    {
      question: "Which Yaris does this fit?",
      answer: "Toyota Yaris 2020–Present per the vehicle compatibility table on this page.",
    },
    {
      question: "Do I need to drill?",
      answer:
        "Many louvers are designed for OEM-style fit without drilling. Follow this product’s install notes; WhatsApp us if unsure.",
    },
  ],
  "CC-0190": () => [
    {
      question: "Is this a universal fit?",
      answer: "Yes. It hangs from the rear-view mirror — not vehicle-specific.",
    },
    {
      question: "How is scent replaced?",
      answer: "Hang cards are typically replaced when the scent fades. See the listing for pack contents.",
    },
  ],
  "CC-0148": () => [
    {
      question: "Which Alto does this fit?",
      answer: "Suzuki Alto 2020–Present per the vehicle compatibility table on this page.",
    },
    {
      question: "Do I need to drill?",
      answer:
        "Follow the install notes on this listing; many louvers avoid body drilling. WhatsApp us with a photo of your Alto’s rear glass corners if unsure.",
    },
  ],
  "CC-0110": () => [
    {
      question: "Which Civic does this fit?",
      answer: "Honda Civic X 2016–2021 per the vehicle compatibility table on this page.",
    },
    {
      question: "Is it real carbon fiber?",
      answer:
        "No. Carbon-style ABS finish unless the description says otherwise. Check the photos for how many pieces are in the full set.",
    },
  ],
  "CC-0210": () => [
    {
      question: "Is this a universal fit?",
      answer:
        "Yes. It is listed as a 5-point interior ambient light kit for dashboard and doors. Check included lengths and controller notes on the listing.",
    },
    {
      question: "Does install require removing trim?",
      answer:
        "Ambient kits usually need routing wires and placing strips along trim. Use a trusted installer if you are not comfortable with interior work.",
    },
  ],
  "CC-0138": () => [
    {
      question: "Which Corolla does this fit?",
      answer:
        "The vehicle compatibility table lists Toyota Corolla 2014–2026 (E170–E210). The product title lists 2014–2018 — use the table on this page as the fitment source of truth.",
    },
    {
      question: "Is it real carbon fiber?",
      answer:
        "No. ABS with carbon-style texture per typical listing language — confirm on the product description.",
    },
  ],
  "CC-0123": () => [
    {
      question: "Is this a universal fit?",
      answer:
        "Yes. These are listed as universal carbon-style side air-flow fender vent trims (pair). Mounting depends on your fender — check the photos.",
    },
    {
      question: "Is it real carbon fiber?",
      answer: "No. ABS with carbon-style finish unless the description says otherwise.",
    },
  ],
  "CC-INT-153": () => [
    {
      question: "Which Civic does this fit?",
      answer:
        "The vehicle compatibility table lists Honda Civic Reborn 2006–2012. The title lists 2007–2011 — use the table as the source of truth.",
    },
    {
      question: "Why might delivery be higher?",
      answer:
        "Floor mats are often bulky. Bulky carts use the bulky delivery fee shown at checkout.",
    },
  ],
  "CC-0205": () => [
    {
      question: "Is this a universal fit?",
      answer:
        "Yes. It is listed as a universal gloss black ABS side skirt / side splitter kit (4 pcs). Confirm length and look against your car in the photos.",
    },
    {
      question: "Why might delivery be higher?",
      answer:
        "Side skirts are bulky. Bulky carts use the bulky delivery fee shown at checkout.",
    },
  ],
  "CC-HCX-INT-STC-CF": () => [
    {
      question: "Which Civic does this fit?",
      answer: "Honda Civic X 2016–2021 per the vehicle compatibility table on this page.",
    },
    {
      question: "Is it real carbon fiber?",
      answer: "No. Carbon-style ABS cover unless the description says otherwise.",
    },
  ],
  "CC-YXC-MIR-BAT": () => [
    {
      question: "Which Yaris Cross does this fit?",
      answer: "Toyota Yaris Cross 2020–2026 per the vehicle compatibility table on this page.",
    },
    {
      question: "How does it install?",
      answer:
        "Batman-style covers are typically clip-on ABS over the factory mirror housing. Follow the product photos; WhatsApp us if your mirror shape differs.",
    },
  ],
  "CC-0184": () => [
    {
      question: "Is this a universal fit?",
      answer:
        "Yes. It is a universal ABS side skirt kit with red line (4 pcs). Confirm style against your car in the photos.",
    },
    {
      question: "Why might delivery be higher?",
      answer:
        "Side skirts are bulky. Bulky carts use the bulky delivery fee shown at checkout.",
    },
  ],
  "CC-SWF-DHC-CF": () => [
    {
      question: "Which Swift does this fit?",
      answer:
        "The vehicle compatibility table lists Suzuki Swift 2018–2024 and 2025–Present. The product title lists 2022–2025 — use the table on this page as the fitment source of truth.",
    },
    {
      question: "Is it real carbon fiber?",
      answer: "No. ABS with carbon-style finish unless the description says otherwise.",
    },
  ],
  // Batch 4 — 24 products (CC-EXT-107 excluded: listing integrity / securityHold)
  "CC-0022": () => [
    {
      question: "Which Corolla does this fit?",
      answer:
        "The vehicle compatibility table lists Toyota Corolla 2014–2026 (E170–E210). The short description mentions Corolla X 2022 only — use the table on this page as the fitment source of truth, and confirm against the product photos for your bumper.",
    },
    {
      question: "Why might delivery be higher?",
      answer:
        "Body/diffuser pieces are often bulky. Bulky carts use the bulky delivery fee shown at checkout.",
    },
  ],
  "CC-0134": () => [
    {
      question: "Which Elantra does this fit?",
      answer:
        "Hyundai Elantra Hybrid 2025–Present per the vehicle compatibility table on this page.",
    },
    {
      question: "Is it real carbon fiber?",
      answer: "No. ABS with a carbon-style finish unless the description says otherwise.",
    },
  ],
  "CC-0181": () => [
    {
      question: "Is this a universal fit?",
      answer:
        "Yes. It is a 12V car charger with USB/Type-C leads — not vehicle-specific. Confirm plug type and cable set on the listing.",
    },
    {
      question: "Does it charge phones and tablets?",
      answer:
        "It is sold as a multi-port 45W fast car charger (see wattage and ports on the product page). Use the cable/port combo your device supports.",
    },
  ],
  "CC-0145": () => [
    {
      question: "Which Corolla does this fit?",
      answer:
        "The vehicle compatibility table lists Toyota Corolla 2014–2026 (E170–E210). The title highlights Grande / Grande X E210 styling — use the table plus the product photos as the fitment source of truth for your trim.",
    },
    {
      question: "Is it plug-and-play?",
      answer:
        "Rear bumper reflector LEDs are typically OEM-style replacements. Follow the listing wiring notes; WhatsApp us with your year/trim if unsure.",
    },
  ],
  "CC-0221": () => [
    {
      question: "Which Civic does this fit?",
      answer:
        "Honda Civic Reborn 2006–2011 per the vehicle compatibility table on this page.",
    },
    {
      question: "Is it real carbon fiber?",
      answer: "No. Carbon-style ABS trim unless the description says otherwise.",
    },
  ],
  "CC-0034": () => [
    {
      question: "Is this a universal fit?",
      answer:
        "Yes. It is a universal 3-piece ABS ground-style front splitter. Confirm look and install method against your bumper in the photos.",
    },
    {
      question: "Why might delivery be higher?",
      answer:
        "Splitters are often bulky. Bulky carts use the bulky delivery fee shown at checkout.",
    },
  ],
  "CC-0121": () => [
    {
      question: "Which Civic does this fit?",
      answer:
        "Honda Civic Reborn 2006–2012 per the vehicle compatibility table on this page.",
    },
    {
      question: "Why might delivery be higher?",
      answer:
        "Spoilers are often bulky / special-courier. The fee is shown at checkout.",
    },
  ],
  "CC-SPO-MIR-BAT": () => [
    {
      question: "Which Sportage does this fit?",
      answer: "KIA Sportage 2019–2024 per the vehicle compatibility table on this page.",
    },
    {
      question: "How does it install?",
      answer:
        "Batman-style covers are typically clip-on ABS over the factory mirror housing. Follow the product photos; WhatsApp us if your mirror shape differs.",
    },
  ],
  "CC-0098": () => [
    {
      question: "Which City does this fit?",
      answer:
        "The vehicle compatibility table lists Honda City 2009–2020. The product title lists 2015–2020 — use the table on this page as the fitment source of truth.",
    },
    {
      question: "Is it real carbon fiber?",
      answer: "No. ABS with a carbon-style finish unless the description says otherwise.",
    },
  ],
  "CC-0196": () => [
    {
      question: "Which Corolla does this fit?",
      answer:
        "The vehicle compatibility table lists Toyota Corolla 2014–2026 (E170–E210). The product title lists 2015–2026 — use the table on this page as the fitment source of truth.",
    },
    {
      question: "Is it real carbon fiber?",
      answer:
        "No. ABS with a carbon-style / glossy black finish unless the description says otherwise.",
    },
  ],
  "CC-TCR-EXT-SMC-CF-15": () => [
    {
      question: "Which Corolla does this fit?",
      answer:
        "The vehicle compatibility table lists Toyota Corolla 2014–2026 (E170–E210). The product title lists 2015–2022 — use the table on this page as the fitment source of truth.",
    },
    {
      question: "How does it install?",
      answer:
        "Batman-style covers are typically clip-on ABS over the factory mirror housing. Follow the product photos.",
    },
  ],
  "CC-0129": () => [
    {
      question: "Which City does this fit?",
      answer:
        "Honda City 2021–2026 (2021–Present) per the vehicle compatibility table on this page.",
    },
    {
      question: "Why might delivery be higher?",
      answer:
        "Spoilers are often bulky. Bulky carts use the bulky delivery fee shown at checkout.",
    },
  ],
  "CC-TYR-EXT-SMC-CF": () => [
    {
      question: "Which Yaris does this fit?",
      answer: "Toyota Yaris 2020–2026 per the vehicle compatibility table on this page.",
    },
    {
      question: "How does it install?",
      answer:
        "Batman-style covers are typically clip-on ABS over the factory mirror housing. Follow the product photos.",
    },
  ],
  "CC-COR-BBL-E120": () => [
    {
      question: "Which Corolla does this fit?",
      answer:
        "Toyota Corolla E120 2002–2008 per the vehicle compatibility table on this page.",
    },
    {
      question: "Is install DIY?",
      answer:
        "Bumper LED kits usually need a power tap and mounting along the rear bumper. Follow the listing; use a trusted installer if you are not comfortable with wiring.",
    },
  ],
  "CC-0211": () => [
    {
      question: "Is this a universal fit?",
      answer:
        "Yes. It is a universal dashboard ambient LED strip set (2 pcs). Check length and adhesive notes on the listing.",
    },
    {
      question: "Does install require removing trim?",
      answer:
        "Most strips need routing and sticking along the dash edge. Use a trusted installer if you are not comfortable with interior work.",
    },
  ],
  "CC-INT-155": () => [
    {
      question: "Which Corolla does this fit?",
      answer:
        "The vehicle compatibility table lists Toyota Corolla E140 2009–2014. The title lists 2008–2013 — use the table on this page as the fitment source of truth.",
    },
    {
      question: "Why might delivery be higher?",
      answer:
        "Floor mats are often bulky. Bulky carts use the bulky delivery fee shown at checkout.",
    },
  ],
  "CC-INT-102": () => [
    {
      question: "Which Corolla does this fit?",
      answer:
        "Toyota Corolla 2014–2026 (E170–E210) per the vehicle compatibility table on this page.",
    },
    {
      question: "Is it universal?",
      answer:
        "No. It is a vehicle-specific dashboard mat — confirm your year against the table before ordering.",
    },
  ],
  "CC-0159": () => [
    {
      question: "Which Corolla does this fit?",
      answer:
        "The vehicle compatibility table lists Toyota Corolla 2014–2026 (E170–E210). The title lists 2015–2026 — use the table as the source of truth.",
    },
    {
      question: "Why might delivery be higher?",
      answer:
        "Spoilers are often bulky. Bulky carts use the bulky delivery fee shown at checkout.",
    },
  ],
  "CC-0175": () => [
    {
      question: "Which Civic does this fit?",
      answer:
        "The vehicle compatibility table lists Honda Civic Rebirth 2012–2016. The product title lists 2012–2015 — use the table on this page as the fitment source of truth.",
    },
    {
      question: "Is it real carbon fiber?",
      answer: "No. ABS with a carbon-style finish unless the description says otherwise.",
    },
  ],
  "CC-0176": () => [
    {
      question: "Which Civic does this fit?",
      answer:
        "The vehicle compatibility table lists Honda Civic Rebirth 2012–2016. The product title lists 2012–2015 — use the table on this page as the fitment source of truth.",
    },
    {
      question: "Is it real carbon fiber?",
      answer: "No. ABS with a carbon-style finish unless the description says otherwise.",
    },
  ],
  "CC-0120": () => [
    {
      question: "Which Civic does this fit?",
      answer:
        "Honda Civic Reborn 2006–2012 per the vehicle compatibility table on this page.",
    },
    {
      question: "Why might delivery be higher?",
      answer: "Spoilers are often bulky. The fee is shown at checkout.",
    },
  ],
  "CC-0223": () => [
    {
      question: "Which City does this fit?",
      answer: "Honda City 2021–2026 per the vehicle compatibility table on this page.",
    },
    {
      question: "Is it real carbon fiber?",
      answer: "No. Carbon-style ABS trim unless the description says otherwise.",
    },
  ],
  "CC-0040": () => [
    {
      question: "Which Corolla does this fit?",
      answer:
        "The vehicle compatibility table lists Toyota Corolla 2014–Present (E170–E210). The product title lists 2015–2024 — use the table on this page as the fitment source of truth.",
    },
    {
      question: "Why might delivery be higher?",
      answer:
        "Splitters/canards are often bulky. Bulky carts use the bulky delivery fee shown at checkout.",
    },
  ],
  "CC-LGT-203": () => [
    {
      question: "Which City does this fit?",
      answer:
        "The vehicle compatibility table lists Honda Classic 2009–2020 (classic City generation). The product title says Honda City — use the table on this page as the fitment source of truth and confirm your mirror housing against the photos before ordering.",
    },
    {
      question: "Is install DIY?",
      answer:
        "Mirror indicator LEDs usually need opening the mirror housing and a signal tap. Use a trusted installer if you are not comfortable with mirror wiring.",
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
 * Default PDP FAQ when no SKU-specific builder exists.
 * Grounded in store policy only — no fabricated fitment claims.
 */
export function defaultProductFaqs() {
  const fees = feeAmounts();
  return [
    {
      question: "Do you offer Cash on Delivery?",
      answer:
        "Yes. Cash on Delivery is available nationwide on eligible orders. For COD, pay a small booking advance (from Rs. 250, or more if the product requires a % advance) after placing your order and send the screenshot on WhatsApp. It is deducted from your total and refunded if the item doesn't fit. The balance is collected on delivery.",
    },
    {
      question: "How much is delivery?",
      answer: `Standard delivery is a flat ${fees.regular} on every order. Roof/trunk spoilers and Express (Daewoo) use a different courier rate shown at checkout. Bulky carts use the bulky fee shown at checkout.`,
    },
    {
      question: "How do I know if this part fits my car?",
      answer:
        "Check the vehicle compatibility table on this product page (make, model, and years). You can also browse Shop by Vehicle. If you are unsure, WhatsApp us your exact year and model before ordering — we will not invent fitment that is not listed here.",
    },
    {
      question: "What is your returns policy?",
      answer: returnsFaqAnswer(),
    },
    {
      question: "How long does delivery take?",
      answer: `Most orders ship within 1–2 business days after payment confirmation (or COD delivery-charge confirmation). ${deliveryEtaSummary()}`,
    },
  ];
}

/**
 * @param {object} product
 * @returns {{ question: string, answer: string }[]}
 */
export function buildProductKeywordFaqs(product) {
  const sku = String(product?.articleNo || "").trim();
  if (!sku || sku === "CC-0004") return [];
  const builder = PRODUCT_FAQ_BY_SKU[sku];
  if (!builder) return defaultProductFaqs();

  const shared = sharedPolicyFaqs({ includeFitment: false, includeDeliveryTime: false });
  const base = shared.length
    ? shared.filter((f) => /cash on delivery|return or exchange/i.test(f.question))
    : fallbackShared().filter((f) => /cash on delivery|return or exchange/i.test(f.question));

  const priceLabel = formatPkr(liveProductPrice(product));
  return [...base, ...builder({ priceLabel, product })];
}

export function hasProductKeywordFaqs(articleNo) {
  const sku = String(articleNo || "").trim();
  // Defaults cover the catalog; SKU builders still override when present.
  return Boolean(sku && sku !== "CC-0004");
}
