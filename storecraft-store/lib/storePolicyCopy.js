import { STORE_POLICY } from "../config/store-policy.js";
import {
  COD_ADVANCE_AMOUNT,
  PREPAID_DISCOUNT_PERCENT,
} from "../config/checkout-money.js";

export function formatPkrAmount(n) {
  return `Rs. ${Number(n).toLocaleString("en-PK")}`;
}

export function standardFeePkr() {
  return STORE_POLICY.shipping.standardFeePKR;
}

export function returnsWindowDays() {
  return STORE_POLICY.returns.windowDays;
}

export function isLahoreCity(city) {
  return /^lahore$/i.test(String(city || "").trim());
}

export function lahoreEtaRange() {
  const { minDays, maxDays } = STORE_POLICY.shipping.cityETAs.lahore;
  return `${minDays}–${maxDays}`;
}

export function lahoreEtaStatement() {
  return `Lahore: ${lahoreEtaRange()} business days (confirmed)`;
}

/** Neutral copy when no city-specific ETA is confirmed (non-Lahore). */
export function nonLahoreEtaStatement() {
  return "Other cities: delivery time will be confirmed at checkout";
}

/**
 * @deprecated No unlisted-city day range exists — use {@link nonLahoreEtaStatement}.
 * @returns {string|null}
 */
export function unlistedCityEtaRange() {
  const d = STORE_POLICY.shipping.cityETAs.default;
  if (!d || d.minDays == null || d.maxDays == null) return null;
  return `${d.minDays}–${d.maxDays}`;
}

export function deliveryEtaForCity(city) {
  if (isLahoreCity(city)) {
    return { confirmed: true, text: lahoreEtaStatement() };
  }
  return { confirmed: false, text: nonLahoreEtaStatement() };
}

export function deliveryEtaSummary() {
  return `${lahoreEtaStatement()}. ${nonLahoreEtaStatement()}.`;
}

export function standardDeliveryFeeStatement() {
  const regular = formatPkrAmount(STORE_POLICY.shipping.standardFeePKR);
  const bulky = formatPkrAmount(STORE_POLICY.shipping.bulkyFeePKR || 500);
  return `Delivery is ${regular} for regular items, or ${bulky} when the order includes bulky items (splitters, side skirts, spoilers, floor mats, etc.). COD orders require a booking advance (from Rs. 250) before processing; the balance is Cash on Delivery. There is no order-value waiver for delivery.`;
}

export function standardDeliveryFeeShort() {
  const regular = Number(STORE_POLICY.shipping.standardFeePKR).toLocaleString("en-PK");
  const bulky = Number(STORE_POLICY.shipping.bulkyFeePKR || 500).toLocaleString("en-PK");
  return `Delivery Rs. ${regular} regular · Rs. ${bulky} bulky`;
}

/** Cart / checkout / PDP banner — English. Customer-facing: ask for advance only (no tier breakdown). */
export function shippingAdvanceBannerEn() {
  return `COD orders need a small booking amount (from Rs. 250) before we process — deducted from your total, refunded if the item doesn't fit. Balance on delivery.`;
}

/** Cart / checkout / PDP banner — Urdu. Customer-facing: ask for advance only. */
export function shippingAdvanceBannerUr() {
  return `COD آرڈر پر کم از کم Rs. 250 بکنگ ایڈوانس درکار ہے — کل سے کٹے گی، فٹ نہ ہونے پر واپس۔ باقی ڈیلیوری پر۔`;
}

/** Site-wide top announcement bar — COD booking vs prepaid discount. */
export function announcementAdvanceDeliveryText() {
  return `COD from Rs. ${COD_ADVANCE_AMOUNT} booking · or ${PREPAID_DISCOUNT_PERCENT}% off full payment`;
}

/** True for outdated top-bar lines we rewrite to the booking / prepaid offer. */
export function looksLikeLegacyAdvanceAnnouncement(text) {
  const t = String(text || "").trim();
  if (!t) return false;
  if (/delivery\s+charges?\s+(are\s+)?paid\s+in\s+advance/i.test(t)) return true;
  if (/^pay\s+delivery\s+charges?\s+in\s+advance/i.test(t)) return true;
  if (/shipping\s+is\s+paid\s+in\s+advance/i.test(t)) return true;
  return false;
}

/** Fee-only / bulky-tier lines that should not stay customer-facing in the top bar. */
export function looksLikeFeeOnlyAnnouncement(text) {
  const t = String(text || "").trim();
  if (!t) return false;
  if (looksLikeLegacyAdvanceAnnouncement(t)) return true;
  if (/booking|prepaid|full payment|% off/i.test(t)) return false;
  if (/advance/i.test(t)) return false;
  if (/^delivery\s+rs\.?\s*[\d,]+$/i.test(t)) return true;
  if (/regular\s*[·•|]\s*.*bulky/i.test(t)) return true;
  if (/delivery\s+rs\.?\s*[\d,]+\s+regular/i.test(t)) return true;
  return false;
}

export function returnsPolicyCanonical() {
  const days = STORE_POLICY.returns.windowDays;
  return `Returns and refunds are accepted within ${days} days only when an item arrives defective or we shipped the wrong item — in those cases you'll receive a full refund. Change of mind is not eligible for return, refund, or exchange.`;
}

/** Full policy statement — use on returns page intro and as the source of truth for shorter variants. */
export function returnsPolicySummary() {
  return returnsPolicyCanonical();
}

/** Two-path summary for PDP accordion and tight UI blocks. */
export function returnsRefundRules() {
  const days = STORE_POLICY.returns.windowDays;
  return `Within ${days} days of delivery: defective or wrong-item orders receive a full refund. Change of mind is not eligible for return, refund, or exchange.`;
}

export function returnsRefundPathStatement() {
  const days = STORE_POLICY.returns.windowDays;
  return `Defective or wrong item shipped: full refund within ${days} days of delivery.`;
}

export function returnsExchangePathStatement() {
  return "Change of mind: not eligible for return, refund, or exchange.";
}

export function returnsTrustBadge() {
  const days = STORE_POLICY.returns.windowDays;
  return {
    text: `${days}-day returns window`,
    subtext: "Full refund if defective or wrong item — no change-of-mind returns",
  };
}

/** Homepage hero trust chip — short, no implied any-reason refund. */
export function returnsHeroTrustChip() {
  return "Refund for a defective or wrong part · no change-of-mind returns";
}

/** Homepage hero rail under CTAs — COD booking vs prepaid discount. */
export function homepageHeroTrustItems() {
  return [
    `COD booking from ${formatPkrAmount(COD_ADVANCE_AMOUNT)}`,
    `${PREPAID_DISCOUNT_PERCENT}% off full payment (JazzCash / bank)`,
    "Nationwide delivery",
    "WhatsApp support",
  ];
}

export function returnsPolicyMetaDescription() {
  const days = STORE_POLICY.returns.windowDays;
  return `Within ${days} days: full refund for defective or wrong-item orders only. No returns for change of mind at Crazzycars.pk.`;
}

export function returnsFaqAnswer() {
  return `${returnsPolicyCanonical()} See our Returns Policy page to start a claim.`;
}

export function looksLikeFreeDeliveryCopy(text) {
  return /\bfree[\s-]+deliver|\bfree[\s-]+ship/i.test(String(text || ""));
}

export function sanitizeCustomerShippingNote(text) {
  const raw = String(text || "").trim();
  if (!raw || looksLikeFreeDeliveryCopy(raw)) {
    return standardDeliveryFeeStatement();
  }
  return raw;
}

export function sanitizeAnnouncementItems(items) {
  const list = Array.isArray(items) ? items : [];
  const mapped = list.map((item) => {
    if (!item || typeof item !== "object") return item;
    const text = String(item.text || item.message || "").trim();
    if (
      looksLikeFreeDeliveryCopy(text) ||
      looksLikeFeeOnlyAnnouncement(text) ||
      looksLikeLegacyAdvanceAnnouncement(text)
    ) {
      return {
        ...item,
        text: announcementAdvanceDeliveryText(),
        link: item.link || "/checkout",
        enabled: item.enabled !== false,
      };
    }
    return item;
  });
  const hasOffer = mapped.some((item) =>
    /booking|prepaid|% off|advance/i.test(String(item?.text || item?.message || ""))
  );
  if (hasOffer) return mapped;
  return [
    {
      text: announcementAdvanceDeliveryText(),
      link: "/checkout",
      enabled: true,
    },
    ...mapped,
  ];
}

export function getFaqItems() {
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
      question: "How do I pay with JazzCash or bank transfer?",
      answer:
        "Choose JazzCash or bank transfer at checkout, pay the full order total to the account details shown, then send your payment screenshot on WhatsApp. We process the order after we receive the screenshot.",
    },
    {
      question: "How can I track my order?",
      answer:
        "When your order ships we share a Postex tracking number by WhatsApp/email. Track it on our Track Order page or the courier tracking link.",
    },
    {
      question: "How do I know if a part fits my car?",
      answer:
        "Open the product page and check vehicle fitment (make/model/years). You can also shop by car under Shop by Vehicle. If you are unsure, message us on WhatsApp with your car year and model.",
    },
    {
      question: "What is your return or exchange policy?",
      answer: returnsFaqAnswer(),
    },
    {
      question: "How long does delivery take?",
      answer: `Most orders ship within 1–2 business days after payment confirmation (or COD booking confirmation). ${deliveryEtaSummary()}`,
    },
    {
      question: "Is CrazzyCars a trusted store for car accessories in Pakistan?",
      answer:
        "CrazzyCars.pk ships car accessories nationwide from Gujranwala. We list vehicle fitment on product pages, offer Cash on Delivery on eligible items (small booking advance, balance on delivery), and handle returns under our published returns policy. Message us on WhatsApp with your order number if you need help — we do not use fake star ratings or invented reviews.",
    },
  ];
}

/** @deprecated use getFaqItems() */
export const FAQ_ITEMS = getFaqItems();

export function getReturnsPage() {
  const days = STORE_POLICY.returns.windowDays;
  return {
    title: "Returns Policy",
    description: returnsPolicyMetaDescription(),
    intro: returnsPolicyCanonical(),
    sections: [
      {
        heading: "When you receive a full refund",
        list: [
          `You contact us within ${days} days of delivery with your order number and photos`,
          "The item arrived defective, damaged in transit, or not as described",
          "We shipped the wrong item",
          "After inspection, approved claims receive a full refund",
        ],
      },
      {
        heading: "Change of mind",
        paragraphs: [
          "Change of mind is not eligible for return, refund, or exchange. Please check fitment, photos, and product details carefully before you order.",
        ],
      },
      {
        heading: "Not eligible",
        paragraphs: [
          "Change of mind, wrong size chosen, or ordered the wrong part by mistake.",
          "Installed, modified, damaged-by-use, or missing-parts items cannot be returned.",
          "Vehicle-specific parts ordered against the fitment listed on the product page are not returnable for “does not fit” unless we listed the wrong vehicle.",
        ],
      },
      {
        heading: "How to start a return",
        paragraphs: [
          `Message WhatsApp or email ${STORE_POLICY.contact.email} with your order number, reason, and clear photos (defective or wrong-item claims only).`,
        ],
      },
      {
        heading: "How refunds are paid",
        paragraphs: [
          "Full refunds apply only when the item is defective or we shipped the wrong item. For Cash on Delivery orders we typically refund by bank transfer or JazzCash after we inspect the returned item.",
        ],
      },
    ],
  };
}

export const RETURNS_PAGE = getReturnsPage();

export function getShippingPolicySections() {
  return [
    {
      heading: "Standard delivery",
      paragraphs: [`${standardDeliveryFeeStatement()} ${deliveryEtaSummary()}`],
    },
    {
      heading: "Spoilers and body kits",
      paragraphs: [
        "Roof and trunk spoilers use a special courier fee shown at checkout. Body kits cannot use Daewoo Express and stay on standard delivery.",
      ],
    },
    {
      heading: "Express Delivery (Daewoo)",
      paragraphs: [
        "Where available you can choose Express Delivery (Daewoo) at checkout. This option is hidden for body kits. The fee is shown before you confirm the order.",
      ],
    },
    {
      heading: "Cash on Delivery",
      paragraphs: [
        "COD is available on eligible products. Body kits cannot be ordered on Cash on Delivery — use JazzCash, Meezan, or bank transfer. COD orders need a booking advance (from Rs. 250) before we process; checkout shows the exact amount. Send your payment screenshot on WhatsApp; the balance is collected on delivery.",
      ],
    },
  ];
}

export const SHIPPING_POLICY_INTRO =
  "We deliver car accessories nationwide from Gujranwala (Crazzycars.pk). Checkout shows the delivery option and fee before you place the order.";

export const SHIPPING_POLICY_SECTIONS = getShippingPolicySections();
