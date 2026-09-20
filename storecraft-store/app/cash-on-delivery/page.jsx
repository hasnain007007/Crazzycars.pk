import Link from "next/link";
import { STORE_CONTACT } from "@/config/store-policy";
import { buildBrandedAbsoluteTitle } from "@/lib/seo/brandedTitle";
import {
  deliveryEtaSummary,
  getFaqItems,
  returnsFaqAnswer,
  standardDeliveryFeeStatement,
} from "@/lib/storePolicyCopy";
import { absoluteUrl } from "@/lib/siteUrl";
import { ROBOTS_INDEX_FOLLOW } from "@/lib/seo/robotsMeta";
import { sanitizeMetadata } from "@/lib/safeMetadata";
import { safeJsonLd } from "@/lib/safeJsonLd";
import { faqPageJsonLd } from "@/lib/seo/keywordStrategyFaqs";

const BRAND =
  process.env.NEXT_PUBLIC_STORE_NAME ||
  process.env.NEXT_PUBLIC_APP_NAME ||
  "CrazzyCars.pk";

const META_BASE = "Cash on Delivery (COD) in Pakistan";
const META_DESCRIPTION =
  "Cash on Delivery nationwide at CrazzyCars.pk. Pay delivery charges in advance, then pay for your car accessories when the parcel arrives. Body kits use JazzCash, Meezan, or bank transfer — not COD.";

const titleMeta = buildBrandedAbsoluteTitle(META_BASE, { brand: BRAND });

export const metadata = sanitizeMetadata({
  title: titleMeta,
  description: META_DESCRIPTION,
  alternates: { canonical: absoluteUrl("/cash-on-delivery") },
  robots: ROBOTS_INDEX_FOLLOW,
  openGraph: {
    title: titleMeta.absolute,
    description: META_DESCRIPTION,
    url: absoluteUrl("/cash-on-delivery"),
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: titleMeta.absolute,
    description: META_DESCRIPTION,
  },
});

function codLandingFaqs() {
  const shared = getFaqItems();
  const byQ = (needle) =>
    shared.find((f) => String(f.question || "").toLowerCase().includes(needle));
  const items = [
    byQ("cash on delivery"),
    byQ("delivery charges"),
    byQ("how long does delivery"),
    byQ("return or exchange") || { question: "What is your return or exchange policy?", answer: returnsFaqAnswer() },
    byQ("fits my car"),
    {
      question: "Can I use COD on a body kit?",
      answer:
        "No. Products whose name or URL identify them as a body kit cannot use Cash on Delivery. Use JazzCash, Meezan, or bank transfer for those orders. Underbody LED kits are not treated as body kits.",
    },
  ].filter(Boolean);

  // Fallback if getFaqItems shape drifts
  if (items.length < 5) {
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
      {
        question: "Can I use COD on a body kit?",
        answer:
          "No. Products whose name or URL identify them as a body kit cannot use Cash on Delivery. Use JazzCash, Meezan, or bank transfer for those orders. Underbody LED kits are not treated as body kits.",
      },
    ];
  }
  return items;
}

const WA = String(STORE_CONTACT.whatsapp || "03284010007").replace(/\D/g, "");
const WA_DISPLAY = STORE_CONTACT.whatsapp || "03284010007";
const WA_HREF = `https://wa.me/${STORE_CONTACT.phoneE164?.replace(/\D/g, "") || `92${WA.replace(/^0/, "")}`}`;

export default function CashOnDeliveryPage() {
  const faqs = codLandingFaqs();
  const ld = faqPageJsonLd(faqs);

  return (
    <section className="mx-auto max-w-3xl px-4 py-8 md:px-6 md:py-16">
      {ld ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(ld) }} />
      ) : null}

      <h1 className="text-2xl font-bold md:text-3xl text-zinc-900">Cash on Delivery across Pakistan</h1>
      <p className="mt-3 text-gray-700 leading-relaxed">
        Yes — Cash on Delivery is available nationwide on eligible products. For COD orders, you pay
        delivery charges in advance after placing your order and send the payment screenshot on
        WhatsApp. The product amount is collected when your order arrives.
      </p>

      <h2 className="mt-10 text-xl font-semibold text-zinc-900">How COD works on CrazzyCars</h2>
      <ol className="mt-3 list-decimal space-y-2 pl-5 text-gray-700 leading-relaxed">
        <li>
          <strong>Place your order</strong> on CrazzyCars.pk and choose Cash on Delivery at checkout
          (when the product allows it).
        </li>
        <li>
          <strong>Pay delivery charges in advance</strong> — the rest is Cash on Delivery.
        </li>
        <li>
          <strong>Send your payment screenshot on WhatsApp</strong> to{" "}
          <a className="font-semibold text-red-700 underline-offset-2 hover:underline" href={WA_HREF}>
            {WA_DISPLAY}
          </a>{" "}
          so we can confirm delivery charges and process the order.
        </li>
        <li>
          <strong>Receive your parcel</strong> and pay the <strong>product amount</strong> to the
          courier on delivery.
        </li>
      </ol>

      <h2 className="mt-10 text-xl font-semibold text-zinc-900">Delivery fees</h2>
      <p className="mt-3 text-gray-700 leading-relaxed">{standardDeliveryFeeStatement()}</p>
      <p className="mt-2 text-gray-700 leading-relaxed">
        Roof or trunk spoilers and Express (Daewoo) use a different courier rate shown at checkout.
        Express Delivery (Daewoo), where available, is hidden for body kits and stays on standard
        delivery.
      </p>

      <h2 className="mt-10 text-xl font-semibold text-zinc-900">Delivery times</h2>
      <p className="mt-3 text-gray-700 leading-relaxed">
        Most orders ship within 1–2 business days after payment confirmation (or COD delivery-charge
        confirmation). {deliveryEtaSummary()}
      </p>

      <h2 className="mt-10 text-xl font-semibold text-zinc-900">What cannot use COD</h2>
      <p className="mt-3 text-gray-700 leading-relaxed">
        <strong>Body kits cannot be ordered on Cash on Delivery.</strong>
      </p>
      <p className="mt-2 text-gray-700 leading-relaxed">
        If the product name or URL includes “body kit” / “body kits” (for example a complete body kit
        with front splitter, side skirts, and rear lip), checkout will not offer COD. Pay the full
        order with <strong>JazzCash, Meezan, or bank transfer</strong> instead, then send your payment
        screenshot on WhatsApp.
      </p>
      <p className="mt-2 text-gray-700 leading-relaxed">
        <strong>Note:</strong> LED “underbody” light kits are <strong>not</strong> body kits — those
        can still use COD when otherwise eligible.
      </p>
      <p className="mt-2 text-gray-700 leading-relaxed">
        Some high-value or merchant-flagged items may also require advance payment; checkout shows
        the available methods for that product.
      </p>

      <h2 className="mt-10 text-xl font-semibold text-zinc-900">Returns under COD</h2>
      <p className="mt-3 text-gray-700 leading-relaxed">{returnsFaqAnswer()}</p>
      <p className="mt-2 text-gray-700 leading-relaxed">
        For Cash on Delivery orders, approved full refunds are typically paid by{" "}
        <strong>bank transfer or JazzCash</strong> after we inspect the returned item. Message
        WhatsApp{" "}
        <a className="font-semibold text-red-700 underline-offset-2 hover:underline" href={WA_HREF}>
          {WA_DISPLAY}
        </a>{" "}
        or email{" "}
        <a
          className="font-semibold text-red-700 underline-offset-2 hover:underline"
          href={`mailto:${STORE_CONTACT.email || "info@crazzycars.pk"}`}
        >
          {STORE_CONTACT.email || "info@crazzycars.pk"}
        </a>{" "}
        with your order number, reason, and clear photos to start a claim. See our{" "}
        <Link href="/returns-policy" className="font-semibold text-red-700 underline-offset-2 hover:underline">
          Returns Policy
        </Link>{" "}
        for full details.
      </p>

      <h2 className="mt-10 text-xl font-semibold text-zinc-900">Frequently asked questions</h2>
      <div className="mt-4 space-y-6">
        {faqs.map((faq) => (
          <article key={faq.question}>
            <h3 className="text-lg font-semibold text-zinc-900">{faq.question}</h3>
            <p className="mt-2 text-gray-700 leading-relaxed">{faq.answer}</p>
          </article>
        ))}
      </div>

      <div className="mt-12 flex flex-wrap gap-4">
        <Link
          href="/shop"
          className="inline-flex items-center justify-center rounded-md bg-red-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-800"
        >
          Shop car accessories
        </Link>
        <a
          href={WA_HREF}
          className="inline-flex items-center justify-center rounded-md border border-zinc-300 px-5 py-2.5 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
        >
          WhatsApp us
        </a>
        <Link
          href="/track-order"
          className="inline-flex items-center justify-center rounded-md border border-zinc-300 px-5 py-2.5 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
        >
          Track your order
        </Link>
      </div>
    </section>
  );
}
