import Link from "next/link";
import { PREPAID_DISCOUNT_PERCENT } from "@/config/checkout-money";
import { dbConnect } from "@/lib/db";
import Settings, { SETTINGS_SINGLETON_KEY } from "@/lib/models/Settings.model";
import { buildPageMetadata } from "@/lib/pageMetadata";
import { getFaqItems } from "@/lib/storePolicyCopy";
import { safeJsonLd } from "@/lib/safeJsonLd";

export const metadata = buildPageMetadata({
  title: "FAQ — Shipping, COD & Fitment | CrazzyCars.pk",
  description:
    "Answers about Cash on Delivery, delivery charges, order tracking, product fitment, returns, and payments for car accessories in Pakistan.",
  path: "/faq",
  absoluteTitle: true,
});

async function loadPrepaidPercent() {
  try {
    await dbConnect();
    const doc =
      (await Settings.findOne({ singletonKey: SETTINGS_SINGLETON_KEY }).lean()) ||
      (await Settings.findOne({}).lean());
    const n = Number(doc?.storePayment?.advancePaymentDiscountPercent);
    return Number.isFinite(n) && n >= 0 ? n : PREPAID_DISCOUNT_PERCENT;
  } catch {
    return PREPAID_DISCOUNT_PERCENT;
  }
}

export default async function FaqPage() {
  const prepaidPercent = await loadPrepaidPercent();
  const faqs = getFaqItems({ prepaidPercent });
  const ld = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };
  return (
    <section className="mx-auto max-w-3xl px-4 py-8 md:px-6 md:py-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(ld) }} />
      <h1 className="text-2xl font-bold md:text-3xl">Frequently Asked Questions</h1>
      <p className="mt-3 text-gray-600">
        Quick answers about shopping car accessories on CrazzyCars.pk — COD, payments, fitment, and
        delivery across Pakistan.
      </p>
      <div className="mt-8 space-y-6">
        {faqs.map((faq) => (
          <article key={faq.question}>
            <h2 className="text-lg font-semibold text-zinc-900">{faq.question}</h2>
            <p className="mt-2 text-gray-700 leading-relaxed">{faq.answer}</p>
          </article>
        ))}
      </div>
      <p className="mt-8 text-gray-700">
        More detail on how COD works, body-kit exceptions, and refunds:{" "}
        <Link className="font-semibold text-red-700" href="/cash-on-delivery">
          Cash on Delivery
        </Link>
        . Policy pages:{" "}
        {/* TODO(M4c): restore blog posts then switch these back to
            /blogs/car-accessories-returns-wrong-item-pakistan-crazzycars and
            /blogs/crazzycars-delivery-charges-regular-vs-bulky-pakistan */}
        <Link className="font-semibold text-red-700" href="/returns-policy">
          returns &amp; wrong-item
        </Link>
        {" · "}
        <Link className="font-semibold text-red-700" href="/shipping-policy">
          delivery charges (regular vs bulky)
        </Link>
        .
      </p>
      <Link className="mt-6 inline-block font-semibold text-red-700" href="/contact">
        Still need help? Contact us
      </Link>
    </section>
  );
}
