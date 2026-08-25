import Link from "next/link";
import { CategoryHeroBanner } from "@/components/store/CategoryHeroBanner";
import { categoryHref } from "@/lib/categories";

function plainText(htmlOrText) {
  return String(htmlOrText || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function CategorySubcategoryMarquee({ subcategories = [] }) {
  if (!subcategories.length) return null;
  return (
    <section className="subcat-circle-section" style={{ marginBottom: 20 }}>
      <h2 className="cat-section-title">Shop By Categories</h2>
      <div className="subcat-circle-marquee" aria-label="Subcategories">
        <div
          className="subcat-circle-track"
          style={{
            animationDuration: `${Math.max(subcategories.length * 3.2, 28)}s`,
          }}
        >
          {[0, 1].map((copy) =>
            subcategories.map((sub, idx) => (
              <Link
                key={`${copy}-${sub._id || sub.slug}`}
                href={categoryHref(sub.slug)}
                className="subcat-circle-item"
                tabIndex={copy === 0 ? undefined : -1}
                aria-hidden={copy === 1 ? true : undefined}
                style={
                  copy === 0 ? { animationDelay: `${Math.min(idx, 12) * 45}ms` } : undefined
                }
              >
                <span className="subcat-circle-ring">
                  {sub.image?.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={sub.image.url}
                      alt={copy === 0 ? sub.image?.altText || sub.name : ""}
                      title={sub.image?.title || sub.name}
                      loading="lazy"
                      draggable={false}
                    />
                  ) : (
                    <span className="subcat-circle-fallback" aria-hidden>
                      {(sub.name || "?").charAt(0)}
                    </span>
                  )}
                </span>
                <span className="subcat-circle-label">{sub.name}</span>
              </Link>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

/**
 * Server-rendered category chrome (breadcrumb + hero H1 + intro + subcategories).
 * Keep this outside any client island so crawlers always see one H1.
 */
export function CategoryPageChrome({
  category,
  subcategories = [],
  products = [],
  brand = null,
  crumbs = [],
}) {
  if (!category) return null;

  const description =
    plainText(category?.shortDescription) || plainText(category?.description) || "";

  const trail =
    Array.isArray(crumbs) && crumbs.length
      ? crumbs
      : [
          { name: "Home", url: "/" },
          { name: "Categories", url: "/categories" },
          { name: category.name, url: `/categories/${category.slug}` },
        ];
  const current = trail[trail.length - 1];
  const parents = trail.slice(0, -1);

  return (
    <div className="cat-page-wrap">
      <nav className="cat-breadcrumb" aria-label="Breadcrumb">
        {parents.map((c, i) => (
          <span key={c.url || `${c.name}-${i}`} className="cat-breadcrumb__bit">
            {i > 0 ? <span className="cat-breadcrumb__sep">/</span> : null}
            <Link href={c.url || "/"}>{c.name}</Link>
          </span>
        ))}
        <span className="cat-breadcrumb__sep">/</span>
        <span className="cat-breadcrumb__current">{current?.name || category.name}</span>
      </nav>

      <CategoryHeroBanner
        category={category}
        subcategories={subcategories}
        products={products}
        brand={brand}
      />

      {description ? (
        <>
          <hr className="cat-hero-divider" />
          <p className="cat-desc">{description}</p>
        </>
      ) : null}

      <CategorySubcategoryMarquee subcategories={subcategories} />
    </div>
  );
}
