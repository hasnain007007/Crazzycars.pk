import { LISTING_VIEWS } from "@/lib/productListing";
import { ServerProductCard } from "@/components/store/ServerProductCard";

/**
 * Server-rendered product grid for listing pages.
 * Must stay in the initial HTML for crawlers (no JS required).
 */
export function ServerProductGrid({
  products = [],
  categoryName,
  view = "grid",
  id = "server-product-listing",
}) {
  const viewMeta = LISTING_VIEWS.find((v) => v.id === view) || LISTING_VIEWS[0];
  const rows = Array.isArray(products) ? products : [];

  if (!rows.length) {
    return (
      <section id={id} aria-label="Products" className="py-12 text-center text-sm text-[#888888]">
        <p>No products found.</p>
      </section>
    );
  }

  return (
    <section id={id} aria-label="Products">
      <div className={`grid gap-4 ${viewMeta.cols}`}>
        {rows.map((product, idx) => (
          <ServerProductCard
            key={String(product?.id || product?._id || product?.slug || idx)}
            product={product}
            categoryName={categoryName}
            priority={idx < 4}
          />
        ))}
      </div>
    </section>
  );
}
