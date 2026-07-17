import { dbConnect } from "@/lib/db";
import CarCatalog from "@/lib/models/CarCatalog.model";
import { buildCatalogFromMakes } from "@/lib/carCatalogApi";
import { findCatalogBySlugs } from "@/lib/carCatalogDisplay";

export async function getCarPageContext(makeSlug, modelSlug) {
  await dbConnect();
  const docs = await CarCatalog.find({ isActive: true }).sort({ order: 1, name: 1 }).lean();
  if (!docs.length) return null;
  const { carData, makesMeta } = buildCatalogFromMakes(docs);
  return findCatalogBySlugs(makesMeta, carData, makeSlug, modelSlug);
}
