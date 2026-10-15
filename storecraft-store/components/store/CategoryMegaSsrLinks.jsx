import Link from "next/link";
import { categoryHref } from "@/lib/categories";

/**
 * Always-SSR category link tree for crawlers and keyboard users.
 * Interactive MegaMenu chrome loads on demand separately.
 */
export function CategoryMegaSsrLinks({ categories = [] }) {
  const rows = Array.isArray(categories) ? categories : [];
  if (!rows.length) return null;

  return (
    <nav className="sr-only" aria-label="Shop by category">
      <ul>
        {rows.map((cat) => (
          <li key={String(cat._id || cat.slug)}>
            <Link href={categoryHref(cat.slug)}>{cat.name}</Link>
            {Array.isArray(cat.children) && cat.children.length ? (
              <ul>
                {cat.children.map((sub) => (
                  <li key={String(sub._id || sub.slug)}>
                    <Link href={categoryHref(sub.slug)}>{sub.name}</Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ul>
    </nav>
  );
}
