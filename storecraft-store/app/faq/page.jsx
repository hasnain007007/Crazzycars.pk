import Link from "next/link";
import { buildPageMetadata } from "@/lib/pageMetadata";
import { getFaqItems } from "@/lib/storePolicyCopy";

export const metadata = buildPageMetadata({
  title: "FAQ — Shipping, COD & Orders | Homefy.pk",
  description:
    "Answers about Cash on Delivery, delivery charges, order tracking, returns, and payments for kitchen accessories, beauty bags and ladies bags in Pakistan.",
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <h1 className="text-2xl font-bold md:text-3xl">Frequently Asked Questions</h1>
      <p className="mt-3 text-gray-600">
        Quick answers about shopping kitchen accessories, beauty bags and ladies bags on Homefy.pk — COD, payments, and
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
      <Link className="mt-10 inline-block font-semibold text-red-700" href="/contact">
        Still need help? Contact us
      </Link>
    </section>
  );
}
