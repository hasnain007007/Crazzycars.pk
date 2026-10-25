/**
 * Normalize a fitment row so `model` is the parent model (Civic, Corolla, City)
 * and generation nicknames (Reborn, E170–E210, Classic, 7th Gen) live in generation.
 */

/** Make → generation nickname → parent model */
const GENERATION_TO_MODEL = {
  honda: {
    reborn: "Civic",
    rebirth: "Civic",
    "civic x": "Civic",
    "civicx": "Civic",
    "11th gen": "Civic",
    "10th gen": "Civic",
    "8th gen": "Civic",
    classic: "City",
    "7th gen": "City",
    "6th gen": "City",
  },
  toyota: {
    e120: "Corolla",
    e140: "Corolla",
    e170: "Corolla",
    "e170-e210": "Corolla",
    "e170–e210": "Corolla",
    "e170—e210": "Corolla",
    axio: "Corolla",
  },
  suzuki: {
    classic: "Alto",
  },
};

/** Known generation-looking tokens (any make) that should never stay as model alone. */
const GENERATION_LIKE =
  /^(reborn|rebirth|civic\s*x|11th\s*gen|10th\s*gen|8th\s*gen|7th\s*gen|6th\s*gen|classic|e120|e140|e170(?:\s*[–—-]\s*e210)?)$/i;

function normKey(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/[—–]/g, "-")
    .replace(/\s+/g, " ");
}

/**
 * @param {{ make?: string, model?: string, generation?: string, generationLabel?: string, generationId?: string|null, yearFrom?: number|null, yearTo?: number|null, bodyStyle?: string, notes?: string }} row
 * @param {{ make?: string, model?: string, name?: string }|null} [catalogGen] vehicle-catalog generation doc when generationId resolved
 */
export function resolveVehicleFitmentRow(row, catalogGen = null) {
  const raw = row && typeof row === "object" ? row : {};
  let make = String(raw.make || catalogGen?.make || "").trim();
  let model = String(raw.model || "").trim();
  let generation = String(
    raw.generationLabel || raw.generation || catalogGen?.name || ""
  ).trim();

  if (catalogGen?.model) {
    model = String(catalogGen.model).trim();
    if (!generation && catalogGen.name) generation = String(catalogGen.name).trim();
  } else {
    const makeKey = normKey(make);
    const modelKey = normKey(model);
    const mapped = GENERATION_TO_MODEL[makeKey]?.[modelKey];
    if (mapped) {
      if (!generation) generation = model;
      model = mapped;
    } else if (GENERATION_LIKE.test(modelKey) && !generation) {
      // Unknown make mapping — still move nickname out of model when it looks like a gen.
      generation = model;
      // Best-effort parent: keep model empty so caller can show generation only — prefer keeping original if no map.
    }
  }

  return {
    make,
    model,
    generation,
    generationId:
      raw.generationId != null && raw.generationId !== ""
        ? String(raw.generationId)
        : null,
    yearFrom: raw.yearFrom ?? null,
    yearTo: raw.yearTo ?? null,
    bodyStyle: raw.bodyStyle || "All",
    notes: String(raw.notes || "").trim(),
  };
}

/** Full years with en dash: 2006–2012 */
export function formatFitmentYears(row) {
  const from = row?.yearFrom;
  const to = row?.yearTo;
  if (from == null && to == null) return "";
  if (from == null) return String(to);
  if (to == null) return String(from);
  if (Number(from) === Number(to)) return String(from);
  return `${from}–${to}`;
}

/** Car schema / display name: "Honda Civic Reborn 2006–2012" */
export function fitmentCarDisplayName(row) {
  const r = resolveVehicleFitmentRow(row);
  const years = formatFitmentYears(r);
  return [r.make, r.model, r.generation, years].filter(Boolean).join(" ");
}
