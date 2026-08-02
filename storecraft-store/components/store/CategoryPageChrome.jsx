import Link from "next/link";
import { CategoryHeroBanner } from "@/components/store/CategoryHeroBanner";

function plainText(htmlOrText) {
  return String(htmlOrText || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Server-rendered category chrome (breadcrumb + hero H1 + intro).
 * Keep this outside any useSearchParams Suspense island so crawlers always see one H1.
 */
export function CategoryPageChrome({ category, subcategories = [], products = [], brand = null }) {
  if (!category) return null;

  const description =
    plainText(category?.shortDescription) || plainText(category?.description) || "";

  return (
    <div className="cat-page-wrap">
      <nav className="cat-breadcrumb" aria-label="Breadcrumb">
        <Link href="/">Home</Link>
        <span className="cat-breadcrumb__sep">/</span>
        <span className="cat-breadcrumb__current">
          {String(category.slug || category.name || "").toLowerCase()}
        </span>
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
    </div>
  );
}
