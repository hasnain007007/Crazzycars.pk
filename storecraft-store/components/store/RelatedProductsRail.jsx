"use client";

import { ProductCard } from "./ProductCard";

/** Below-the-fold related rail — dynamically imported from the PDP shell. */
export default function RelatedProductsRail({ products = [] }) {
  if (!Array.isArray(products) || !products.length) {
    return (
      <section className="mx-auto mt-12 max-w-7xl px-4">
        <h2 className="mb-4 text-center text-xl font-bold md:mb-6 md:text-2xl">You May Also Like</h2>
        <p className="text-center text-sm text-[#707070]">No related products available.</p>
      </section>
    );
  }

  return (
    <section className="mx-auto mt-12 max-w-7xl px-4">
      <h2 className="mb-4 text-center text-xl font-bold md:mb-6 md:text-2xl">You May Also Like</h2>
      <div className="product-grid grid grid-cols-2 gap-2 sm:gap-2.5 lg:grid-cols-4 xl:grid-cols-5">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}
