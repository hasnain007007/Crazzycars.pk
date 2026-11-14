/** UI helpers for car catalog entries (storefront). */

/** Strip leading brand from a model display label (e.g. "Honda Vezel" → "Vezel"). */
export function stripBrandPrefix(make, label) {
  const m = String(make || "").trim();
  let text = String(label || "").trim();
  if (!m || !text) return text;
  const re = new RegExp(`^${m.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s+`, "i");
  return text.replace(re, "").trim() || text;
}

/**
 * True when a nickname/generation alone is ambiguous without the model
 * (e.g. "Classic", "7th Gen", "E140", "XW20", "3rd Gen").
 */
export function isAmbiguousVehicleQualifier(label) {
  const t = String(label || "").trim();
  if (!t) return true;
  if (/^(classic|\d+(st|nd|rd|th)\s*gen(eration)?|e\d+|xw\d+|x\d+|j\d+|nx\d+)$/i.test(t)) {
    return true;
  }
  // Qualifier-only phrases without a recognizable model noun
  if (/^(1st|2nd|3rd|4th|5th|6th|7th|8th|9th|10th|11th)\s+gen/i.test(t) && !/\b(civic|city|corolla|swift|prius|alto|vezel)\b/i.test(t)) {
    return true;
  }
  return false;
}

/**
 * Card / filter label: Model + Generation (when useful). Never show gen-only nicknames alone.
 * Make is rendered separately in most card UIs.
 */
export function vehicleCardModelLabel(vehicle) {
  if (!vehicle) return "";
  const model = String(vehicle.model || "").trim();
  const gen = String(vehicle.generation || "").trim();
  const nick = String(vehicle.nickname || "").trim();
  const display = String(vehicle.displayName || "").trim();

  // Prefer stripping make from displayName when it already includes model+gen+years.
  if (display) {
    const withoutMake = stripBrandPrefix(vehicle.make, display);
    // Drop trailing year range — cards usually show years on a second line.
    const noYears = withoutMake.replace(/\s*\(\s*\d{4}\s*[–—-]\s*(?:\d{4}|Present|present)\s*\)\s*$/i, "").trim();
    if (noYears) return noYears;
  }

  // Nicknames sometimes repeat make / model / years ("Suzuki Alto (2020-Present)", "Civic X").
  const cleanQualifier = (q) =>
    stripBrandPrefix(vehicle.make, q)
      .replace(/\s*\(\s*\d{4}\s*[–—-]\s*(?:\d{4}|Present|present)\s*\)\s*$/i, "")
      .trim();
  const qualifier = cleanQualifier(nick && !isAmbiguousVehicleQualifier(nick) ? nick : gen);
  // Qualifier already names the model → use it alone, never "Civic Civic X".
  if (model && qualifier && qualifier.toLowerCase().includes(model.toLowerCase())) return qualifier;
  if (model && qualifier && !model.toLowerCase().includes(qualifier.toLowerCase())) {
    // Ambiguous qualifiers still useful when paired with model: "City Classic", "Civic 11th Gen"
    if (isAmbiguousVehicleQualifier(qualifier) || nick === qualifier) {
      return `${model} ${qualifier}`.trim();
    }
    return `${model} ${qualifier}`.trim();
  }
  if (model) return model;
  if (qualifier && !isAmbiguousVehicleQualifier(qualifier)) return qualifier;
  return model || qualifier || nick || "";
}

export function formatModelLabel(entry) {
  if (!entry) return "";
  const nick = String(entry.nickname || "").trim();
  const name = String(entry.model || entry.name || "").trim();
  const gen = String(entry.generation || "").trim();
  const yf = entry.yearFrom;
  const yt = entry.yearTo;
  const years =
    yf != null && yt != null ? ` (${yf}–${yt})` : yf != null ? ` (${yf}+)` : "";

  if (nick && nick !== name) {
    return `${name} (${nick})${gen ? ` • ${gen}` : ""}${years}`;
  }
  if (nick) return `${nick}${gen ? ` • ${gen}` : ""}${years}`;
  return `${name}${gen ? ` • ${gen}` : ""}${years}`;
}

export function formatModelShortLabel(entry) {
  if (!entry) return "";
  const nick = String(entry.nickname || "").trim();
  const name = String(entry.model || entry.name || "").trim();
  if (nick) return nick;
  return name;
}

export function formatModelTitle(entry) {
  if (!entry) return "";
  const nick = String(entry.nickname || "").trim();
  const name = String(entry.model || entry.name || "").trim();
  const gen = String(entry.generation || "").trim();
  if (nick && gen) return `${nick} (${gen})`;
  if (nick) return nick;
  if (gen) return `${name} (${gen})`;
  return name;
}

export function formatModelSubtitle(entry) {
  const yf = entry?.yearFrom;
  const yt = entry?.yearTo;
  const body = entry?.bodyStyle || "Sedan";
  const years = yf != null && yt != null ? `${yf} - ${yt}` : "";
  return [years, body].filter(Boolean).join(" • ");
}

/** Group catalog rows by base model name for &lt;optgroup&gt; labels. */
export function groupModelsByName(entries) {
  const groups = new Map();
  for (const e of entries || []) {
    const key = String(e.model || e.name || "Other").trim();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(e);
  }
  for (const [, list] of groups) {
    list.sort((a, b) => (b.yearFrom || 0) - (a.yearFrom || 0));
  }
  return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

export function findCatalogEntry(carData, make, slug) {
  if (!make || !slug || !carData?.[make]) return null;
  return carData[make].find((m) => m.slug === slug) || null;
}

export function yearsForCatalogEntry(entry) {
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

export function slugifyCarSegment(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function buildCarPagePath(makeSlug, modelSlug, { year, variant } = {}) {
  const params = new URLSearchParams();
  if (year) params.set("year", String(year));
  if (variant) params.set("variant", variant);
  const qs = params.toString();
  return `/cars/${makeSlug}/${modelSlug}${qs ? `?${qs}` : ""}`;
}

export function findCatalogBySlugs(makesMeta, carData, makeSlug, modelSlug) {
  const wantMake = slugifyCarSegment(makeSlug);
  const wantModel = slugifyCarSegment(modelSlug);
  for (const makeName of Object.keys(carData || {})) {
    const meta = makesMeta?.[makeName] || {};
    const ms = slugifyCarSegment(meta.slug || makeName);
    if (ms !== wantMake) continue;
    const entry = (carData[makeName] || []).find((m) => slugifyCarSegment(m.slug) === wantModel);
    if (entry) return { makeName, makeMeta: meta, entry };
  }
  return null;
}

export function activeVariants(entry, year = null) {
  const list = Array.isArray(entry?.variants) ? entry.variants.filter((v) => v?.isActive !== false && v?.name) : [];
  if (year == null || year === "") return list;
  const y = Number(year);
  if (!Number.isFinite(y)) return list;
  return list.filter((v) => {
    const from = v.yearFrom != null ? Number(v.yearFrom) : entry?.yearFrom;
    const to = v.yearTo != null ? Number(v.yearTo) : entry?.yearTo;
    if (from != null && y < from) return false;
    if (to != null && y > to) return false;
    return true;
  });
}

export function fitmentModelName(entry) {
  if (!entry) return "";
  return entry.nickname || entry.model || entry.name || "";
}
