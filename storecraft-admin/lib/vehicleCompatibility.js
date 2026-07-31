export const FITMENT_TYPES = ["universal", "specific", "semi-universal"];

export const BODY_STYLES = ["All", "Sedan", "SUV", "Hatchback", "Pickup", "Van", "Crossover"];

export const CAR_TYPE_OPTIONS = [
  { id: "sedans", label: "Sedans" },
  { id: "suvs", label: "SUVs" },
  { id: "hatchbacks", label: "Hatchbacks" },
  { id: "pickups", label: "Pickups" },
  { id: "vans", label: "Vans" },
  { id: "crossovers", label: "Crossovers" },
];

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
    _rowId: v._rowId || `row-${Math.random().toString(36).slice(2, 9)}`,
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
    ? raw.vehicles.map(normalizeVehicleRow)
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

/** Map stored product → editor form (supports legacy isUniversal / compatibleCars / Vehicle refs). */
export function vehicleCompatibilityFromProduct(product) {
  if (product?.isUniversal) {
    return {
      ...emptyVehicleCompatibility(),
      fitmentType: "universal",
    };
  }

  const vc = product?.vehicleCompatibility;
  const vcVehicles = Array.isArray(vc?.vehicles) ? vc.vehicles.filter((v) => v?.make || v?.model) : [];
  if (vc?.fitmentType && (vc.fitmentType !== "specific" || vcVehicles.length > 0)) {
    return normalizeVehicleCompatibility(vc);
  }

  // Prefer populated compatibleVehicles ObjectId refs (seed / Vehicle collection).
  const linked = Array.isArray(product?.compatibleVehicles)
    ? product.compatibleVehicles.filter((v) => v && typeof v === "object" && (v.make || v.model))
    : [];
  if (linked.length) {
    return {
      fitmentType: "specific",
      universalNote: "Fits all car makes and models",
      vehicles: linked.map((v) =>
        normalizeVehicleRow({
          make: v.make,
          model: v.model,
          yearFrom: v.yearFrom,
          yearTo: v.yearTo ?? CURRENT_YEAR,
          bodyStyle: v.bodyType || "All",
          notes: v.displayName || v.generation || "",
        })
      ),
      categories: [],
    };
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

  if (vc?.fitmentType) {
    return normalizeVehicleCompatibility(vc);
  }
  return emptyVehicleCompatibility();
}

export function stripVehicleRowIds(vehicles) {
  return (vehicles || []).map(({ _rowId, ...rest }) => ({
    make: rest.make,
    model: rest.model,
    yearFrom: rest.yearFrom,
    yearTo: rest.yearTo,
    bodyStyle: rest.bodyStyle || "All",
    notes: rest.notes || "",
  }));
}

/** Persist vehicleCompatibility and sync legacy fields for existing queries. */
export function buildVehicleCompatibilityPayload(formVc) {
  const cleanedVehicles = stripVehicleRowIds(formVc?.vehicles).filter((v) => v.make || v.model);
  const vehicleCompatibility = normalizeVehicleCompatibility({
    ...formVc,
    vehicles: cleanedVehicles,
  });
  // Persist without editor-only draft/empty rows or ephemeral _rowId
  vehicleCompatibility.vehicles = cleanedVehicles;
  const isUniversal = vehicleCompatibility.fitmentType === "universal";
  const compatibleCars =
    vehicleCompatibility.fitmentType === "specific" ||
    vehicleCompatibility.fitmentType === "semi-universal"
      ? vehicleCompatibility.vehicles.map((v) => ({
          make: v.make,
          model: v.model,
          generation: v.notes || "",
          yearFrom: v.yearFrom,
          yearTo: v.yearTo,
        }))
      : [];
  return { vehicleCompatibility, isUniversal, compatibleCars };
}

export function getFitmentBadge(product) {
  const vc = vehicleCompatibilityFromProduct(product);
  if (vc.fitmentType === "universal") {
    return { icon: "🌐", label: "Universal", className: "bg-sky-50 text-sky-800" };
  }
  if (vc.fitmentType === "semi-universal") {
    return { icon: "⚡", label: "Semi", className: "bg-amber-50 text-amber-800" };
  }
  const n = vc.vehicles.length;
  return {
    icon: "🚗",
    label: n ? `${n} vehicles` : "Specific",
    className: "bg-emerald-50 text-emerald-800",
  };
}

function rowMatchesVehicle(row, make, model, year) {
  const mk = String(make || "").trim();
  const md = String(model || "").trim();
  const y = year != null && year !== "" ? Number(year) : null;

  const rowMake = String(row.make || "").trim();
  const rowModel = String(row.model || "").trim();
  if (rowMake && rowMake !== "All Makes" && mk && rowMake.toLowerCase() !== mk.toLowerCase()) {
    return false;
  }
  if (rowModel && rowModel !== "All Models" && md && rowModel.toLowerCase() !== md.toLowerCase()) {
    return false;
  }
  if (y != null && Number.isFinite(y)) {
    const from = Number(row.yearFrom) || 1990;
    const to = Number(row.yearTo) || CURRENT_YEAR;
    if (y < from || y > to) return false;
  }
  return Boolean(rowMake || rowModel);
}

export function productMatchesVehicle(product, make, model, year) {
  const vc = vehicleCompatibilityFromProduct(product);
  if (vc.fitmentType === "universal") return true;

  const hasVehicleFilter = Boolean(String(make || "").trim() || String(model || "").trim());
  if (!hasVehicleFilter && (year == null || year === "")) {
    return vc.fitmentType === "universal";
  }

  if (vc.fitmentType === "specific") {
    if (!vc.vehicles.length) return false;
    return vc.vehicles.some((row) => rowMatchesVehicle(row, make, model, year));
  }

  if (vc.fitmentType === "semi-universal") {
    if (!vc.vehicles.length) return true;
    return !vc.vehicles.some((row) => rowMatchesVehicle(row, make, model, year));
  }

  return true;
}

export function vehiclesToCsv(vehicles) {
  const header = "make,model,yearFrom,yearTo,bodyStyle,notes";
  const lines = (vehicles || []).map((v) =>
    [
      v.make || "",
      v.model || "",
      v.yearFrom ?? "",
      v.yearTo ?? "",
      v.bodyStyle || "All",
      (v.notes || "").replace(/"/g, '""'),
    ]
      .map((cell) => `"${String(cell)}"`)
      .join(",")
  );
  return [header, ...lines].join("\n");
}

export function vehiclesFromCsv(text) {
  const lines = String(text || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return [];
  const start = lines[0].toLowerCase().includes("make") ? 1 : 0;
  const rows = [];
  for (let i = start; i < lines.length; i++) {
    const parts = lines[i].split(",").map((p) => p.replace(/^"|"$/g, "").trim());
    if (!parts[0] && !parts[1]) continue;
    rows.push(
      normalizeVehicleRow({
        make: parts[0],
        model: parts[1],
        yearFrom: parts[2],
        yearTo: parts[3],
        bodyStyle: parts[4] || "All",
        notes: parts[5] || "",
      })
    );
  }
  return rows;
}
