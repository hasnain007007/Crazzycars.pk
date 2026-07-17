import CarCatalogManager from "@/components/car-catalog/CarCatalogManager";

export default function CarCatalogPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="mb-6 text-2xl font-bold text-slate-900 dark:text-white">Car Catalog</h1>
      <CarCatalogManager />
    </div>
  );
}
