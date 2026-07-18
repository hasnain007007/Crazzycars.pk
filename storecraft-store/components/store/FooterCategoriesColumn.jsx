"use client";

import Link from "next/link";
import { CRAZZYCARS_CATEGORIES, categoryHref } from "@/lib/categories";

/** Same heading treatment as Shop / Customer Care in StoreFooterMedico. */
const colHeading = {
  fontSize: 13,
  fontWeight: 700,
  color: "#FFFFFF",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  margin: "0 0 20px",
  paddingBottom: 12,
  borderBottom: "1px solid rgba(255,255,255,0.15)",
  whiteSpace: "nowrap",
};

/** Footer category links — shared CrazzyCars.pk catalog constants. */
export function FooterCategoriesColumn() {
  const links = CRAZZYCARS_CATEGORIES.map((c) => ({
    label: c.name,
    href: categoryHref(c.slug),
  }));

  return (
    <div>
      <h4 style={colHeading}>Categories</h4>
      <ul className="space-y-2">
        {links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="block text-[13px] font-semibold leading-[2] transition-opacity hover:opacity-60"
              style={{ color: "#FFFFFF", textDecoration: "none" }}
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
