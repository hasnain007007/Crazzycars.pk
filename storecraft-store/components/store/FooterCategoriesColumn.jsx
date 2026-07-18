"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { categoryHref } from "@/lib/categories";

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

/** Footer categories from MongoDB (admin). Empty until you add categories. */
export function FooterCategoriesColumn() {
  const [links, setLinks] = useState([]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/categories?showInFooter=true", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const cats = data?.categories || data?.data || [];
        const mapped = (Array.isArray(cats) ? cats : [])
          .filter((c) => c?.slug && c?.name)
          .map((c) => ({ label: c.name, href: categoryHref(c.slug) }));
        // If none marked for footer, fall back to all active categories
        if (mapped.length) {
          setLinks(mapped);
          return;
        }
        return fetch("/api/categories", { cache: "no-store" })
          .then((r) => r.json())
          .then((all) => {
            if (cancelled) return;
            const list = all?.categories || all?.data || [];
            setLinks(
              (Array.isArray(list) ? list : [])
                .filter((c) => c?.slug && c?.name && !c.parentId)
                .slice(0, 20)
                .map((c) => ({ label: c.name, href: categoryHref(c.slug) }))
            );
          });
      })
      .catch(() => {
        if (!cancelled) setLinks([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <h4 style={colHeading}>Categories</h4>
      {links.length === 0 ? (
        <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.55)", lineHeight: 1.6 }}>
          Categories will appear here once you add them in admin.
        </p>
      ) : (
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
      )}
    </div>
  );
}
