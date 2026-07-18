import { Suspense } from "react";
import { ProductsBrowseMedico } from "@/components/store/ProductsBrowseMedico";
import { fetchProductsServer } from "@/lib/serverProductFetch";
import { buildPageMetadata } from "@/lib/pageMetadata";

export const metadata = buildPageMetadata({
  title: "Shop All Car Accessories | Crazzycars.pk",
  description:
    "Browse premium car accessories in Pakistan — splitters, LED headlights, body kits, spoilers, carbon fiber parts, and more. Cash on delivery available.",
  path: "/products",
});

function Fallback() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-10">
      <div className="h-10 w-48 animate-pulse rounded-lg bg-zinc-300" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="aspect-[3/4] animate-pulse rounded-2xl bg-zinc-300" />
        ))}
      </div>
    </div>
  );
}

export default async function Page() {
  const { products: initialProducts, total: initialTotal } = await fetchProductsServer({
    limit: 12,
    page: 1,
  });

  return (
    <div style={{ background: "#F5F5F5", minHeight: "100vh" }}>
      <div className="mx-auto max-w-7xl px-4 pt-8 pb-2">
        <h1 className="sr-only">Shop All Car Accessories | Crazzycars.pk</h1>
        <p
          style={{
            margin: "0 0 8px",
            fontSize: 15,
            lineHeight: 1.6,
            color: "#333333",
            maxWidth: 720,
          }}
        >
          Browse our complete collection of premium car accessories. Shop splitters, LED lights,
          body kits, spoilers, carbon fiber parts, and more — with cash on delivery across Pakistan.
        </p>
      </div>
      <Suspense fallback={<Fallback />}>
        <ProductsBrowseMedico
          initialProducts={initialProducts}
          initialTotal={initialTotal}
        />
      </Suspense>
    </div>
  );
}
