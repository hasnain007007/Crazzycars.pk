/**
 * Put the real model name back into fitment rows that hold a generation code instead
 * (model "E170–E210" → model "Corolla", generation "E170–E210").
 *
 * Only rewrites a row when the Car Catalog gives exactly one answer for that make and
 * year range; anything ambiguous is left alone and reported. Real model names that are
 * simply not in the catalog (Audi A4, Prado, …) are left as they are.
 */
import { resolveGenerationId } from "@/lib/fitmentGeneration";

const lower = (s) => String(s || "").trim().toLowerCase();
/** "1 Gen(X120)" and "1st Gen (X120)" → "1genx120". */
const compact = (s) => lower(s).replace(/(\d)(st|nd|rd|th)\b/g, "$1").replace(/[^a-z0-9]/g, "");

function entryGeneration(e) {
  return String(e?.generation || e?.nickname || "").trim();
}

function yearsOverlap(row, e) {
  const rf = Number(row.yearFrom) || 0;
  const rt = Number(row.yearTo) || 9999;
  const ef = Number(e.yearFrom) || 0;
  const et = Number(e.yearTo) || 9999;
  return Math.max(rf, ef) <= Math.min(rt, et);
}

/**
 * Loose match for labels like "Elantra 2020-2024-CN7" or
 * "hyundai-elantra-hybrid-2025-present-CN7 Facelift": the label must contain the
 * entry's generation code and the years must overlap. Longest code wins
 * ("CN7 Facelift" beats "CN7"); a tie means ambiguous.
 */
function looseMatch(row, models) {
  const label = compact(row.model);
  const hits = models
    .filter((e) => {
      const gen = compact(entryGeneration(e));
      return gen.length >= 3 && label.includes(gen) && yearsOverlap(row, e);
    })
    .map((e) => ({ e, len: compact(entryGeneration(e)).length }))
    .sort((a, b) => b.len - a.len);
  if (!hits.length) return null;
  if (hits.length > 1 && hits[0].len === hits[1].len) return null;
  return hits[0].e;
}

/**
 * @param {{ make: string, model: string, yearFrom?: number|null, yearTo?: number|null }} row
 * @param {Array<object>} catalogModels Car Catalog models for this make (name, generation, nickname, years, _id)
 * @returns {{ changed: false, reason?: string } | { changed: true, model: string, generation: string, generationId: string|null, from: string }}
 */
export function normalizeFitmentModel(row, catalogModels = []) {
  const models = (catalogModels || []).filter((e) => e && e.isActive !== false);
  const model = String(row?.model || "").trim();
  if (!model || !models.length) return { changed: false, reason: "no catalog" };
  if (models.some((e) => lower(e.name) === lower(model))) return { changed: false };

  let hit = null;
  const res = resolveGenerationId(row.make, model, row.yearFrom, row.yearTo, models);
  if (res.generationId && !res.unmatched) {
    hit = models.find((e) => String(e._id) === String(res.generationId)) || null;
  }
  if (!hit) {
    const byCode = models.filter((e) => compact(entryGeneration(e)) === compact(model) && yearsOverlap(row, e));
    hit = byCode.length === 1 ? byCode[0] : looseMatch(row, models);
  }
  if (!hit || !hit.name) return { changed: false, reason: "not in car catalog" };

  return {
    changed: true,
    from: model,
    model: String(hit.name).trim(),
    generation: entryGeneration(hit),
    generationId: hit._id ? String(hit._id) : null,
  };
}

/** Catalog makes (from CarCatalog) → lower(make) → models[]. */
export function catalogModelsByMake(makes = []) {
  const map = new Map();
  for (const mk of makes || []) {
    map.set(lower(mk.name), mk.models || []);
  }
  return map;
}
