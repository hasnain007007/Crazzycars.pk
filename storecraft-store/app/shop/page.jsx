import { Suspense } from "react";
import { ProductsBrowseMedico } from "@/components/store/ProductsBrowseMedico";
import { fetchProductsServer } from "@/lib/serverProductFetch";
import { buildPageMetadata } from "@/lib/pageMetadata";

export const metadata = buildPageMetadata({
  title: "Shop All Car Accessories",
  description:
    "Browse premium car accessories in Pakistan. Filter by category, brand, and car make. Cash on delivery available nationwide from Crazzycars.pk.",
  path: "/shop",
});

function Fallback() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-10">
      <div className="h-10 w-48 animate-pulse rounded-lg bg-zinc-200" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="aspect-[3/4] animate-pulse rounded-2xl bg-zinc-200" />
        ))}
      </div>
    </div>
  );
}

export default async function ShopPage({ searchParams }) {
  const sp = (await searchParams) || {};
  const q = String(sp.q || "").trim();
  const page = Math.max(1, parseInt(String(sp.page || "1"), 10) || 1);
  const {
    products: initialProducts,
    total: initialTotal,
    totalPages: initialTotalPages,
  } = await fetchProductsServer({
    limit: 40,
    page,
    q,
  });

  return (
    <div className="min-h-screen bg-[#F8F8F8]">
      <Suspense fallback={<Fallback />}>
        <ProductsBrowseMedico
          initialProducts={initialProducts}
          initialTotal={initialTotal}
          initialPage={page}
          initialTotalPages={initialTotalPages}
          initialQuery={q}
        />
      </Suspense>
    </div>
  );
}
