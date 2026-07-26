/**
 * SSR car catalog for homepage ShopByCar + ShopByVehicle (one load, shared props).
 */
import { dbConnect } from "@/lib/db";
import { buildCatalogFromMakes } from "@/lib/carCatalogApi";
import { CAR_MAKES, CAR_DATA, QUICK_CAR_PILLS } from "@/lib/carCatalog";
import CarCatalog from "@/lib/models/CarCatalog.model";

function fallbackPayload() {
  const { makes, carData } = buildCatalogFromMakes(
    CAR_MAKES.map((name, order) => ({
      name,
      isActive: true,
      order,
      models: (CAR_DATA[name] || []).map((m) => ({
        name: m.model,
        slug: m.model.toLowerCase().replace(/\s+/g, "-"),
        isActive: true,
        years: (() => {
          const ys = [];
          for (let y = m.yearTo; y >= m.yearFrom; y--) ys.push(y);
          return ys;
        })(),
      })),
    }))
  );
  return {
    success: true,
    source: "fallback",
    makes,
    carData,
    quickPills: QUICK_CAR_PILLS,
    popular: [],
    vehicles: [],
  };
}

function buildPopularList(activeMakes) {
  const items = [];
  for (const make of activeMakes) {
    for (const mod of make.models || []) {
      if (!mod.isPopular) continue;
      const years = Array.isArray(mod.years) ? [...mod.years].sort((a, b) => b - a) : [];
      items.push({
        make: make.name,
        model: mod.name,
        slug: mod.slug,
        years,
        yearFrom: mod.yearFrom ?? (years.length ? years[years.length - 1] : null),
        yearTo: mod.yearTo ?? (years.length ? years[0] : null),
        bodyStyle: mod.bodyStyle || "Sedan",
        image: mod.image || "",
        description: mod.description || "",
        popularAccessories: Array.isArray(mod.popularAccessories) ? mod.popularAccessories : [],
        generation: mod.generation || "",
        nickname: mod.nickname || "",
        popularOrder: Number(mod.popularOrder) || 0,
        isPopular: true,
      });
    }
  }
  return items.sort((a, b) => a.popularOrder - b.popularOrder);
}

function buildAllModelsList(activeMakes) {
  const popular = buildPopularList(activeMakes);
  const popularSlugs = new Set(popular.map((p) => p.slug));
  const rest = [];
  for (const make of activeMakes) {
    for (const mod of make.models || []) {
      if (popularSlugs.has(mod.slug)) continue;
      const years = Array.isArray(mod.years) ? [...mod.years].sort((a, b) => b - a) : [];
      rest.push({
        make: make.name,
        model: mod.name,
        slug: mod.slug,
        years,
        yearFrom: mod.yearFrom ?? (years.length ? years[years.length - 1] : null),
        yearTo: mod.yearTo ?? (years.length ? years[0] : null),
        bodyStyle: mod.bodyStyle || "Sedan",
        image: mod.image || "",
        description: mod.description || "",
        popularAccessories: Array.isArray(mod.popularAccessories) ? mod.popularAccessories : [],
        generation: mod.generation || "",
        nickname: mod.nickname || "",
        popularOrder: 9999,
        isPopular: false,
      });
    }
  }
  rest.sort(
    (a, b) =>
      String(a.make).localeCompare(String(b.make)) || String(a.model).localeCompare(String(b.model))
  );
  return [...popular, ...rest];
}

/** Full catalog payload matching GET /api/car-catalog (for SSR props). */
export async function fetchCarCatalogServer() {
  try {
    await dbConnect();
    const docs = await CarCatalog.find({ isActive: true }).sort({ order: 1, name: 1 }).lean();

    if (!docs.length) {
      return JSON.parse(JSON.stringify(fallbackPayload()));
    }

    const activeMakes = docs
      .filter((m) => m.isActive !== false)
      .map((m) => ({
        ...m,
        models: (m.models || []).filter((mod) => mod.isActive !== false),
      }));

    const { makes, carData, makesMeta } = buildCatalogFromMakes(activeMakes);

    const quickPills = [];
    const priority = [
      ["Honda", "Civic"],
      ["Toyota", "Corolla"],
      ["Suzuki", "Alto"],
      ["KIA", "Sportage"],
      ["Toyota", "Prado"],
    ];
    for (const [make, model] of priority) {
      if (carData[make]?.some((m) => m.model === model)) quickPills.push({ make, model });
    }

    return JSON.parse(
      JSON.stringify({
        success: true,
        source: "database",
        makes,
        carData,
        makesMeta: makesMeta || {},
        quickPills: quickPills.length ? quickPills : QUICK_CAR_PILLS,
        popular: buildPopularList(activeMakes),
        vehicles: buildAllModelsList(activeMakes),
      })
    );
  } catch (err) {
    console.error("[fetchCarCatalogServer]", err?.message || err);
    return JSON.parse(JSON.stringify(fallbackPayload()));
  }
}
