/**
 * Detect when a product name/slug clearly identifies a different vehicle model
 * than the generation hub it is listed on (e.g. Alto-titled SKU on a Swift page).
 *
 * Used as a storefront safety net when Mongo fitment rows are wrong.
 * Does NOT invent compatibility — only rejects clear cross-model title conflicts.
 */

/** Sibling models that must not share a vehicle hub based on title alone. */
export const EXCLUSIVE_MODEL_TOKENS = {
  suzuki: [
    "alto",
    "swift",
    "cultus",
    "wagonr",
    "wagon r",
    "mehran",
    "ravi",
    "bolan",
    "every",
    "jimny",
    "vitara",
    "baleno",
    "ciaz",
    "dzire",
    "fronx",
  ],
  toyota: [
    "corolla",
    "aqua",
    "prius",
    "yaris",
    "vitz",
    "passo",
    "fortuner",
    "hilux",
    "revo",
    "prado",
    "land cruiser",
    "raize",
    "cross",
  ],
  honda: ["civic", "city", "brv", "br-v", "hrv", "hr-v", "vezel", "fit", "accord"],
  hyundai: ["tucson", "elantra", "sonata", "santro", "tucson hybrid"],
  kia: ["sportage", "stonic", "picanto", "sorento", "carnival"],
  changan: ["alsvin", "oshan", "oshanx7", "karvaan", "m9"],
  haval: ["h6", "jolion"],
  mg: ["hs", "zs", "gt"],
  byd: ["atto", "atto3", "seal", "shark"],
  chery: ["tiggo", "tiggo8", "tiggo8pro"],
};

function norm(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenHits(haystack, token) {
  const h = ` ${norm(haystack)} `;
  const t = norm(token);
  if (!t) return false;
  // Require whole-token boundaries (spaces) so "cross" does not fire inside unrelated words.
  return h.includes(` ${t} `);
}

/**
 * @param {string} make
 * @returns {string[]}
 */
export function exclusiveTokensForMake(make) {
  const key = norm(make).split(" ")[0];
  return EXCLUSIVE_MODEL_TOKENS[key] || [];
}

/**
 * Normalize Vehicle.model for comparison (strip make prefix).
 * @param {string} make
 * @param {string} model
 */
/** Tokens that refer to the same commercial model family (not conflicts). */
const MODEL_ALIASES = {
  toyota: {
    hilux: ["hilux", "revo", "hilux revo"],
    revo: ["hilux", "revo", "hilux revo"],
    "yaris cross": ["yaris cross", "yaris"],
    "corolla cross": ["corolla cross", "corolla"],
    mark: ["mark", "mark x"],
    "mark x": ["mark", "mark x"],
  },
  honda: {
    "br-v": ["brv", "br-v"],
    brv: ["brv", "br-v"],
    "hr-v": ["hrv", "hr-v", "vezel"],
    hrv: ["hrv", "hr-v", "vezel"],
  },
};

function aliasSet(make, token) {
  const mk = norm(make).split(" ")[0];
  const map = MODEL_ALIASES[mk] || {};
  const t = norm(token);
  const group = map[t];
  return new Set(group || [t]);
}

export function canonicalModelToken(make, model) {
  let m = norm(model);
  const mk = norm(make);
  if (mk && m.startsWith(`${mk} `)) m = m.slice(mk.length + 1);
  // Prefer the longest exclusive token that matches the model string.
  const tokens = exclusiveTokensForMake(make).slice().sort((a, b) => b.length - a.length);
  for (const t of tokens) {
    if (m === t || m.startsWith(`${t} `) || m.endsWith(` ${t}`) || m.includes(` ${t} `)) {
      return t;
    }
  }
  return m.split(" ")[0] || m;
}
/**
 * @param {{ name?: string, slug?: string, title?: string }} product
 * @param {{ make?: string, model?: string, slug?: string, displayName?: string }} vehicle
 * @returns {{ conflict: boolean, reason?: string, titleToken?: string, vehicleToken?: string }}
 */
export function detectTitleModelConflict(product, vehicle) {
  const make = String(vehicle?.make || "").trim();
  const vehicleToken = canonicalModelToken(make, vehicle?.model || "");
  if (!make || !vehicleToken) return { conflict: false };

  const hay = [product?.name, product?.title, product?.slug]
    .filter(Boolean)
    .map((s) => String(s))
    .join(" ");
  if (!hay.trim()) return { conflict: false };

  const tokens = exclusiveTokensForMake(make);
  if (!tokens.length) return { conflict: false };

  const hitTokens = tokens.filter((t) => tokenHits(hay, t));
  if (!hitTokens.length) return { conflict: false };

  const vehicleAliases = aliasSet(make, vehicleToken);
  // Also expand aliases for multi-word vehicle models (e.g. "hilux revo").
  for (const part of norm(vehicle?.model || "").split(" ")) {
    for (const a of aliasSet(make, part)) vehicleAliases.add(a);
  }

  const vehicleHit = hitTokens.some((t) => vehicleAliases.has(t));
  if (vehicleHit && hitTokens.every((t) => vehicleAliases.has(t))) {
    return { conflict: false };
  }

  // Conflict when a sibling model is named and the vehicle model is NOT named.
  const foreign = hitTokens.filter((t) => !vehicleAliases.has(t));
  if (!foreign.length) return { conflict: false };

  if (vehicleHit) {
    // Both own + foreign model in title (rare) — treat as AMBIGUOUS, do not auto-hide.
    return {
      conflict: false,
      reason: "ambiguous_multi_model_title",
      titleToken: foreign[0],
      vehicleToken,
    };
  }
  return {
    conflict: true,
    reason: `title_names_${foreign[0]}_on_${vehicleToken}_hub`,
    titleToken: foreign[0],
    vehicleToken,
  };
}

/**
 * Filter products that clearly belong to a different model (title conflict).
 * @param {object[]} products
 * @param {object} vehicle
 */
export function rejectTitleModelConflicts(products, vehicle) {
  const kept = [];
  const rejected = [];
  for (const p of products || []) {
    const hit = detectTitleModelConflict(p, vehicle);
    if (hit.conflict) rejected.push({ product: p, ...hit });
    else kept.push(p);
  }
  return { kept, rejected };
}
