import Link from "next/link";
import { buildPageMetadata } from "@/lib/pageMetadata";
import { getFaqItems } from "@/lib/storePolicyCopy";
import { safeJsonLd } from "@/lib/safeJsonLd";

export const metadata = buildPageMetadata({
  title: "FAQ — Shipping, COD & Fitment | Crazzycars.pk",
  description:
    "Answers about Cash on Delivery, delivery charges, order tracking, product fitment, returns, and payments for car accessories in Pakistan.",
  path: "/faq",
  absoluteTitle: true,
});

export default function FaqPage() {
  const faqs = getFaqItems();
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
        Quick answers about shopping car accessories on Crazzycars.pk — COD, payments, fitment, and
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
        .
      </p>
      <Link className="mt-6 inline-block font-semibold text-red-700" href="/contact">
        Still need help? Contact us
      </Link>
    </section>
  );
}
