/**
 * Save-time fitment cleanup: a row whose model holds a generation code ("E140",
 * "Reborn", "7th Gen") gets the Car Catalog model name back, with the code kept as
 * the generation label. Rows the catalog cannot place exactly are saved unchanged.
 */
import CarCatalog from "@/lib/models/CarCatalog.model";
import { catalogModelsByMake, normalizeFitmentModel } from "@/lib/fitmentModelNormalize";

export async function normalizeFitmentVehiclesForSave(vc) {
  const vehicles = Array.isArray(vc?.vehicles) ? vc.vehicles : [];
  if (!vehicles.length) return vc;
  const makes = await CarCatalog.find({}).select("name models").lean();
  const byMake = catalogModelsByMake(makes);
  return {
    ...vc,
    vehicles: vehicles.map((row) => {
      const res = normalizeFitmentModel(row, byMake.get(String(row?.make || "").trim().toLowerCase()) || []);
      if (!res.changed) return row;
      return {
        ...row,
        model: res.model,
        generationLabel: row.generationLabel || res.generation,
        generationId: row.generationId || res.generationId,
      };
    }),
  };
}
