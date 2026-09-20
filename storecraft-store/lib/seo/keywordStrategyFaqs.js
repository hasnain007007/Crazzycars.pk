/**
 * FAQPage JSON-LD + grounded Q&A for keyword Phase 4 categories / top PDPs.
 * Answers reuse storePolicyCopy; do not invent fitment or GTINs.
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

/** Fallback if getFaqItems shape changes — keep policy-accurate. */
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

const CATEGORY_FAQ_EXTRAS = {
  "universal-accessories": {
    name: "Universal Accessories",
  },
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
  "led-indicator-lights": {
    name: "LED Indicator Lights",
  },
  "interior-lights": {
    name: "Interior Lights",
  },
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
  if (minLabel && maxLabel) {
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
