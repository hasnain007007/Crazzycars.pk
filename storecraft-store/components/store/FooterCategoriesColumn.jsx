"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { categoryHref } from "@/lib/categories";

/** Parent categories only — nested children made the footer taller than the page. */
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
      <h4 className="footer-heading">Categories</h4>
      {parents.length === 0 ? (
        <p className="footer-meta">Categories will appear here once seeded.</p>
      ) : (
        <ul className="footer-cats">
          {parents.map((p) => (
            <li key={p.slug}>
              <Link href={categoryHref(p.slug)}>{p.name}</Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
