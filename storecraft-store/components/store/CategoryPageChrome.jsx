import Link from "next/link";
import { CategoryHeroBanner } from "@/components/store/CategoryHeroBanner";
import { categoryHref } from "@/lib/categories";
import { sanitizeCategoryHtml } from "@/lib/sanitizeHtml";

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
 * Prefer full description HTML; fall back to shortDescription.
 * Renders sanitized HTML (entities decoded) for crawlers and shoppers.
 */
function resolveCategoryDescriptionHtml(category) {
  const raw =
    String(category?.description || "").trim() ||
    String(category?.shortDescription || "").trim() ||
    "";
  return sanitizeCategoryHtml(raw);
}

/** Split intro paragraphs from H3/P FAQ-style pairs for layout. */
export function splitCategoryDescriptionHtml(html) {
  const safe = String(html || "").trim();
  if (!safe) return { summaryHtml: "", remainderHtml: "", faqPairs: [] };
  const faqPairs = [];
  const re = /<h3[^>]*>([\s\S]*?)<\/h3>\s*<p[^>]*>([\s\S]*?)<\/p>/gi;
  let m;
  while ((m = re.exec(safe))) {
    const q = String(m[1] || "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const a = String(m[2] || "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (q && a) faqPairs.push({ question: q, answer: a });
  }
  const firstH3 = safe.search(/<h3[\s>]/i);
  if (firstH3 > 0) {
    return {
      summaryHtml: safe.slice(0, firstH3).trim(),
      remainderHtml: safe.slice(firstH3).trim(),
      faqPairs,
    };
  }
  return { summaryHtml: safe, remainderHtml: "", faqPairs };
}

export function CategoryPageChrome({
  category,
  subcategories = [],
  products = [],
  brand = null,
  crumbs = [],
  showFullDescription = true,
}) {
  if (!category) return null;

  const descriptionHtml = resolveCategoryDescriptionHtml(category);
  const { summaryHtml, remainderHtml } = splitCategoryDescriptionHtml(descriptionHtml);

  const relatedGuides = (Array.isArray(category?.relatedGuides) ? category.relatedGuides : [])
    .map((g) => ({
      title: String(g?.title || "").trim(),
      href: String(g?.href || "").trim(),
    }))
    .filter((g) => g.title && g.href.startsWith("/"));

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

      {summaryHtml ? (
        <>
          <hr className="cat-hero-divider" />
          <div
            className="cat-desc cat-desc--html prose prose-neutral max-w-none"
            dangerouslySetInnerHTML={{ __html: summaryHtml }}
          />
        </>
      ) : null}

      {relatedGuides.length ? (
        <nav className="cat-related-guides" aria-label="Related guides" style={{ marginTop: 12, marginBottom: 8 }}>
          <p className="cat-desc" style={{ marginBottom: 6 }}>
            <strong>Related guides</strong>
          </p>
          <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
            {relatedGuides.map((g) => (
              <li key={g.href}>
                <Link href={g.href}>{g.title}</Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}

      <CategorySubcategoryMarquee subcategories={subcategories} />

      {showFullDescription && remainderHtml ? (
        <div
          className="cat-desc cat-desc--html cat-desc--below prose prose-neutral max-w-none"
          style={{ marginTop: 24 }}
          dangerouslySetInnerHTML={{ __html: remainderHtml }}
        />
      ) : null}
    </div>
  );
}
