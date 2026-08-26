import { STORE_POLICY } from "../config/store-policy.js";

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
  return `Standard delivery is a flat ${formatPkrAmount(STORE_POLICY.shipping.standardFeePKR)} on every order. There is no order-value waiver for delivery.`;
}

export function standardDeliveryFeeShort() {
  return `Delivery ${formatPkrAmount(STORE_POLICY.shipping.standardFeePKR)}`;
}

export function returnsPolicyCanonical() {
  const days = STORE_POLICY.returns.windowDays;
  return `Returns and refunds are accepted within ${days} days for items that arrive defective or if the wrong item was shipped. In these cases, you'll receive a full refund. For change-of-mind returns, we offer an exchange for a different product or size — cash refunds are not available for change-of-mind requests.`;
}

/** Full policy statement — use on returns page intro and as the source of truth for shorter variants. */
export function returnsPolicySummary() {
  return returnsPolicyCanonical();
}

/** Two-path summary for PDP accordion and tight UI blocks. */
export function returnsRefundRules() {
  const days = STORE_POLICY.returns.windowDays;
  return `Within ${days} days of delivery: defective or wrong-item orders receive a full refund. Change-of-mind requests receive an exchange for a different product or size only — not a cash refund.`;
}

export function returnsRefundPathStatement() {
  const days = STORE_POLICY.returns.windowDays;
  return `Defective or wrong item shipped: full refund within ${days} days of delivery.`;
}

export function returnsExchangePathStatement() {
  const days = STORE_POLICY.returns.windowDays;
  return `Change of mind: exchange for a different product or size within ${days} days — cash refunds not available.`;
}

export function returnsTrustBadge() {
  const days = STORE_POLICY.returns.windowDays;
  return {
    text: `${days}-day returns window`,
    subtext: "Full refund if defective/wrong item; exchange only for change of mind",
  };
}

/** Homepage hero trust chip — short, no implied any-reason refund. */
export function returnsHeroTrustChip() {
  return "Refund if defective/wrong · exchange for change of mind";
}

export function returnsPolicyMetaDescription() {
  const days = STORE_POLICY.returns.windowDays;
  return `Within ${days} days: full refund for defective or wrong-item orders; exchange-only for change-of-mind returns at Homefy.pk.`;
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
  return list.map((item) => {
    if (!item || typeof item !== "object") return item;
    const text = String(item.text || item.message || "").trim();
    if (!looksLikeFreeDeliveryCopy(text)) return item;
    return { ...item, text: standardDeliveryFeeShort() };
  });
}

export function getFaqItems() {
  return [
    {
      question: "Do you offer Cash on Delivery (COD) in Pakistan?",
      answer:
        "Yes. Cash on Delivery is available nationwide. For COD orders, pay delivery charges in advance after placing your order and send the payment screenshot on WhatsApp. The product amount is collected when your order arrives.",
    },
    {
      question: "How much are delivery charges?",
      answer: `${standardDeliveryFeeStatement()} Express courier options use a different rate shown at checkout.`,
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
      question: "How do I choose the right size or colour?",
      answer:
        "Open the product page for sizes, colours and details. If you are unsure, message us on WhatsApp with the item name and we will help you pick.",
    },
    {
      question: "What is your return or exchange policy?",
      answer: returnsFaqAnswer(),
    },
    {
      question: "How long does delivery take?",
      answer: `Most orders ship within 1–2 business days after payment confirmation (or COD delivery-charge confirmation). ${deliveryEtaSummary()}`,
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
          `Within ${days} days of delivery, you may request an exchange for a different product or size if the item is unused, uninstalled, and in original packaging. Change-of-mind returns are not eligible for a cash refund.`,
        ],
      },
      {
        heading: "Not eligible",
        paragraphs: [
          "Installed, modified, damaged-by-use, or missing-parts items cannot be returned.",
          "Vehicle-specific parts ordered against the fitment listed on the product page are not returnable for “does not fit” unless we listed the wrong vehicle.",
        ],
      },
      {
        heading: "How to start a return or exchange",
        paragraphs: [
          `Message WhatsApp or email ${STORE_POLICY.contact.email} with your order number, reason, and clear photos.`,
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
        "COD is available on eligible products. Delivery charges may need to be paid in advance, with the product amount collected on delivery. Follow the checkout instructions and send your payment screenshot on WhatsApp.",
      ],
    },
  ];
}

export const SHIPPING_POLICY_INTRO =
  "We deliver kitchen accessories, beauty bags and ladies bags nationwide (Homefy.pk). Checkout shows the delivery option and fee before you place the order.";

export const SHIPPING_POLICY_SECTIONS = getShippingPolicySections();
