import { Fragment } from "react";
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
  emptyMessage = "No products found.",
}) {
  const viewMeta = LISTING_VIEWS.find((v) => v.id === view) || LISTING_VIEWS[0];
  const rows = Array.isArray(products) ? products : [];
  const isRowView = view === "list" || view === "detail";

  if (!rows.length) {
    return (
      <section id={id} aria-label="Products" className="py-12 text-center text-sm text-[#888888]">
        <p>{emptyMessage}</p>
      </section>
    );
  }

  return (
    <section id={id} aria-label="Products">
      {isRowView ? (
        <div className="pl-rows">
          {rows.map((product, idx) => (
            <Fragment key={String(product?.id || product?._id || product?.slug || idx)}>
              {"\n"}
              <ServerProductCard
                product={product}
                categoryName={categoryName}
                priority={idx < 4}
                variant={view}
              />
            </Fragment>
          ))}
        </div>
      ) : (
        <div className={`grid product-grid gap-2 md:gap-4 ${viewMeta.cols}`}>
          {rows.map((product, idx) => (
            <Fragment key={String(product?.id || product?._id || product?.slug || idx)}>
              {"\n"}
              <ServerProductCard
                product={product}
                categoryName={categoryName}
                priority={idx < 4}
                variant="grid"
              />
            </Fragment>
          ))}
        </div>
      )}
    </section>
  );
}
