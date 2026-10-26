import Link from "next/link";
import { categoryHref } from "@/lib/categories";

/** Inline clip so the tree stays invisible if Tailwind/CSS chunks lag during deploy. */
const SEO_NAV_STYLE = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  clipPath: "inset(50%)",
  whiteSpace: "nowrap",
  borderWidth: 0,
};

/**
 * Always-SSR category link tree for crawlers and keyboard users.
 * Interactive MegaMenu chrome loads on demand separately.
 */
export function CategoryMegaSsrLinks({ categories = [] }) {
  const rows = Array.isArray(categories) ? categories : [];
  if (!rows.length) return null;

  return (
    <nav className="sr-only cc-seo-nav" aria-label="Shop by category" style={SEO_NAV_STYLE}>
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
