/**
 * Structured product specs + fitment.
 * All fields are optional — never invent values from titles or descriptions.
 */

export const PAINT_STATUS = ["painted", "unpainted", "primed", "not-applicable"];
export const INSTALLATION_DIFFICULTY = [
  "plug-and-play",
  "easy",
  "moderate",
  "professional-required",
];

export const SPEC_FIELD_KEYS = [
  "material",
  "dimensions",
  "weight",
  "pieceCount",
  "fixingMethod",
  "paintStatus",
  "finish",
  "installationDifficulty",
  "installationTimeMinutes",
  "warrantyDays",
  "powerDraw",
  "voltage",
];

/** Fields the admin UI marks as strongly recommended. */
export const RECOMMENDED_SPEC_FIELDS = ["material", "fixingMethod", "paintStatus"];

/** Dedicated backfill CSV (spec-only). `weight` here is the spec string, not shipping weight. */
export const SPEC_BACKFILL_COLUMNS = [
  ...SPEC_FIELD_KEYS,
  "fitment_universal",
  "fitment_note",
  "does_not_fit",
  "fits",
];

export const SPEC_BACKFILL_HEADERS = ["slug", "name", "articleNo", ...SPEC_BACKFILL_COLUMNS];

/** Mongoose / Next select fragment for PDP + JSON-LD. */
export const PRODUCT_SPEC_SELECT =
  "material dimensions weight pieceCount fixingMethod paintStatus finish installationDifficulty installationTimeMinutes warrantyDays powerDraw voltage fitment";

const PAINT_LABELS = {
  painted: "Painted",
  unpainted: "Unpainted",
  primed: "Primed",
  "not-applicable": "Not applicable",
};

const INSTALL_LABELS = {
  "plug-and-play": "Plug and play",
  easy: "Easy",
  moderate: "Moderate",
  "professional-required": "Professional required",
};

const DEFAULT_UNIVERSAL_NOTE = "fits all car makes and models";

function trimStr(value) {
  const s = String(value ?? "").trim();
  return s || undefined;
}

function toInt(value) {
  if (value === "" || value == null) return undefined;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return Math.round(n);
}

function honestFitmentNote(note) {
  const t = trimStr(note);
  if (!t) return null;
  if (t.toLowerCase() === DEFAULT_UNIVERSAL_NOTE) return null;
  return t;
}

export function emptyProductSpecs() {
  return {
    material: "",
    dimensions: "",
    weight: "",
    pieceCount: "",
    fixingMethod: "",
    paintStatus: "",
    finish: "",
    installationDifficulty: "",
    installationTimeMinutes: "",
    warrantyDays: "",
    powerDraw: "",
    voltage: "",
  };
}

export function emptyFitment() {
  return {
    universal: false,
    fits: [],
    doesNotFit: [],
    fitmentNote: "",
  };
}

/**
 * Normalize optional spec fields. Empty strings become omitted (null).
 * @param {object} [raw]
 */
export function normalizeProductSpecs(raw) {
  const src = raw && typeof raw === "object" ? raw : {};
  const paint = trimStr(src.paintStatus);
  const difficulty = trimStr(src.installationDifficulty);
  return {
    material: trimStr(src.material) || null,
    dimensions: trimStr(src.dimensions) || null,
    weight: trimStr(src.weight) || null,
    pieceCount: toInt(src.pieceCount) ?? null,
    fixingMethod: trimStr(src.fixingMethod) || null,
    paintStatus: PAINT_STATUS.includes(paint) ? paint : null,
    finish: trimStr(src.finish) || null,
    installationDifficulty: INSTALLATION_DIFFICULTY.includes(difficulty) ? difficulty : null,
    installationTimeMinutes: toInt(src.installationTimeMinutes) ?? null,
    warrantyDays: toInt(src.warrantyDays) ?? null,
    powerDraw: trimStr(src.powerDraw) || null,
    voltage: trimStr(src.voltage) || null,
  };
}

/**
 * @param {object} [raw]
 */
export function normalizeFitmentRow(raw) {
  if (!raw || typeof raw !== "object") return null;
  const make = trimStr(raw.make);
  const model = trimStr(raw.model);
  if (!make || !model) return null;
  const yearFrom = toInt(raw.yearFrom);
  let yearTo = raw.yearTo;
  if (yearTo === "present" || String(yearTo).toLowerCase() === "present") {
    yearTo = "present";
  } else {
    yearTo = toInt(yearTo);
    if (yearTo == null) yearTo = undefined;
  }
  return {
    make,
    model,
    ...(yearFrom != null ? { yearFrom } : {}),
    ...(yearTo != null ? { yearTo } : {}),
    ...(trimStr(raw.trim) ? { trim: trimStr(raw.trim) } : {}),
    ...(trimStr(raw.note) ? { note: trimStr(raw.note) } : {}),
  };
}

/**
 * @param {object} [raw]
 */
export function normalizeFitment(raw) {
  if (!raw || typeof raw !== "object") {
    return { universal: false, fits: [], doesNotFit: [], fitmentNote: null };
  }
  const fits = Array.isArray(raw.fits)
    ? raw.fits.map(normalizeFitmentRow).filter(Boolean)
    : [];
  const doesNotFit = Array.isArray(raw.doesNotFit)
    ? raw.doesNotFit.map((s) => String(s || "").trim()).filter(Boolean)
    : [];
  return {
    universal: Boolean(raw.universal),
    fits,
    doesNotFit,
    fitmentNote: honestFitmentNote(raw.fitmentNote),
  };
}

export function specFieldLabel(key) {
  const labels = {
    material: "Material",
    dimensions: "Dimensions",
    weight: "Weight",
    pieceCount: "Piece count",
    fixingMethod: "Fixing method",
    paintStatus: "Paint status",
    finish: "Finish",
    installationDifficulty: "Installation",
    installationTimeMinutes: "Install time",
    warrantyDays: "Warranty",
    powerDraw: "Power draw",
    voltage: "Voltage",
  };
  return labels[key] || key;
}

export function formatSpecValue(key, value) {
  if (value == null || value === "") return undefined;
  if (key === "paintStatus") return PAINT_LABELS[value] || String(value);
  if (key === "installationDifficulty") return INSTALL_LABELS[value] || String(value);
  if (key === "pieceCount") return String(value);
  if (key === "installationTimeMinutes") {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return undefined;
    return n === 1 ? "1 minute" : `${n} minutes`;
  }
  if (key === "warrantyDays") {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return undefined;
    if (n === 365 || n === 366) return "1 year";
    if (n % 30 === 0 && n >= 30) {
      const months = n / 30;
      return months === 1 ? "1 month" : `${months} months`;
    }
    return n === 1 ? "1 day" : `${n} days`;
  }
  return String(value).trim() || undefined;
}

/**
 * Two-column table rows. Only includes fields that have a real value.
 * @param {object} specs
 * @returns {Array<{ key: string; label: string; value: string }>}
 */
export function specTableRows(specs) {
  const src = specs && typeof specs === "object" ? specs : {};
  const rows = [];
  for (const key of SPEC_FIELD_KEYS) {
    const formatted = formatSpecValue(key, src[key]);
    if (!formatted) continue;
    rows.push({ key, label: specFieldLabel(key), value: formatted });
  }
  return rows;
}

export function shouldRenderSpecTable(rows) {
  return Array.isArray(rows) && rows.length >= 3;
}

export function formatYearRange(yearFrom, yearTo) {
  const from = yearFrom != null && Number.isFinite(Number(yearFrom)) ? String(yearFrom) : "";
  const toRaw = yearTo;
  const to =
    toRaw === "present" || String(toRaw).toLowerCase() === "present"
      ? "present"
      : toRaw != null && Number.isFinite(Number(toRaw))
        ? String(toRaw)
        : "";
  if (from && to) return `${from}–${to}`;
  if (from) return `${from}–`;
  if (to) return `–${to}`;
  return "";
}

export function formatFitmentVehicle(row) {
  if (!row) return "";
  const years = formatYearRange(row.yearFrom, row.yearTo);
  return [row.make, row.model, years, row.trim].filter(Boolean).join(" ").trim();
}

function vehiclesToFitRows(vehicles) {
  if (!Array.isArray(vehicles)) return [];
  return vehicles
    .map((v) =>
      normalizeFitmentRow({
        make: v?.make,
        model: v?.model,
        yearFrom: v?.yearFrom,
        yearTo: v?.yearTo,
        trim: v?.trim || v?.generation,
        note: v?.note || v?.notes,
      })
    )
    .filter(Boolean);
}

function linkedVehicleRows(product) {
  const fromCars = vehiclesToFitRows(product?.compatibleCars);
  if (fromCars.length) return fromCars;
  const linked = Array.isArray(product?.compatibleVehicles)
    ? product.compatibleVehicles.filter(
        (v) => v && typeof v === "object" && (v.make || v.model)
      )
    : [];
  return vehiclesToFitRows(linked);
}

/**
 * Prefer the structured `fitment` object; fall back to existing vehicle links.
 * Does not guess from the product title.
 * @param {object} product
 */
export function resolveFitment(product) {
  const stored = normalizeFitment(product?.fitment);
  const hasStored =
    stored.universal ||
    stored.fits.length > 0 ||
    stored.doesNotFit.length > 0 ||
    Boolean(stored.fitmentNote);

  if (hasStored) return stored;

  const vc = product?.vehicleCompatibility;
  if (!vc || typeof vc !== "object") {
    if (product?.isUniversal) {
      return { universal: true, fits: [], doesNotFit: [], fitmentNote: null };
    }
    const legacyFits = linkedVehicleRows(product);
    if (legacyFits.length) {
      return { universal: false, fits: legacyFits, doesNotFit: [], fitmentNote: null };
    }
    return null;
  }

  const type = vc.fitmentType || (product?.isUniversal ? "universal" : "specific");
  const note = honestFitmentNote(vc.universalNote);
  const rows = vehiclesToFitRows(vc.vehicles);
  const linked = rows.length ? rows : linkedVehicleRows(product);

  if (type === "universal") {
    return { universal: true, fits: [], doesNotFit: [], fitmentNote: note };
  }
  if (type === "semi-universal") {
    return {
      universal: true,
      fits: [],
      doesNotFit: linked.map(formatFitmentVehicle).filter(Boolean),
      fitmentNote: note,
    };
  }
  if (!linked.length) return note ? { universal: false, fits: [], doesNotFit: [], fitmentNote: note } : null;
  return { universal: false, fits: linked, doesNotFit: [], fitmentNote: note };
}

/**
 * Build `fitment` for persist from the vehicle-compatibility editor + extras.
 */
export function buildFitmentPayload(vehicleCompatibility, extras = {}) {
  const vc = vehicleCompatibility && typeof vehicleCompatibility === "object" ? vehicleCompatibility : {};
  const type = vc.fitmentType || "universal";
  const extra = normalizeFitment(extras);
  const rows = vehiclesToFitRows(vc.vehicles);

  if (type === "universal") {
    return {
      universal: true,
      fits: [],
      doesNotFit: extra.doesNotFit,
      fitmentNote: extra.fitmentNote || honestFitmentNote(vc.universalNote),
    };
  }
  if (type === "semi-universal") {
    const fromRows = rows.map(formatFitmentVehicle).filter(Boolean);
    const merged = [...new Set([...extra.doesNotFit, ...fromRows])];
    return {
      universal: true,
      fits: [],
      doesNotFit: merged,
      fitmentNote: extra.fitmentNote || honestFitmentNote(vc.universalNote),
    };
  }
  return {
    universal: false,
    fits: rows,
    doesNotFit: extra.doesNotFit,
    fitmentNote: extra.fitmentNote || null,
  };
}

/**
 * JSON-LD additionalProperty rows (only for fields that exist).
 */
export function specAdditionalProperties(specs) {
  return specTableRows(specs).map((row) => ({
    "@type": "PropertyValue",
    name: row.label,
    value: row.value,
  }));
}

/**
 * schema.org isAccessoryOrSparePartFor — only for model-specific fitment.
 */
export function fitmentVehiclesForSchema(fitment) {
  const f = fitment && typeof fitment === "object" ? fitment : null;
  if (!f || f.universal || !Array.isArray(f.fits) || !f.fits.length) return [];
  return f.fits.map((row) => {
    const years = formatYearRange(row.yearFrom, row.yearTo);
    const name = [row.make, row.model, years].filter(Boolean).join(" ");
    const node = {
      "@type": "Car",
      name,
      brand: { "@type": "Brand", name: row.make },
      model: row.model,
    };
    if (row.yearFrom != null) node.vehicleModelDate = String(row.yearFrom);
    if (row.trim) node.vehicleTrim = row.trim;
    return node;
  });
}

export function specsFromProduct(product) {
  if (!product || typeof product !== "object") return normalizeProductSpecs({});
  return normalizeProductSpecs(product);
}

function parseFitsCell(raw) {
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    /* pipe-separated make|model|yearFrom|yearTo|trim */
  }
  return String(raw)
    .split(";")
    .map((chunk) => {
      const [make, model, yearFrom, yearTo, trim, note] = chunk.split("|").map((s) => s.trim());
      if (!make || !model) return null;
      return { make, model, yearFrom, yearTo, trim, note };
    })
    .filter(Boolean);
}

/**
 * Patch object from a CSV row. Empty cells are omitted (never guessed, never cleared).
 * Spec-only templates use `weight`; full product CSV uses `specWeight` for the spec string.
 */
export function specPatchFromCsvRow(row) {
  if (!row || typeof row !== "object") return {};
  const specInput = {};
  for (const key of SPEC_FIELD_KEYS) {
    if (key === "weight") {
      const fromSpecCol = String(row.specWeight || "").trim();
      const fromWeightCol = String(row.weight || "").trim();
      const fullProductCsv = String(row.regularPrice || "").trim() !== "";
      const raw = fromSpecCol || (fullProductCsv ? "" : fromWeightCol);
      if (raw) specInput.weight = raw;
      continue;
    }
    if (row[key]) specInput[key] = row[key];
  }
  const patch = {};
  const specs = normalizeProductSpecs(specInput);
  for (const [k, v] of Object.entries(specs)) {
    if (specInput[k] != null && specInput[k] !== "" && v != null) patch[k] = v;
  }
  if (row.paintStatus && !PAINT_STATUS.includes(row.paintStatus)) delete patch.paintStatus;
  if (row.installationDifficulty && !INSTALLATION_DIFFICULTY.includes(row.installationDifficulty)) {
    delete patch.installationDifficulty;
  }

  const hasFitmentCell = row.fitment_universal || row.fitment_note || row.does_not_fit || row.fits;
  if (hasFitmentCell) {
    patch.fitment = normalizeFitment({
      universal: /^(1|true|yes|universal)$/i.test(row.fitment_universal || ""),
      fitmentNote: row.fitment_note || undefined,
      doesNotFit: row.does_not_fit
        ? String(row.does_not_fit)
            .split("|")
            .map((s) => s.trim())
            .filter(Boolean)
        : [],
      fits: parseFitsCell(row.fits || "") || [],
    });
  }
  return patch;
}

export function isSpecBackfillCsv(headers) {
  const set = new Set((headers || []).map((h) => String(h || "").trim()));
  if (!set.has("slug")) return false;
  if (set.has("regularPrice")) return false;
  return SPEC_BACKFILL_COLUMNS.some((k) => set.has(k));
}
