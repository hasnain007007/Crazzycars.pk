/**
 * Resolve Car Catalog generation ObjectIds for product fitment rows.
 *
 * Never silently picks the first catalog model — ambiguous / zero matches
 * return unmatched: true with generationId: null.
 */

const CURRENT_YEAR = new Date().getFullYear();

function norm(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function yearBound(raw, fallback) {
  if (raw == null || raw === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Exclusive year-range overlap: ≥2 overlapping years, OR full containment
 * (exclusive-boundary single-year rows). Adjacent gens that only share a
 * boundary year (e.g. 2009–2014 vs 2014–2026) do NOT match.
 */
export function exclusiveYearOverlap(aFrom, aTo, bFrom, bTo, { presentYear = CURRENT_YEAR } = {}) {
  const af = yearBound(aFrom, 0);
  const at = yearBound(aTo, presentYear);
  const bf = yearBound(bFrom, 0);
  const bt = yearBound(bTo, presentYear);
  if (af > at || bf > bt) {
    return { overlaps: false, years: 0, exclusiveBoundary: false };
  }
  const start = Math.max(af, bf);
  const end = Math.min(at, bt);
  if (start > end) {
    return { overlaps: false, years: 0, exclusiveBoundary: false };
  }
  const years = end - start + 1;
  const aInB = af >= bf && at <= bt;
  const bInA = bf >= af && bt <= at;
  const exclusiveBoundary = years === 1 && (aInB || bInA);
  const overlaps = years >= 2 || aInB || bInA;
  return { overlaps, years, exclusiveBoundary };
}

/** Inclusive overlap length in years (0 if none). */
export function yearOverlapYears(aFrom, aTo, bFrom, bTo) {
  const A = { lo: yearBound(aFrom, 0), hi: yearBound(aTo, 9999) };
  const B = { lo: yearBound(bFrom, 0), hi: yearBound(bTo, 9999) };
  const start = Math.max(A.lo, B.lo);
  const end = Math.min(A.hi, B.hi);
  if (end < start) return 0;
  return end - start + 1;
}

function entryId(entry) {
  if (!entry) return null;
  const id = entry._id ?? entry.id ?? entry.generationId ?? null;
  return id != null && id !== "" ? String(id) : null;
}

function entryLabel(entry) {
  return String(
    entry?.generation || entry?.nickname || entry?.name || entry?.model || ""
  ).trim();
}

function entryBaseModel(entry) {
  return String(entry?.name || entry?.model || "").trim();
}

function entryYearFrom(entry) {
  if (entry?.yearFrom != null && entry.yearFrom !== "") return Number(entry.yearFrom);
  if (Array.isArray(entry?.years) && entry.years.length) {
    return Math.min(...entry.years.map(Number).filter(Number.isFinite));
  }
  return null;
}

function entryYearTo(entry) {
  if (entry?.yearTo != null && entry.yearTo !== "") return Number(entry.yearTo);
  if (Array.isArray(entry?.years) && entry.years.length) {
    return Math.max(...entry.years.map(Number).filter(Number.isFinite));
  }
  return null;
}

/**
 * Does the free-text model/nickname/generation label refer to this catalog entry?
 */
export function catalogEntryMatchesModelLabel(entry, modelLabel) {
  const needle = norm(modelLabel);
  if (!needle) return false;
  const labels = [
    entry?.name,
    entry?.model,
    entry?.nickname,
    entry?.generation,
    entryLabel(entry),
  ]
    .map(norm)
    .filter(Boolean);
  if (labels.includes(needle)) return true;
  const base = norm(entryBaseModel(entry));
  if (base && (base === needle || base.startsWith(`${needle} `))) {
    if (needle === "corolla" && base.includes("cross")) return false;
    return true;
  }
  return false;
}

function unmatchedResult(extra = {}) {
  return {
    generationId: null,
    generationLabel: "",
    confidence: "none",
    unmatched: true,
    overlapYears: 0,
    ...extra,
  };
}

/**
 * Resolve a Car Catalog generation for a fitment row.
 *
 * @param {string} make
 * @param {string} model - base model, nickname, or generation label
 * @param {number|null|undefined} yearFrom
 * @param {number|null|undefined} yearTo
 * @param {Array<object>} catalogModels - models for this make (with _id + year range)
 * @returns {{ generationId: string|null, generationLabel: string, confidence: 'exact'|'overlap'|'none', unmatched: boolean, overlapYears?: number, matches?: object[] }}
 */
export function resolveGenerationId(make, model, yearFrom, yearTo, catalogModels = []) {
  const list = Array.isArray(catalogModels) ? catalogModels.filter(Boolean) : [];
  if (!list.length || !norm(model)) {
    return unmatchedResult();
  }

  const byLabel = list.filter((e) => catalogEntryMatchesModelLabel(e, model));
  if (!byLabel.length) {
    return unmatchedResult();
  }

  const yFrom = yearFrom != null && yearFrom !== "" ? Number(yearFrom) : null;
  const yTo = yearTo != null && yearTo !== "" ? Number(yearTo) : null;
  const hasYears = Number.isFinite(yFrom) || Number.isFinite(yTo);

  if (hasYears) {
    const exact = byLabel.filter((e) => {
      const ef = entryYearFrom(e);
      const et = entryYearTo(e);
      if (!Number.isFinite(ef)) return false;
      const fromOk = !Number.isFinite(yFrom) || ef === yFrom;
      const toOk =
        !Number.isFinite(yTo) ||
        et === yTo ||
        (yTo == null && (et == null || et === CURRENT_YEAR));
      return fromOk && toOk;
    });
    if (exact.length === 1) {
      const hit = exact[0];
      return {
        generationId: entryId(hit),
        generationLabel: entryLabel(hit),
        confidence: "exact",
        unmatched: !entryId(hit),
        overlapYears: yearOverlapYears(yFrom, yTo, entryYearFrom(hit), entryYearTo(hit)),
      };
    }
  }

  if (hasYears) {
    const overlapping = byLabel.filter((e) => {
      const ef = entryYearFrom(e);
      const et = entryYearTo(e);
      if (!Number.isFinite(ef)) return false;
      return exclusiveYearOverlap(yFrom ?? ef, yTo ?? et, ef, et).overlaps;
    });

    if (overlapping.length === 1) {
      const hit = overlapping[0];
      const ov = exclusiveYearOverlap(
        yFrom ?? entryYearFrom(hit),
        yTo ?? entryYearTo(hit),
        entryYearFrom(hit),
        entryYearTo(hit)
      );
      return {
        generationId: entryId(hit),
        generationLabel: entryLabel(hit),
        confidence: "overlap",
        unmatched: !entryId(hit),
        overlapYears: ov.years,
      };
    }

    if (overlapping.length > 1) {
      return unmatchedResult({
        matches: overlapping.map((e) => ({
          generationId: entryId(e),
          generationLabel: entryLabel(e),
          yearFrom: entryYearFrom(e),
          yearTo: entryYearTo(e),
        })),
      });
    }

    return unmatchedResult();
  }

  // No years: only safe if a single catalog entry matches the label
  if (byLabel.length === 1) {
    const hit = byLabel[0];
    return {
      generationId: entryId(hit),
      generationLabel: entryLabel(hit),
      confidence: "exact",
      unmatched: !entryId(hit),
      overlapYears: 0,
    };
  }

  // Multiple gens share the model name and no years → unmatched (never default to first)
  return unmatchedResult({
    matches: byLabel.map((e) => ({
      generationId: entryId(e),
      generationLabel: entryLabel(e),
      yearFrom: entryYearFrom(e),
      yearTo: entryYearTo(e),
    })),
  });
}

/**
 * Resolve using an existing generationId when present in catalog; else fall back to overlap.
 */
export function resolveGenerationFromRow(row, catalogModels = []) {
  const list = Array.isArray(catalogModels) ? catalogModels.filter(Boolean) : [];
  const wantId = row?.generationId != null && row.generationId !== "" ? String(row.generationId) : "";
  if (wantId) {
    const hit = list.find((e) => entryId(e) === wantId);
    if (hit) {
      return {
        generationId: wantId,
        generationLabel: entryLabel(hit) || String(row.generationLabel || "").trim(),
        confidence: "exact",
        unmatched: false,
        overlapYears: 0,
        entry: hit,
      };
    }
  }
  const resolved = resolveGenerationId(row?.make, row?.model, row?.yearFrom, row?.yearTo, list);
  const entry = resolved.generationId
    ? list.find((e) => entryId(e) === resolved.generationId) || null
    : null;
  return { ...resolved, entry };
}

/** Prefer generationId match; else require exclusive year overlap (≥2 or containment). */
export function fitmentRowMatchesVehicle(row, vehicle, { minOverlapYears = 2 } = {}) {
  if (!row || !vehicle) return false;
  const rowGen = row.generationId != null ? String(row.generationId) : "";
  const vehGen =
    vehicle.catalogModelId != null
      ? String(vehicle.catalogModelId)
      : vehicle.catalogGenerationId != null
        ? String(vehicle.catalogGenerationId)
        : vehicle.generationId != null
          ? String(vehicle.generationId)
          : "";
  if (rowGen && vehGen && rowGen === vehGen) return true;

  if (norm(row.make) !== norm(vehicle.make)) return false;
  const labels = [vehicle.model, vehicle.generation, vehicle.displayName, vehicle.nickname]
    .map(norm)
    .filter(Boolean);
  const rowModel = norm(row.model);
  const rowGenLabel = norm(row.generation || row.generationLabel);
  const modelOk =
    labels.includes(rowModel) ||
    labels.includes(rowGenLabel) ||
    catalogEntryMatchesModelLabel(
      { name: vehicle.model, model: vehicle.model, generation: vehicle.generation, nickname: vehicle.nickname },
      row.model
    );
  if (!modelOk) return false;

  const ov = exclusiveYearOverlap(row.yearFrom, row.yearTo, vehicle.yearFrom, vehicle.yearTo);
  if (ov.overlaps) return true;
  return yearOverlapYears(row.yearFrom, row.yearTo, vehicle.yearFrom, vehicle.yearTo) >= minOverlapYears;
}
