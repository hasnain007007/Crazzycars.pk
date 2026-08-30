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

/** Full catalog payload matching GET /api/car-catalog (for SSR props).
 *  @param {{ lean?: boolean }} [opts] lean=true strips long text fields for homepage HTML weight.
 */
export async function fetchCarCatalogServer(opts = {}) {
  const lean = Boolean(opts.lean);
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

    let vehicles = buildAllModelsList(activeMakes);
    let popular = buildPopularList(activeMakes);
    let slimCarData = carData;
    if (lean) {
      const slimVehicle = (v) => ({
        make: v.make,
        model: v.model,
        slug: v.slug,
        years: Array.isArray(v.years) ? v.years.slice(0, 12) : [],
        yearFrom: v.yearFrom,
        yearTo: v.yearTo,
        bodyStyle: v.bodyStyle || "",
        image: v.image || "",
        isPopular: Boolean(v.isPopular),
        popularOrder: Number(v.popularOrder) || 9999,
      });
      vehicles = vehicles.map(slimVehicle);
      popular = popular.map(slimVehicle);
      slimCarData = {};
      for (const [make, models] of Object.entries(carData || {})) {
        slimCarData[make] = (models || []).map((m) => ({
          model: m.model,
          slug: m.slug,
          years: Array.isArray(m.years) ? m.years.slice(0, 12) : [],
          yearFrom: m.yearFrom,
          yearTo: m.yearTo,
          image: m.image || "",
          isPopular: Boolean(m.isPopular),
          popularOrder: Number(m.popularOrder) || 9999,
          bodyStyle: m.bodyStyle || "",
        }));
      }
    }

    return JSON.parse(
      JSON.stringify({
        success: true,
        source: "database",
        makes,
        carData: slimCarData,
        makesMeta: lean ? {} : makesMeta || {},
        quickPills: quickPills.length ? quickPills : QUICK_CAR_PILLS,
        popular,
        vehicles,
      })
    );
  } catch (err) {
    console.error("[fetchCarCatalogServer]", err?.message || err);
    return JSON.parse(JSON.stringify(fallbackPayload()));
  }
}
