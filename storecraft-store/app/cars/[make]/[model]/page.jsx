import { Suspense } from "react";
import { CarAccessoriesClient } from "@/components/cars/CarAccessoriesClient";
import { getCarPageContext } from "@/lib/carPageData";
import { formatModelShortLabel } from "@/lib/carCatalogDisplay";
import { STORE_NAME } from "@/lib/constants";

function LoadingFallback() {
  return (
    <div className="store-container mx-auto max-w-6xl px-4 py-16">
      <div className="h-40 animate-pulse rounded-xl bg-[#E5E7EB]" />
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="aspect-[3/4] animate-pulse rounded-xl bg-[#E5E7EB]" />
        ))}
      </div>
    </div>
  );
}

export async function generateMetadata({ params }) {
  const { make, model } = await params;
  const ctx = await getCarPageContext(make, model);
  if (!ctx?.entry) {
    return {
      title: `Car Accessories | ${STORE_NAME}`,
      description: `Find car accessories at ${STORE_NAME}. Seat covers, floor mats, steering covers and more.`,
    };
  }
  const label = formatModelShortLabel(ctx.entry) || ctx.entry.model;
  const title = `${ctx.makeName} ${label} Accessories | ${STORE_NAME}`;
  const description = `Find accessories for ${ctx.makeName} ${label}. Seat covers, floor mats, steering covers and more.`;
  return { title, description };
}

export default async function CarAccessoriesPage({ params, searchParams }) {
  const { make, model } = await params;
  const sp = await searchParams;
  const carContext = await getCarPageContext(make, model);

  return (
    <Suspense fallback={<LoadingFallback />}>
      <CarAccessoriesClient
        makeSlug={make}
        modelSlug={model}
        carContext={carContext}
        initialYear={sp?.year || ""}
        initialVariant={sp?.variant || ""}
      />
    </Suspense>
  );
}
