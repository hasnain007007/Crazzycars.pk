/**
 * SSR car catalog for homepage ShopByCar + ShopByVehicle (one load, shared props).
 */
import { unstable_cache } from "next/cache";
import { dbConnect } from "@/lib/db";
import { buildCatalogFromMakes } from "@/lib/carCatalogApi";
import { CAR_MAKES, CAR_DATA, QUICK_CAR_PILLS } from "@/lib/carCatalog";
import CarCatalog from "@/lib/models/CarCatalog.model";
import { loadShopByCarIndex, vehicleSlugsWithStorefrontProducts } from "@/lib/vehiclePageData";

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
  return unstable_cache(
    async () => {
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

        // Homepage carousel: only generations with ≥1 sellable product (e.g. hide BYD Shark 6).
        // CarCatalog / Vehicle docs are not deleted — Filter By Car still lists them.
        const slugsWithProducts = await vehicleSlugsWithStorefrontProducts();
        const keepIfHasProducts = (row) =>
          slugsWithProducts.has(String(row?.slug || "").trim());

        let vehicles = buildAllModelsList(activeMakes).filter(keepIfHasProducts);
        let popular = buildPopularList(activeMakes).filter(keepIfHasProducts);

        // Cars that have products but were never added to Admin › Car Catalog (e.g. every
        // Audi / Mercedes-Benz) — the Shop "Shop by your car" list already shows them, so
        // the homepage rail and Filter-By-Car box list them too.
        const shopIndex = await loadShopByCarIndex().catch(() => []);
        const listed = new Set(vehicles.map((v) => String(v.slug)));
        const extras = shopIndex.filter((v) => v.slug && !listed.has(String(v.slug)));
        if (extras.length) {
          for (const v of extras) {
            vehicles.push({
              make: v.make,
              model: v.model,
              slug: v.slug,
              years: [],
              yearFrom: v.yearFrom ?? null,
              yearTo: v.yearTo ?? null,
              bodyStyle: "",
              image: v.image || "",
              description: "",
              popularAccessories: [],
              generation: v.generation || "",
              nickname: v.nickname || "",
              popularOrder: 9999,
              isPopular: false,
            });
            if (!carData[v.make]) {
              carData[v.make] = [];
              makes.push(v.make);
            }
            if (!carData[v.make].some((m) => m.slug === v.slug)) {
              carData[v.make].push({
                model: v.model,
                slug: v.slug,
                years: [],
                yearFrom: v.yearFrom ?? null,
                yearTo: v.yearTo ?? null,
                generation: v.generation || "",
                nickname: v.nickname || "",
                isPopular: false,
                popularOrder: 9999,
                bodyStyle: "",
              });
            }
          }
          vehicles.sort(
            (a, b) =>
              (a.isPopular === b.isPopular ? 0 : a.isPopular ? -1 : 1) ||
              (a.isPopular ? a.popularOrder - b.popularOrder : 0) ||
              String(a.make).localeCompare(String(b.make)) ||
              String(a.model).localeCompare(String(b.model)) ||
              (Number(a.yearFrom) || 0) - (Number(b.yearFrom) || 0)
          );
        }
        let slimCarData = carData;
        if (lean) {
          // Homepage SSR: slim fields only (no descriptions / accessories text). The
          // Shop-by-vehicle rail needs EVERY car with products (it showed only the 8
          // "popular" ones, so most makes were missing) — ~14 KB for ~50 cars.
          const slimVehicle = (v) => ({
            make: v.make,
            model: v.model,
            generation: v.generation || "",
            nickname: v.nickname || "",
            slug: v.slug,
            years: Array.isArray(v.years) ? v.years.slice(0, 8) : [],
            yearFrom: v.yearFrom,
            yearTo: v.yearTo,
            bodyStyle: v.bodyStyle || "",
            image: v.image || "",
            isPopular: Boolean(v.isPopular),
            popularOrder: Number(v.popularOrder) || 9999,
          });
          popular = popular.map(slimVehicle).slice(0, 24);
          vehicles = vehicles.map(slimVehicle);
          slimCarData = {};
          for (const [make, models] of Object.entries(carData || {})) {
            slimCarData[make] = (models || []).map((m) => ({
              model: m.model,
              slug: m.slug,
              years: Array.isArray(m.years) ? m.years.slice(0, 8) : [],
              yearFrom: m.yearFrom,
              yearTo: m.yearTo,
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
    },
    ["car-catalog", lean ? "lean" : "full"],
    { revalidate: 600, tags: ["cars:catalog"] }
  )();
}
