/**
 * Server-rendered, crawlable related links under a product:
 * "More for your {car}" (same car page) and "Same category". Plain <a> lists, no JS.
 */
import Link from "next/link";
import { displayProductName } from "@/lib/displayProductName";

function LinkList({ title, href, hrefLabel, items }) {
  if (!items?.length) return null;
  return (
    <section className="pdp-related-links" aria-label={title}>
      <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 10px", color: "#111" }}>{title}</h2>
      <ul style={{ display: "grid", gap: 6, gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", margin: 0, padding: 0, listStyle: "none" }}>
        {items.map((p) => (
          <li key={p.slug}>
            <Link href={`/${p.slug}`} style={{ color: "#C41E1E", fontSize: 14 }}>
              {displayProductName(p.name)}
            </Link>
          </li>
        ))}
      </ul>
      {href ? (
        <p style={{ margin: "10px 0 0", fontSize: 14 }}>
          <Link href={href} style={{ fontWeight: 600, color: "#111", textDecoration: "underline" }}>
            {hrefLabel}
          </Link>
        </p>
      ) : null}
    </section>
  );
}

export function ProductRelatedLinks({ car, carProducts, category, categoryProducts }) {
  if (!carProducts?.length && !categoryProducts?.length) return null;
  return (
    <div className="store-container" style={{ padding: "8px 16px 32px", display: "grid", gap: 28 }}>
      <LinkList
        title={car ? `More for your ${car.label}` : "More for your car"}
        href={car ? `/cars/${car.slug}` : null}
        hrefLabel={car ? `All ${car.label} accessories` : ""}
        items={carProducts}
      />
      <LinkList
        title={category ? `More in ${category.name}` : "Same category"}
        href={category ? `/categories/${category.slug}` : null}
        hrefLabel={category ? `All ${category.name}` : ""}
        items={categoryProducts}
      />
    </div>
  );
}
