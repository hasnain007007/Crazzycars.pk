/**
 * Pakistan city landing pages — unique default copy (admin can override via Settings.cityPages).
 * Routes: /car-accessories-{slug}
 *
 * Fee strings must come from STORE_POLICY (see scripts/check-policy-literals.mjs).
 */
import { STORE_POLICY } from "@/config/store-policy";
import { formatPkrAmount } from "@/lib/storePolicyCopy";

export const CITY_LANDING_SLUGS = [
  "gujranwala",
  "lahore",
  "karachi",
  "islamabad",
  "rawalpindi",
  "faisalabad",
];

const FEE = formatPkrAmount(STORE_POLICY.shipping.standardFeePKR);
const BULKY = formatPkrAmount(STORE_POLICY.shipping.bulkyFeePKR || 500);

function feeNote(cityLabel) {
  return `Delivery to ${cityLabel}: ${FEE} regular, ${BULKY} if the order has bulky items.`;
}

/** @typedef {{ slug: string, name: string, province: string, h1: string, introHtml: string, deliveryNote: string, deliveryDays: string, metaTitle: string, metaDescription: string, faq: {question:string,answer:string}[], topCategorySlugs: string[], emitLocalBusiness: boolean }} CityLandingDefault */

/** @type {Record<string, CityLandingDefault>} */
export const CITY_LANDING_DEFAULTS = {
  gujranwala: {
    slug: "gujranwala",
    name: "Gujranwala",
    province: "Punjab",
    h1: "Car Accessories in Gujranwala — Same-City Dispatch from CrazzyCars.pk",
    introHtml: `<p>CrazzyCars.pk is based in <strong>Gujranwala</strong>, so local buyers get the fastest handoff for body kits, LED lighting, carbon fiber trim, floor mats and Civic/Corolla/City parts. Browse fitment by car, confirm on WhatsApp, and pay Cash on Delivery across Gujranwala city and nearby towns (Wazirabad, Kamoke, Gujrat corridor).</p><p>We stock generation-specific parts — not generic “fits most” guesses — so your Reborn, Civic X, Corolla or City order matches the years on the product page.</p>`,
    deliveryNote: feeNote("Gujranwala city & suburbs"),
    deliveryDays: "Same day–1 business day inside Gujranwala; 1–2 days nearby cities.",
    metaTitle: "Car Accessories Gujranwala | COD | CrazzyCars.pk",
    metaDescription:
      "Buy car accessories in Gujranwala with Cash on Delivery. Body kits, LEDs, carbon fiber & mats — dispatched from our Gujranwala store.",
    topCategorySlugs: ["body-kits", "led-lighting", "carbon-fiber-accessories", "floor-mats"],
    emitLocalBusiness: true,
    faq: [
      {
        question: "Do you have a physical store in Gujranwala?",
        answer:
          "Yes — CrazzyCars.pk operates from Gujranwala. Message WhatsApp 03284010007 for the current pickup/visit window before you come.",
      },
      {
        question: "How fast is delivery inside Gujranwala?",
        answer:
          "Most in-stock accessories leave the same day or next business day inside Gujranwala city. Bulky body kits may need an extra day for packing.",
      },
      {
        question: "Is Cash on Delivery available in Gujranwala?",
        answer: `Yes. COD is available across Gujranwala with the standard delivery fee collected as per the checkout note (usually ${FEE}; bulky freight higher).`,
      },
    ],
  },
  lahore: {
    slug: "lahore",
    name: "Lahore",
    province: "Punjab",
    h1: "Car Accessories in Lahore — COD Delivery from CrazzyCars.pk",
    introHtml: `<p>Lahore drivers shop CrazzyCars.pk for <strong>Civic, Corolla, City, Sportage and Yaris</strong> accessories with Cash on Delivery across DHA, Johar Town, Model Town, Cantt, Gulberg and surrounding areas. Every listing shows the exact generation years so you are not guessing fitment in traffic.</p><p>Popular Lahore orders include carbon interior trims, LED headlight upgrades, floor mats for monsoon season, and complete body kits — packed in Gujranwala and couriered to Lahore on the major-city lane.</p>`,
    deliveryNote: feeNote("Lahore major-city"),
    deliveryDays: "Typically 2–3 business days to Lahore.",
    metaTitle: "Car Accessories Lahore | Cash on Delivery | CrazzyCars.pk",
    metaDescription:
      "Order car accessories in Lahore with COD. Fitment-checked Civic, Corolla & City parts — LEDs, body kits, mats & carbon fiber.",
    topCategorySlugs: ["body-kits", "led-lighting", "floor-mats", "interior"],
    emitLocalBusiness: false,
    faq: [
      {
        question: "How long does CrazzyCars delivery take to Lahore?",
        answer:
          "Most Lahore orders arrive in 2–3 business days after confirmation. Tracking is shared on WhatsApp once the courier picks up.",
      },
      {
        question: "Can I return a part that does not fit in Lahore?",
        answer:
          "If the part does not match the generation confirmed on the product page, contact us within the returns window with photos — see our returns policy for COD returns.",
      },
      {
        question: "Do you install accessories in Lahore?",
        answer:
          "We ship parts nationwide; installation is arranged by your local workshop. Many trims are peel-and-stick; body kits need a body shop.",
      },
    ],
  },
  karachi: {
    slug: "karachi",
    name: "Karachi",
    province: "Sindh",
    h1: "Car Accessories in Karachi — Nationwide COD via CrazzyCars.pk",
    introHtml: `<p>Karachi buyers use CrazzyCars.pk for <strong>coastal-climate practical upgrades</strong>: TPE/9D mats that handle heat, LED lighting that cuts night glare on Shahrah-e-Faisal, and generation-correct Civic/Corolla exterior kits. Orders ship from Punjab with Cash on Delivery across Clifton, DHA, Gulshan, North Nazimabad and Malir.</p><p>Confirm your chassis years on WhatsApp before bulky kits leave the warehouse — Karachi return logistics are slower, so we double-check fitment first.</p>`,
    deliveryNote: feeNote("Karachi"),
    deliveryDays: "Typically 3–5 business days to Karachi.",
    metaTitle: "Car Accessories Karachi | COD Shipping | CrazzyCars.pk",
    metaDescription:
      "Shop car accessories for Karachi with Cash on Delivery. Heat-ready mats, LEDs, carbon trim & body kits for Civic, Corolla & City.",
    topCategorySlugs: ["floor-mats", "led-lighting", "carbon-fiber-accessories", "body-kits"],
    emitLocalBusiness: false,
    faq: [
      {
        question: "Is COD available for Karachi orders?",
        answer:
          "Yes. Cash on Delivery is available across Karachi. Advance delivery-charge payment may be required on checkout for COD confirmation.",
      },
      {
        question: "How long to Karachi from CrazzyCars?",
        answer:
          "Expect about 3–5 business days for standard parcels. Remote / bulky kits can take longer — we share tracking when booked.",
      },
      {
        question: "Which accessories sell most in Karachi?",
        answer:
          "Floor mats, LED upgrades, carbon interior trims and Civic/Corolla body kits are the most ordered SKUs for Karachi customers.",
      },
    ],
  },
  islamabad: {
    slug: "islamabad",
    name: "Islamabad",
    province: "Islamabad Capital Territory",
    h1: "Car Accessories in Islamabad — Fitment-Checked Parts, COD",
    introHtml: `<p>Islamabad and twin-city drivers order from CrazzyCars.pk for <strong>clean OEM-style upgrades</strong>: forged-look carbon trims, discreet LED lighting, and body kits that still look tidy on Margalla Road. We list exact years so F-series, G-series and Bahria fleets get the right Civic X, City Aspire or Corolla generation.</p><p>Checkout supports Cash on Delivery into Islamabad sectors; WhatsApp support helps confirm colour and fitment before dispatch from Gujranwala.</p>`,
    deliveryNote: feeNote("Islamabad major-city"),
    deliveryDays: "Typically 2–3 business days to Islamabad.",
    metaTitle: "Car Accessories Islamabad | COD | CrazzyCars.pk",
    metaDescription:
      "Buy car accessories in Islamabad with COD. Generation-correct Civic, City & Corolla parts — carbon, LEDs, mats & kits.",
    topCategorySlugs: ["carbon-fiber-accessories", "led-lighting", "body-kits", "interior"],
    emitLocalBusiness: false,
    faq: [
      {
        question: "Do you deliver to all Islamabad sectors?",
        answer:
          "Yes — courier covers Islamabad sectors and most housing societies. Share your full sector/street on checkout for accurate booking.",
      },
      {
        question: "Can I verify fitment before paying?",
        answer:
          "Send your make/model/year (and a dash photo if unsure) on WhatsApp 03284010007. We confirm the SKU before you place a bulky order.",
      },
      {
        question: "Delivery time to Islamabad?",
        answer: "Most confirmed orders reach Islamabad in 2–3 business days.",
      },
    ],
  },
  rawalpindi: {
    slug: "rawalpindi",
    name: "Rawalpindi",
    province: "Punjab",
    h1: "Car Accessories in Rawalpindi — Twin City COD Delivery",
    introHtml: `<p>Rawalpindi shoppers (Saddar, Westridge, Bahria, Askari, Satellite Town) get the same CrazzyCars.pk catalogue as Islamabad — <strong>with twin-city courier timing</strong>. Focus SKUs include Corolla gear trims, Civic Reborn exterior parts, City Aspire interior carbon, and monsoon-ready floor mats.</p><p>Order online, confirm on WhatsApp, and pay Cash on Delivery when the parcel arrives. Fitment tables on every product page list the years we support.</p>`,
    deliveryNote: feeNote("Rawalpindi / twin-city"),
    deliveryDays: "Typically 2–3 business days to Rawalpindi.",
    metaTitle: "Car Accessories Rawalpindi | Cash on Delivery | CrazzyCars.pk",
    metaDescription:
      "Car accessories for Rawalpindi with COD. Civic, Corolla & City parts — LEDs, carbon fiber, mats and body kits.",
    topCategorySlugs: ["exterior", "carbon-fiber-accessories", "floor-mats", "led-lighting"],
    emitLocalBusiness: false,
    faq: [
      {
        question: "Is Rawalpindi delivery the same as Islamabad?",
        answer:
          "Yes — Rawalpindi and Islamabad share the twin-city courier lane. Most parcels arrive in 2–3 business days after confirmation.",
      },
      {
        question: "Can I pick up from Gujranwala instead?",
        answer:
          "If you are travelling to Gujranwala, WhatsApp us to arrange a confirmed pickup window. Otherwise we ship COD to Rawalpindi.",
      },
      {
        question: "Which cars do you cover for Pindi buyers?",
        answer:
          "Full Shop-by-Car coverage including Civic generations, Toyota Corolla, Honda City, Sportage, Yaris and more — each product lists years.",
      },
    ],
  },
  faisalabad: {
    slug: "faisalabad",
    name: "Faisalabad",
    province: "Punjab",
    h1: "Car Accessories in Faisalabad — Punjab COD from CrazzyCars.pk",
    introHtml: `<p>Faisalabad is on our <strong>Punjab major-city</strong> route: Corolla and Civic owners in Madina Town, Peoples Colony, Susan Road and Jaranwala Road order body kits, LED bars, seat/floor protection and carbon interior upgrades with Cash on Delivery.</p><p>Because we dispatch from Gujranwala, Faisalabad parcels usually move faster than down-country routes. Still confirm generation years on the product page — especially for Reborn vs Rebirth vs Civic X kits.</p>`,
    deliveryNote: feeNote("Faisalabad major-city"),
    deliveryDays: "Typically 2–3 business days to Faisalabad.",
    metaTitle: "Car Accessories Faisalabad | COD | CrazzyCars.pk",
    metaDescription:
      "Order car accessories in Faisalabad with Cash on Delivery. Fitment-checked kits, LEDs, mats & carbon trim for popular Pakistani cars.",
    topCategorySlugs: ["body-kits", "floor-mats", "led-lighting", "carbon-fiber-accessories"],
    emitLocalBusiness: false,
    faq: [
      {
        question: "Delivery time to Faisalabad?",
        answer:
          "Most Faisalabad orders arrive in 2–3 business days after WhatsApp/order confirmation.",
      },
      {
        question: "Do you charge extra for bulky body kits to Faisalabad?",
        answer: `Bulky freight (body kits, large spoilers, some mat sets) uses the bulky fee — usually ${BULKY} — shown at checkout.`,
      },
      {
        question: "Can factories / fleets bulk-order?",
        answer:
          "Yes. Message WhatsApp 03284010007 with SKUs and quantities for a wholesale-style quote on repeat Faisalabad orders.",
      },
    ],
  },
};

export function cityPath(slug) {
  return `/car-accessories-${String(slug || "").trim().toLowerCase()}`;
}

export function mergeCityLanding(slug, override = {}) {
  const key = String(slug || "").trim().toLowerCase();
  const base = CITY_LANDING_DEFAULTS[key];
  if (!base) return null;
  const o = override && typeof override === "object" ? override : {};
  const faq =
    Array.isArray(o.faq) && o.faq.length
      ? o.faq
          .map((f) => ({
            question: String(f?.question || "").trim(),
            answer: String(f?.answer || "").trim(),
          }))
          .filter((f) => f.question && f.answer)
      : base.faq;
  const topCategorySlugs =
    Array.isArray(o.topCategorySlugs) && o.topCategorySlugs.length
      ? o.topCategorySlugs.map((s) => String(s).trim()).filter(Boolean)
      : base.topCategorySlugs;
  return {
    ...base,
    h1: String(o.h1 || "").trim() || base.h1,
    introHtml: String(o.introHtml || "").trim() || base.introHtml,
    deliveryNote: String(o.deliveryNote || "").trim() || base.deliveryNote,
    deliveryDays: String(o.deliveryDays || "").trim() || base.deliveryDays,
    metaTitle: String(o.metaTitle || "").trim() || base.metaTitle,
    metaDescription: String(o.metaDescription || "").trim() || base.metaDescription,
    faq,
    topCategorySlugs,
    emitLocalBusiness: base.emitLocalBusiness,
  };
}
