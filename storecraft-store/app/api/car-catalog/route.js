import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { buildCatalogFromMakes } from "@/lib/carCatalogApi";
import { CAR_MAKES, CAR_DATA, QUICK_CAR_PILLS } from "@/lib/carCatalog";
import CarCatalog from "@/lib/models/CarCatalog.model";
import { mediaImageUrl } from "@/lib/carCatalogCopy";
import { vehicleSlugsWithStorefrontProducts } from "@/lib/vehiclePageData";

export const revalidate = 3600;

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
        image: mediaImageUrl(mod.image),
        description: mod.description || "",
        popularAccessories: Array.isArray(mod.popularAccessories) ? mod.popularAccessories : [],
        generation: mod.generation || "",
        nickname: mod.nickname || "",
        popularOrder: Number(mod.popularOrder) || 0,
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
        image: mediaImageUrl(mod.image),
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

function slimModel(m) {
  return {
    model: m.model,
    slug: m.slug,
    years: Array.isArray(m.years) ? m.years.slice(0, 12) : [],
    yearFrom: m.yearFrom,
    yearTo: m.yearTo,
    image: mediaImageUrl(m.image),
    isPopular: Boolean(m.isPopular),
    popularOrder: Number(m.popularOrder) || 9999,
    bodyStyle: m.bodyStyle || "",
    generation: m.generation || "",
    nickname: m.nickname || "",
  };
}

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const popularOnly = url.searchParams.get("popular") === "true";
    const lean = url.searchParams.get("lean") === "1" || url.searchParams.get("lean") === "true";
    await dbConnect();
    const docs = await CarCatalog.find({ isActive: true }).sort({ order: 1, name: 1 }).lean();

    if (!docs.length) {
      if (popularOnly) {
        return NextResponse.json({ success: true, source: "fallback", popular: [] });
      }
      return NextResponse.json(fallbackPayload(), {
        headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
      });
    }

    const activeMakes = docs
      .filter((m) => m.isActive !== false)
      .map((m) => ({
        ...m,
        models: (m.models || []).filter((mod) => mod.isActive !== false),
      }));

    if (popularOnly) {
      let popular = buildPopularList(activeMakes);
      if (lean) popular = popular.map(slimModel);
      return NextResponse.json(
        {
          success: true,
          source: "database",
          popular,
        },
        { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600" } }
      );
    }

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
    try {
      const slugsWithProducts = await vehicleSlugsWithStorefrontProducts();
      if (slugsWithProducts.size) {
        const keep = (row) => slugsWithProducts.has(String(row?.slug || "").trim());
        vehicles = vehicles.filter(keep);
        popular = popular.filter(keep);
      }
    } catch {
      // keep full lists
    }

    let outCarData = carData;
    if (lean) {
      vehicles = vehicles.map(slimModel);
      popular = popular.map(slimModel);
      outCarData = {};
      for (const [make, models] of Object.entries(carData || {})) {
        outCarData[make] = (models || []).map(slimModel);
      }
    }

    return NextResponse.json(
      {
        success: true,
        source: "database",
        makes,
        carData: outCarData,
        makesMeta: lean ? {} : makesMeta || {},
        quickPills: quickPills.length ? quickPills : QUICK_CAR_PILLS,
        popular,
        vehicles,
      },
      {
        headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
      }
    );
  } catch (error) {
    return NextResponse.json(
      { ...fallbackPayload(), error: error.message },
      { status: 200, headers: { "Cache-Control": "public, s-maxage=300" } }
    );
  }
}
