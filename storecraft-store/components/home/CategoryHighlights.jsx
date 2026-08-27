"use client";

import Link from "next/link";

const HIGHLIGHTS = [
  {
    title: "Kitchen Accessories",
    text: "Cookware, storage, cutlery and dining.",
    href: "/categories/kitchen-accessories",
    image: "/images/catalog/kitchen-accessories.svg",
    accent: "var(--color-primary)",
    cta: "Shop kitchen",
  },
  {
    title: "Beauty & Travel Bags",
    text: "Makeup pouches, travel kits and vanity organizers — bags, not cosmetics.",
    href: "/categories/beauty-bags",
    image: "/images/catalog/beauty-bags.svg",
    accent: "var(--color-secondary)",
    cta: "Shop beauty & travel bags",
  },
  {
    title: "Ladies Bags",
    text: "Totes, crossbody bags and clutches.",
    href: "/categories/ladies-bags",
    image: "/images/catalog/ladies-bags.svg",
    accent: "var(--color-primary)",
    cta: "Shop ladies bags",
  },
];

export default function CategoryHighlights() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-5 md:py-6">
      <h2 className="mb-1 font-heading text-lg font-bold text-[#111] md:text-xl">Shop Homefy</h2>
      <p className="mb-3 text-sm text-[#6B7280]">Three departments — kitchen, bags for beauty on the go, and ladies handbags.</p>
      <div className="grid gap-2 md:grid-cols-3">
        {HIGHLIGHTS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex min-h-[44px] items-center gap-3 rounded-xl border border-[#E8D9CC] bg-white p-2.5 transition hover:border-[var(--color-primary)] hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.image}
              alt=""
              className="h-16 w-16 shrink-0 rounded-lg object-cover md:h-[72px] md:w-[72px]"
            />
            <div className="min-w-0">
              <h3 className="font-heading text-sm font-semibold text-[#111] md:text-base">{item.title}</h3>
              <p className="mt-0.5 text-xs leading-snug text-[#6B7280]">{item.text}</p>
              <span className="mt-1 inline-block text-xs font-semibold" style={{ color: item.accent }}>
                {item.cta} →
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
