"use client";

import Link from "next/link";

const LOOKS = [
  {
    title: "Cookware",
    href: "/categories/cookware",
    image: "/images/catalog/cookware.svg",
  },
  {
    title: "Makeup Pouches",
    href: "/categories/makeup-pouches",
    image: "/images/catalog/makeup-pouches.svg",
  },
  {
    title: "Tote Bags",
    href: "/categories/tote-bags",
    image: "/images/catalog/tote-bags.svg",
  },
  {
    title: "Clutches",
    href: "/categories/clutches",
    image: "/images/catalog/clutches.svg",
  },
];

export default function LookbookStrip() {
  return (
    <section className="mx-auto max-w-7xl px-4 pb-10 md:pb-14">
      <div className="mb-6 flex items-end justify-between gap-3">
        <div>
          <h2 className="font-heading text-2xl font-bold text-[#111] md:text-3xl">The lookbook</h2>
          <p className="mt-1 text-sm text-[#6B7280]">Editorial picks from kitchen and bags.</p>
        </div>
        <Link href="/shop" className="text-sm font-semibold text-[var(--color-primary)] hover:underline">
          Shop all →
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {LOOKS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group relative overflow-hidden rounded-2xl"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.image} alt="" className="aspect-[4/5] w-full object-cover transition duration-300 group-hover:scale-[1.03]" />
            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 py-4 text-sm font-semibold text-white md:text-base">
              {item.title}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
