import { BRAND_NAME } from "../brand.js";
import { STORE_POLICY } from "../../config/store-policy.js";

const std = Number(STORE_POLICY.shipping.standardFeePKR) || 250;
const bulky = Number(STORE_POLICY.shipping.bulkyFeePKR) || 500;
const days = Number(STORE_POLICY.returns.windowDays) || 7;

/**
 * Server-rendered homepage intro (~300 words). Editable via settings.homepageIntroHtml
 * when present; otherwise this default is used.
 */
export function getHomepageIntroCopy() {
  return {
    h1: `${BRAND_NAME} — Car Accessories in Pakistan`,
    paragraphs: [
      `${BRAND_NAME} is a car-accessories store based in Gujranwala, Punjab, shipping exterior, interior, LED, carbon-fiber and body-kit parts across Pakistan. We specialise in fitment-listed upgrades for popular Pakistani cars such as Toyota Corolla, Honda Civic, Honda City, Suzuki Alto and Toyota Yaris, plus universal gadgets that work in most cabins.`,
      `Shop by category for spoilers and diffusers, splitters and side skirts, LED headlights and bulbs, interior lights, floor mats, door-handle covers and more — or open Shop by Car to browse generations with the correct year ranges. Every product page shows stock, price in PKR, and vehicle fitment so you can check before you order.`,
      `Nationwide courier delivery is available on every eligible order. Standard delivery is Rs. ${std}; bulky lines (spoilers, splitters, side skirts, floor mats and similar) are Rs. ${bulky}. Cash on Delivery is offered on eligible items: pay a small booking advance, then the balance when the parcel arrives. Prepaid JazzCash or bank transfer orders can qualify for the prepaid discount shown at checkout.`,
      `Need a fitment check or want to order on WhatsApp? Message 03284010007 with your car’s make, model, year and the product link. Defective or wrong-item claims are handled under our ${days}-day returns policy. Browse Exterior, Interior, LED Lighting, Spoilers & Diffusers, or jump to Corolla E170 and Civic X accessories to get started.`,
    ],
    links: [
      { href: "/categories/exterior", label: "Exterior" },
      { href: "/categories/interior", label: "Interior" },
      { href: "/categories/led-lighting", label: "LED Lighting" },
      { href: "/categories/spoilers-diffusers", label: "Spoilers & Diffusers" },
      { href: "/cars/toyota-corolla-e170-2014-2026", label: "Toyota Corolla E170" },
      { href: "/cars/honda-civic-x-2016-2021", label: "Honda Civic X" },
    ],
  };
}

/** Homepage FAQ (matches llms.txt / policy pages). */
export function getHomepageFaqItems() {
  return [
    {
      question: "How long does delivery take?",
      answer: `Most orders leave Gujranwala within 1–2 business days after payment or COD booking confirmation. Lahore is typically 2–3 days; other cities take longer depending on the courier. Tracking is shared on WhatsApp or email when the parcel ships.`,
    },
    {
      question: "Do you offer Cash on Delivery?",
      answer: `Yes, on eligible items. Pay a small booking advance (from Rs. 250) to confirm the order, then pay the product balance when the courier delivers. Body kits and some large packages may require full advance — checkout shows what applies.`,
    },
    {
      question: "How much is shipping?",
      answer: `Delivery is Rs. ${std} for regular items. When the cart includes bulky items (spoilers, splitters, side skirts, floor mats, body kits, etc.) the fee is Rs. ${bulky}. The exact fee is shown at checkout before you place the order.`,
    },
    {
      question: "What is your return policy?",
      answer: `Within ${days} days of delivery we refund defective or wrong-item orders after inspection. Change of mind is not eligible. Contact WhatsApp 03284010007 with your order number and photos to start a claim.`,
    },
    {
      question: "How do I check if a part fits my car?",
      answer: `Open the product page and read the vehicle fitment (make, model and years). You can also shop by car under /cars. If you are unsure, WhatsApp 03284010007 with your car year and a photo before ordering.`,
    },
    {
      question: "How do I order on WhatsApp?",
      answer: `Message 03284010007 with the product link (or name), quantity, your city, and your car’s make/model/year. We confirm price, delivery fee and COD booking steps, then place the order for you.`,
    },
  ];
}
