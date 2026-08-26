"use client";

import Link from "next/link";

const HIGHLIGHTS = [
  {
    title: "Kitchen Accessories",
    text: "Cookware, storage, cutlery and dining — everyday pieces for a well-run kitchen.",
    href: "/categories/kitchen-accessories",
    accent: "var(--color-primary)",
    cta: "Shop kitchen",
  },
  {
    title: "Beauty Bags",
    text: "Makeup pouches, travel toiletry kits and vanity organizers.",
    href: "/categories/beauty-bags",
    accent: "var(--color-secondary)",
    cta: "Shop beauty bags",
  },
  {
    title: "Ladies Bags",
    text: "Mini handbags, totes, crossbody bags and clutches for every outing.",
    href: "/categories/ladies-bags",
    accent: "var(--color-primary)",
    cta: "Shop ladies bags",
  },
];

export default function CategoryHighlights() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-10 md:py-14">
      <h2 className="mb-6 font-heading text-2xl font-bold text-[#111] md:text-3xl">Shop Homefy</h2>
      <div className="grid gap-4 md:grid-cols-3">
        {HIGHLIGHTS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group rounded-2xl border border-[#E8D9CC] bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <span
              className="mb-3 inline-block h-1.5 w-12 rounded-full"
              style={{ background: item.accent }}
              aria-hidden
            />
            <h3 className="font-heading text-xl font-semibold text-[#111]">{item.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-[#6B7280]">{item.text}</p>
            <span className="mt-4 inline-block text-sm font-semibold" style={{ color: item.accent }}>
              {item.cta} →
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
