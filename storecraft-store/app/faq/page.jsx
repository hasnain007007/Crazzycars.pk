import Link from "next/link";
import { buildPageMetadata } from "@/lib/pageMetadata";

export const metadata = buildPageMetadata({
  title: "Frequently Asked Questions | Crazzycars.pk",
  description: "Answers to common questions about shopping at Crazzycars.pk.",
  path: "/faq",
  absoluteTitle: true,
});

const faqs = [
  ["Do you offer cash on delivery?", "Yes, cash on delivery is available across Pakistan."],
  ["How can I track my order?", "Use the tracking number from your order confirmation on our order tracking page."],
  ["How do I get product help?", "Contact our support team for fitment and product advice."],
];

export default function FaqPage() {
  return <section className="mx-auto max-w-3xl px-6 py-16"><h1 className="text-3xl font-bold">Frequently Asked Questions</h1><div className="mt-8 space-y-5">{faqs.map(([question, answer]) => <article key={question}><h2 className="text-lg font-semibold">{question}</h2><p className="mt-1 text-gray-700">{answer}</p></article>)}</div><Link className="mt-10 inline-block font-semibold text-red-700" href="/contact">Contact us for more help</Link></section>;
}
