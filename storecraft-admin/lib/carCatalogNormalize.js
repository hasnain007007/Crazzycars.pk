import { slugify, yearsFromRange } from "@/lib/carCatalogUtils";

export function normalizeMake(body) {
  const b = body && typeof body === "object" ? body : {};
  return {
    name: String(b.name || "").trim(),
    slug: slugify(b.slug || b.name),
    country: String(b.country || "Japan").trim() || "Japan",
    logo: String(b.logo || "").trim(),
    isActive: b.isActive !== false,
    order: Number(b.order) || 0,
  };
}

export const MODEL_BODY_STYLES = [
  "Sedan",
  "SUV",
  "Hatchback",
  "Pickup",
  "Van",
  "Crossover",
  "Coupe",
  "MPV",
];

export function normalizeCatalogModel(m) {
  const name = String(m?.name || "").trim();
  const slug = slugify(m?.slug || name);
  let years = Array.isArray(m?.years) ? m.years.map(Number).filter(Number.isFinite) : [];
  let yearFrom = m?.yearFrom != null && m?.yearFrom !== "" ? Number(m.yearFrom) : null;
  let yearTo = m?.yearTo != null && m?.yearTo !== "" ? Number(m.yearTo) : null;
  if (!years.length && yearFrom != null && yearTo != null && yearTo >= yearFrom) {
    years = yearsFromRange(yearFrom, yearTo);
  }
  if (years.length) {
    const sorted = [...years].sort((a, b) => a - b);
    yearFrom = yearFrom ?? sorted[0];
    yearTo = yearTo ?? sorted[sorted.length - 1];
  }
  const bodyStyle = MODEL_BODY_STYLES.includes(m?.bodyStyle) ? m.bodyStyle : "Sedan";
  const popularAccessories = Array.isArray(m?.popularAccessories)
    ? m.popularAccessories.map((s) => String(s || "").trim()).filter(Boolean)
    : [];
  const nickname = String(m?.nickname || "").trim();
  const generation = String(m?.generation || "").trim();
  const variants = Array.isArray(m?.variants)
    ? m.variants
        .map((v) => ({
          name: String(v?.name || "").trim(),
          yearFrom: v?.yearFrom != null ? Number(v.yearFrom) : yearFrom,
          yearTo: v?.yearTo != null ? Number(v.yearTo) : yearTo,
          isActive: v?.isActive !== false,
        }))
        .filter((v) => v.name)
    : [];
  const uniqueSlug =
    slugify(m?.slug || nickname || (generation ? `${name}-${generation}` : `${name}-${yearFrom}-${yearTo}`)) ||
    slugify(name);

  return {
    name,
    slug: uniqueSlug,
    years,
    yearFrom,
    yearTo,
    isActive: m?.isActive !== false,
    bodyStyle,
    image: String(m?.image || "").trim(),
    description: String(m?.description || "").trim(),
    popularAccessories,
    generation,
    nickname,
    isPopular: !!m?.isPopular,
    popularOrder: Number(m?.popularOrder) || 0,
    variants,
    _id: m?._id,
  };
}

export function normalizeCatalogModels(models) {
  if (!Array.isArray(models)) return [];
  return models.map(normalizeCatalogModel).filter((m) => m.name);
}

export function serializeCatalogModelForDb(m) {
  const row = {
    name: m.name,
    slug: m.slug,
    years: m.years?.length ? m.years : yearsFromRange(m.yearFrom ?? 1990, m.yearTo ?? new Date().getFullYear()),
    yearFrom: m.yearFrom,
    yearTo: m.yearTo,
    isActive: m.isActive !== false,
    bodyStyle: m.bodyStyle || "Sedan",
    image: m.image || "",
    description: m.description || "",
    popularAccessories: m.popularAccessories || [],
    generation: m.generation || "",
    nickname: m.nickname || "",
    isPopular: !!m.isPopular,
    popularOrder: Number(m.popularOrder) || 0,
    variants: Array.isArray(m.variants)
      ? m.variants.map((v) => ({
          name: v.name || "",
          yearFrom: v.yearFrom,
          yearTo: v.yearTo,
          isActive: v.isActive !== false,
        }))
      : [],
  };
  if (m._id) row._id = m._id;
  return row;
}
