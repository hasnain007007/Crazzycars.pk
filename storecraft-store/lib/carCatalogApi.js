/** Build storefront-friendly catalog shape from API / DB makes. */
export function buildCatalogFromMakes(makes) {
  const carData = {};
  const makeNames = [];

  for (const make of makes || []) {
    if (make?.isActive === false) continue;
    const name = make.name;
    makeNames.push(name);
    carData[name] = (make.models || [])
      .filter((m) => m.isActive !== false)
      .map((m) => {
        const years = Array.isArray(m.years) ? [...m.years].sort((a, b) => b - a) : [];
        const yearTo = years[0] ?? null;
        const yearFrom = years.length ? years[years.length - 1] : null;
        return {
          model: m.name,
          slug: m.slug,
          years,
          yearFrom: m.yearFrom ?? yearFrom,
          yearTo: m.yearTo ?? yearTo,
          bodyStyle: m.bodyStyle || "Sedan",
          image: String(m.image || "").trim(),
          description: m.description || "",
          popularAccessories: Array.isArray(m.popularAccessories) ? m.popularAccessories : [],
          generation: m.generation || "",
          nickname: m.nickname || "",
          isPopular: !!m.isPopular,
          popularOrder: Number(m.popularOrder) || 0,
          variants: Array.isArray(m.variants)
            ? m.variants
                .filter((v) => v?.isActive !== false && v?.name)
                .map((v) => ({
                  name: v.name,
                  yearFrom: v.yearFrom ?? null,
                  yearTo: v.yearTo ?? null,
                  isActive: v.isActive !== false,
                }))
            : [],
        };
      });
  }

  const makesMeta = {};
  for (const make of makes || []) {
    if (make?.isActive === false) continue;
    if (!make?.name) continue;
    makesMeta[make.name] = {
      name: make.name,
      logo: String(make.logo || "").trim(),
      country: make.country || "Japan",
      slug: make.slug,
      modelCount: (make.models || []).filter((mod) => mod.isActive !== false).length,
    };
  }

  return { makes: makeNames, carData, makesMeta };
}

export function yearsForModelFromCatalog(carData, make, modelOrSlug) {
  const list = carData[make] || [];
  const entry =
    list.find((m) => m.slug === modelOrSlug) ||
    list.find((m) => m.model === modelOrSlug) ||
    list.find((m) => m.nickname === modelOrSlug);
  if (!entry) return [];
  if (Array.isArray(entry.years) && entry.years.length) {
    return [...entry.years].sort((a, b) => b - a);
  }
  if (entry.yearFrom != null && entry.yearTo != null) {
    const years = [];
    for (let y = entry.yearTo; y >= entry.yearFrom; y--) years.push(y);
    return years;
  }
  return [];
}
