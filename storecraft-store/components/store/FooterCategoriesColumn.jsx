"use client";

import Link from "next/link";
import { CRAZZYCARS_CATEGORIES, categoryHref } from "@/lib/categories";

/** Footer category links — shared CrazzyCars.pk catalog constants. */
export function FooterCategoriesColumn() {
  const links = CRAZZYCARS_CATEGORIES.map((c) => ({
    label: c.name,
    href: categoryHref(c.slug),
  }));

  return (
    <div>
      <h4 className="mb-4 text-sm font-bold text-white">Categories</h4>
      <ul className="space-y-2">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="text-sm transition hover:text-white" style={{ color: "#9CA3AF" }}>
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
