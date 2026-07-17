export function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function yearsFromRange(yearFrom, yearTo) {
  const from = Number(yearFrom);
  const to = Number(yearTo);
  if (!Number.isFinite(from) || !Number.isFinite(to)) return [];
  const lo = Math.min(from, to);
  const hi = Math.max(from, to);
  const years = [];
  for (let y = hi; y >= lo; y--) years.push(y);
  return years;
}

export function modelWithYears({
  name,
  slug,
  yearFrom,
  yearTo,
  isActive = true,
  bodyStyle = "Sedan",
  image = "",
  description = "",
  popularAccessories = [],
  generation = "",
  nickname = "",
  variants = [],
}) {
  const years = yearsFromRange(yearFrom, yearTo);
  const nick = String(nickname || "").trim();
  const gen = String(generation || "").trim();
  const baseName = String(name).trim();
  const normalizedVariants = Array.isArray(variants)
    ? variants
        .map((v) => ({
          name: String(v?.name || "").trim(),
          yearFrom: v?.yearFrom != null ? Number(v.yearFrom) : yearFrom,
          yearTo: v?.yearTo != null ? Number(v.yearTo) : yearTo,
          isActive: v?.isActive !== false,
        }))
        .filter((v) => v.name)
    : [];
  return {
    name: baseName,
    slug: slug || slugify(nick || (gen ? `${baseName}-${gen}` : `${baseName}-${yearFrom}-${yearTo}`)),
    years,
    yearFrom: years.length ? years[years.length - 1] : yearFrom,
    yearTo: years.length ? years[0] : yearTo,
    isActive,
    bodyStyle,
    image,
    description,
    popularAccessories: Array.isArray(popularAccessories) ? popularAccessories : [],
    generation: gen,
    nickname: nick,
    variants: normalizedVariants,
  };
}
