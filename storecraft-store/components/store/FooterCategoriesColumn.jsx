"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { categoryHref } from "@/lib/categories";

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

/** Footer categories — prefer SSR tree from layout; fall back to GET /api/categories/tree. */
export function FooterCategoriesColumn({ initialCategoryTree = null }) {
  const [parents, setParents] = useState(() =>
    Array.isArray(initialCategoryTree)
      ? initialCategoryTree.filter((c) => c?.slug && c?.name)
      : []
  );

  useEffect(() => {
    if (Array.isArray(initialCategoryTree) && initialCategoryTree.length) {
      import("@/lib/fetchCategoryTree").then(({ seedCategoryTree }) => {
        seedCategoryTree(initialCategoryTree);
      });
      setParents(initialCategoryTree.filter((c) => c?.slug && c?.name));
      return undefined;
    }
    let cancelled = false;
    import("@/lib/fetchCategoryTree")
      .then(({ fetchCategoryTree }) => fetchCategoryTree())
      .then((tree) => {
        if (!cancelled) {
          setParents(Array.isArray(tree) ? tree.filter((c) => c?.slug && c?.name) : []);
        }
      })
      .catch(() => {
        if (!cancelled) setParents([]);
      });
    return () => {
      cancelled = true;
    };
  }, [initialCategoryTree]);

  return (
    <div>
      <h4 style={colHeading}>Categories</h4>
      {parents.length === 0 ? (
        <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.55)", lineHeight: 1.6 }}>
          Categories will appear here once seeded.
        </p>
      ) : (
        <ul className="space-y-3">
          {parents.map((p) => (
            <li key={p.slug}>
              <Link
                href={categoryHref(p.slug)}
                className="block text-[13px] font-bold leading-[1.6] transition-opacity hover:opacity-60"
                style={{ color: "#FFFFFF", textDecoration: "none" }}
              >
                {p.name}
              </Link>
              {(p.children || []).slice(0, 4).map((ch) => (
                <Link
                  key={ch.slug}
                  href={categoryHref(ch.slug)}
                  className="block text-[12px] leading-[1.8] transition-opacity hover:opacity-60"
                  style={{ color: "rgba(255,255,255,0.7)", textDecoration: "none", paddingLeft: 8 }}
                >
                  {ch.name}
                </Link>
              ))}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
