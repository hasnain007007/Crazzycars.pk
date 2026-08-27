"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { categoryHref } from "@/lib/categories";
import { fetchCategoryTree } from "@/lib/fetchCategoryTree";

const ROOT_SLUGS = new Set(["kitchen-accessories", "beauty-bags", "ladies-bags"]);

const FALLBACK = [
  { name: "Cookware", slug: "cookware" },
  { name: "Storage & Containers", slug: "storage-containers" },
  { name: "Cutlery & Gadgets", slug: "cutlery-gadgets" },
  { name: "Dining & Serveware", slug: "dining-serveware" },
  { name: "Makeup Pouches", slug: "makeup-pouches" },
  { name: "Travel Toiletry Bags", slug: "travel-toiletry-bags" },
  { name: "Vanity & Organizer Bags", slug: "vanity-organizer-bags" },
  { name: "Mini Handbags", slug: "mini-handbags" },
  { name: "Tote Bags", slug: "tote-bags" },
  { name: "Crossbody Bags", slug: "crossbody-bags" },
  { name: "Clutches", slug: "clutches" },
];

function catalogImage(slug) {
  return `/images/catalog/${slug}.svg`;
}

function mapItem(node) {
  const slug = String(node?.slug || "").trim();
  const name = String(node?.name || "").trim();
  if (!slug || !name) return null;
  const imageUrl =
    (typeof node.image === "string" && node.image) ||
    node.image?.url ||
    node.imageUrl ||
    catalogImage(slug);
  return {
    name,
    slug,
    href: categoryHref(slug),
    imageUrl,
    imageAlt: node.image?.altText || node.imageAlt || name,
  };
}

function pickCollections(tree) {
  const seen = new Set();
  const out = [];
  for (const root of Array.isArray(tree) ? tree : []) {
    const kids = Array.isArray(root?.children) ? root.children : [];
    const source = kids.length ? kids : ROOT_SLUGS.has(root?.slug) ? [] : [root];
    for (const node of source) {
      if (ROOT_SLUGS.has(node?.slug) || seen.has(node?.slug)) continue;
      const item = mapItem(node);
      if (!item) continue;
      seen.add(item.slug);
      out.push(item);
    }
  }
  return out;
}

export default function LookbookStrip() {
  const [items, setItems] = useState(() => FALLBACK.map(mapItem).filter(Boolean));

  useEffect(() => {
    fetchCategoryTree().then((tree) => {
      const list = pickCollections(tree);
      if (list.length) setItems(list);
    });
  }, []);

  if (!items.length) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 pb-4 md:pb-6">
      <div className="mb-1 flex items-end justify-between gap-3">
        <div>
          <h2 className="font-heading text-xl font-bold text-[#111] md:text-2xl">Shop by collection</h2>
          <p className="mt-0.5 text-sm text-[#6B7280]">Picks from kitchen and bags.</p>
        </div>
        <Link href="/shop" className="text-sm font-semibold text-[var(--color-primary)] hover:underline">
          Shop all →
        </Link>
      </div>
      <div className="subcat-circle-marquee" aria-label="Collections">
        <div
          className="subcat-circle-track"
          style={{ animationDuration: `${Math.max(items.length * 3.2, 28)}s` }}
        >
          {[0, 1].map((copy) =>
            items.map((item, idx) => (
              <Link
                key={`${copy}-${item.slug}`}
                href={item.href}
                className="subcat-circle-item"
                tabIndex={copy === 0 ? undefined : -1}
                aria-hidden={copy === 1 ? true : undefined}
                style={copy === 0 ? { animationDelay: `${Math.min(idx, 12) * 45}ms` } : undefined}
              >
                <span className="subcat-circle-ring">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.imageUrl}
                    alt={copy === 0 ? item.imageAlt : ""}
                    title={item.name}
                    loading="lazy"
                    draggable={false}
                  />
                </span>
                <span className="subcat-circle-label">{item.name}</span>
              </Link>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
