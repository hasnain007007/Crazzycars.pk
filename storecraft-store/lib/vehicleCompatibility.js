export const FITMENT_TYPES = ["universal", "specific", "semi-universal"];

export const BODY_STYLES = ["All", "Sedan", "SUV", "Hatchback", "Pickup", "Van", "Crossover"];

const CURRENT_YEAR = new Date().getFullYear();

export function emptyVehicleCompatibility() {
  return {
    fitmentType: "universal",
    universalNote: "Fits all car makes and models",
    vehicles: [],
    categories: [],
  };
}

function normalizeVehicleRow(raw) {
  const v = raw && typeof raw === "object" ? raw : {};
  const bodyStyle = BODY_STYLES.includes(v.bodyStyle) ? v.bodyStyle : "All";
  const yearFrom = v.yearFrom != null && v.yearFrom !== "" ? Number(v.yearFrom) : null;
  const yearTo = v.yearTo != null && v.yearTo !== "" ? Number(v.yearTo) : CURRENT_YEAR;
  return {
    make: String(v.make || "").trim(),
    model: String(v.model || "").trim(),
    yearFrom: Number.isFinite(yearFrom) ? yearFrom : null,
    yearTo: Number.isFinite(yearTo) ? yearTo : CURRENT_YEAR,
    bodyStyle,
    notes: String(v.notes || "").trim(),
  };
}

export function normalizeVehicleCompatibility(raw) {
  if (!raw || typeof raw !== "object") {
    return emptyVehicleCompatibility();
  }
  const fitmentType = FITMENT_TYPES.includes(raw.fitmentType) ? raw.fitmentType : "universal";
  const vehicles = Array.isArray(raw.vehicles)
    ? raw.vehicles.map(normalizeVehicleRow).filter((v) => v.make || v.model)
    : [];
  const categories = Array.isArray(raw.categories)
    ? raw.categories.map((c) => String(c || "").trim().toLowerCase()).filter(Boolean)
    : [];
  return {
    fitmentType,
    universalNote:
      String(raw.universalNote || "").trim() || "Fits all car makes and models",
    vehicles,
    categories,
  };
}

export function vehicleCompatibilityFromProduct(product) {
  if (product?.vehicleCompatibility?.fitmentType) {
    return normalizeVehicleCompatibility(product.vehicleCompatibility);
  }
  if (product?.isUniversal) {
    return { ...emptyVehicleCompatibility(), fitmentType: "universal" };
  }
  const legacy = Array.isArray(product?.compatibleCars) ? product.compatibleCars : [];
  if (legacy.length) {
    return {
      fitmentType: "specific",
      universalNote: "Fits all car makes and models",
      vehicles: legacy.map((c) =>
        normalizeVehicleRow({
          make: c.make,
          model: c.model,
          yearFrom: c.yearFrom,
          yearTo: c.yearTo ?? CURRENT_YEAR,
          bodyStyle: "All",
          notes: c.generation || "",
        })
      ),
      categories: [],
    };
  }
  return emptyVehicleCompatibility();
}

function modelsCompatible(rowModel, filterModel) {
  const rm = String(rowModel || "").trim();
  const md = String(filterModel || "").trim();
  if (!rm || rm === "All Models") return true;
  if (!md) return true;
  const a = rm.toLowerCase();
  const b = md.toLowerCase();
  return a === b || a.includes(b) || b.includes(a);
}

function variantCompatible(notes, variant) {
  const want = String(variant || "").trim();
  if (!want) return true;
  const text = String(notes || "").trim().toLowerCase();
  if (!text) return true;
  const needle = want.toLowerCase();
  return text === needle || text.includes(needle);
}

function rowMatchesVehicle(row, make, model, year, variant) {
  const mk = String(make || "").trim();
  const md = String(model || "").trim();
  const y = year != null && year !== "" ? Number(year) : null;

  const rowMake = String(row.make || "").trim();
  const rowModel = String(row.model || "").trim();
  if (rowMake && rowMake !== "All Makes" && mk && rowMake.toLowerCase() !== mk.toLowerCase()) {
    return false;
  }
  if (rowModel && rowModel !== "All Models" && md && !modelsCompatible(rowModel, md)) {
    return false;
  }
  if (y != null && Number.isFinite(y)) {
    const from = Number(row.yearFrom) || 1990;
    const to = Number(row.yearTo) || CURRENT_YEAR;
    if (y < from || y > to) return false;
  }
  if (!variantCompatible(row.notes, variant)) return false;
  return Boolean(rowMake || rowModel);
}

export function vehicleMatchScore(product, make, model, year, variant) {
  const vc = vehicleCompatibilityFromProduct(product);
  if (vc.fitmentType === "universal") return 0;
  const y = year != null && year !== "" ? Number(year) : null;
  let best = 0;
  for (const row of vc.vehicles || []) {
    if (!rowMatchesVehicle(row, make, model, year, variant)) continue;
    let score = 10;
    if (row.make && row.make !== "All Makes") score += 10;
    if (row.model && row.model !== "All Models") score += 20;
    if (y != null && Number.isFinite(y) && row.yearFrom != null) score += 15;
    if (variant && variantCompatible(row.notes, variant) && String(row.notes || "").trim()) score += 25;
    best = Math.max(best, score);
  }
  if (vc.fitmentType === "semi-universal" && best === 0) return 5;
  return best;
}

export function productMatchesVehicle(product, make, model, year, variant) {
  const vc = vehicleCompatibilityFromProduct(product);
  if (vc.fitmentType === "universal") return true;

  const hasVehicleFilter = Boolean(String(make || "").trim() || String(model || "").trim());
  if (!hasVehicleFilter && (year == null || year === "") && !variant) {
    return vc.fitmentType === "universal";
  }

  if (vc.fitmentType === "specific") {
    if (!vc.vehicles.length) return false;
    return vc.vehicles.some((row) => rowMatchesVehicle(row, make, model, year, variant));
  }

  if (vc.fitmentType === "semi-universal") {
    if (!vc.vehicles.length) return true;
    return !vc.vehicles.some((row) => rowMatchesVehicle(row, make, model, year, variant));
  }

  return true;
}

export function formatYearRange(row) {
  const from = row.yearFrom;
  const to = row.yearTo ?? CURRENT_YEAR;
  if (from == null) return String(to);
  const toShort = String(to).slice(-2);
  return `${from}-${toShort}`;
}
