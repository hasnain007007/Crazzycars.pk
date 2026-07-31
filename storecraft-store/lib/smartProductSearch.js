/**
 * Smarter storefront search on top of MongoDB $text.
 *
 * Plain $text treats space-separated terms as OR, so
 * "Honda city side mirror indicator" ranks any Honda City product
 * (e.g. trunk spoilers) above the actual side-mirror indicator.
 *
 * Approach:
 *  1. Detect product phrases + significant tokens (+ light synonyms)
 *  2. Prefer phrase-quoted $text, plus a token-AND candidate pass
 *  3. Re-rank in JS: reward phrase/type coverage, penalize missing type words
 */

function escapeRegex(s) {
  return String(s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const STOPWORDS = new Set([
  "a",
  "an",
  "the",
  "for",
  "of",
  "and",
  "or",
  "with",
  "to",
  "in",
  "on",
  "at",
  "by",
  "from",
  "into",
  "pair",
  "pcs",
  "pc",
  "set",
  "kit",
  "style",
  "new",
  "model",
  "car",
  "cars",
  "auto",
  "universal",
]);

/** Multi-word product phrases (longest first). */
const PHRASES = [
  "side mirror",
  "door mirror",
  "wing mirror",
  "rear view mirror",
  "door handle",
  "trunk lip",
  "boot lip",
  "window quarter",
  "quarter glass",
  "steering wheel",
  "seat cover",
  "floor mat",
  "dashboard mat",
  "dash mat",
  "body kit",
  "side skirt",
  "front grille",
  "grill",
  "head light",
  "headlight",
  "tail light",
  "taillight",
  "fog light",
  "number plate",
  "license plate",
  "turn signal",
  "led strip",
  "under glow",
  "underglow",
];

/** Product-type tokens — missing these from the title is a hard demotion. */
const TYPE_WORDS = new Set([
  "indicator",
  "indicators",
  "mirror",
  "mirrors",
  "spoiler",
  "spoilers",
  "cover",
  "covers",
  "mat",
  "mats",
  "skirt",
  "skirts",
  "handle",
  "handles",
  "grille",
  "grill",
  "light",
  "lights",
  "bulb",
  "bulbs",
  "sensor",
  "sensors",
  "camera",
  "cameras",
  "perfume",
  "fragrance",
  "freshener",
  "knob",
  "knobs",
  "curtain",
  "curtains",
  "trim",
  "trims",
  "emblem",
  "logo",
  "horn",
  "charger",
  "compressor",
  "inflator",
  "wiper",
  "wipers",
  "antenna",
  "mudflap",
  "mudflaps",
  "guard",
  "guards",
  "splitter",
  "diffuser",
  "louver",
  "louvers",
]);

const MAKES = new Set([
  "toyota",
  "honda",
  "suzuki",
  "hyundai",
  "kia",
  "mg",
  "haval",
  "byd",
  "changan",
  "chery",
  "nissan",
  "daihatsu",
  "mitsubishi",
  "bmw",
  "audi",
  "mercedes",
]);

/** Expand user tokens with light accessory synonyms (one hop). */
const SYNONYMS = {
  indicator: ["indicators", "sequential", "flasher", "signal"],
  indicators: ["indicator", "sequential", "flasher", "signal"],
  mirror: ["mirrors"],
  mirrors: ["mirror"],
  spoiler: ["spoilers", "wing"],
  spoilers: ["spoiler", "wing"],
  mat: ["mats", "carpet"],
  mats: ["mat", "carpet"],
  cover: ["covers"],
  covers: ["cover"],
  grille: ["grill", "grills"],
  grill: ["grille", "grills"],
  light: ["lights", "lamp", "lamps", "led"],
  lights: ["light", "lamp", "lamps", "led"],
  bulb: ["bulbs", "led"],
  bulbs: ["bulb", "led"],
  signal: ["indicator", "indicators", "flasher"],
  flasher: ["indicator", "indicators", "signal"],
  sequential: ["indicator", "indicators"],
};

function normalizeQuery(q) {
  return String(q || "")
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9+\s.-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * @returns {{
 *   raw: string,
 *   normalized: string,
 *   phrases: string[],
 *   tokens: string[],
 *   typeTokens: string[],
 *   makeTokens: string[],
 *   modelTokens: string[],
 * }}
 */
export function parseSearchQuery(q) {
  const raw = String(q || "").trim();
  let normalized = normalizeQuery(raw);
  const phrases = [];
  let rest = ` ${normalized} `;

  const sortedPhrases = [...PHRASES].sort((a, b) => b.length - a.length);
  for (const phrase of sortedPhrases) {
    const needle = ` ${phrase} `;
    if (rest.includes(needle)) {
      phrases.push(phrase);
      rest = rest.split(needle).join(" ");
    }
  }

  const tokens = rest
    .trim()
    .split(/\s+/)
    .map((t) => t.replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, ""))
    .filter((t) => t.length >= 2 && !STOPWORDS.has(t));

  // Keep phrase words as tokens too (for coverage scoring), de-duped.
  const phraseWords = phrases.flatMap((p) => p.split(/\s+/));
  const allTokens = [...new Set([...tokens, ...phraseWords])].filter(
    (t) => t.length >= 2 && !STOPWORDS.has(t)
  );

  const typeTokens = allTokens.filter((t) => TYPE_WORDS.has(t));
  const makeTokens = allTokens.filter((t) => MAKES.has(t));
  const modelTokens = allTokens.filter((t) => !TYPE_WORDS.has(t) && !MAKES.has(t));

  return {
    raw,
    normalized,
    phrases,
    tokens: allTokens,
    typeTokens,
    makeTokens,
    modelTokens,
  };
}

/** Build a $text search string with quoted phrases for higher weight. */
export function buildTextSearchString(parsed) {
  const parts = [];
  for (const phrase of parsed.phrases) {
    parts.push(`"${phrase}"`);
  }
  // Quote make+next model token when present (e.g. "honda city").
  if (parsed.makeTokens.length && parsed.modelTokens.length) {
    const make = parsed.makeTokens[0];
    const model = parsed.modelTokens[0];
    const combo = `${make} ${model}`;
    if (!parsed.phrases.includes(combo) && parsed.normalized.includes(combo)) {
      parts.push(`"${combo}"`);
    }
  }
  for (const t of parsed.tokens) {
    // Avoid duplicating phrase words already quoted as a unit when possible,
    // but still include type words so they influence OR recall.
    parts.push(t);
  }
  // Synonym expansions as optional OR terms (helps "turn signal" ↔ indicator).
  for (const t of parsed.typeTokens) {
    for (const syn of SYNONYMS[t] || []) {
      if (!parsed.tokens.includes(syn)) parts.push(syn);
    }
  }
  return [...new Set(parts)].join(" ").trim() || parsed.normalized;
}

function haystackOf(doc) {
  const tags = Array.isArray(doc.tags) ? doc.tags.join(" ") : "";
  const cars = Array.isArray(doc.compatibleCars)
    ? doc.compatibleCars
        .map((c) => `${c?.make || ""} ${c?.model || ""}`)
        .join(" ")
    : "";
  return normalizeQuery(`${doc.name || ""} ${doc.slug || ""} ${doc.articleNo || ""} ${tags} ${cars}`);
}

function tokenPresent(hay, token) {
  if (!token) return false;
  if (hay.includes(token)) return true;
  for (const syn of SYNONYMS[token] || []) {
    if (hay.includes(syn)) return true;
  }
  return false;
}

/**
 * Higher is better. Tuned for accessory queries with make/model + product type.
 */
export function scoreSearchCandidate(doc, parsed, textScore = 0) {
  const hay = haystackOf(doc);
  const name = normalizeQuery(doc.name || "");
  let score = Number(textScore) || 0;

  // Phrases in the title are the strongest signal.
  for (const phrase of parsed.phrases) {
    if (name.includes(phrase)) score += 220;
    else if (hay.includes(phrase)) score += 120;
    else score -= 90;
  }

  // Make / model
  for (const make of parsed.makeTokens) {
    if (name.includes(make)) score += 70;
    else if (hay.includes(make)) score += 35;
    else score -= 40;
  }
  for (const model of parsed.modelTokens.slice(0, 2)) {
    if (name.includes(model)) score += 80;
    else if (hay.includes(model)) score += 40;
  }

  // Product-type words: missing them is why spoilers beat indicators.
  let typeHits = 0;
  for (const t of parsed.typeTokens) {
    if (tokenPresent(name, t)) {
      typeHits += 1;
      score += 160;
    } else if (tokenPresent(hay, t)) {
      typeHits += 1;
      score += 80;
    } else {
      score -= 200;
    }
  }
  if (parsed.typeTokens.length && typeHits === parsed.typeTokens.length) {
    score += 120;
  }

  // General token coverage on the name
  let hits = 0;
  for (const t of parsed.tokens) {
    if (tokenPresent(name, t)) {
      hits += 1;
      score += 28;
    } else if (tokenPresent(hay, t)) {
      hits += 1;
      score += 12;
    }
  }
  const coverage = parsed.tokens.length ? hits / parsed.tokens.length : 1;
  score += Math.round(coverage * 100);
  if (parsed.tokens.length >= 3 && coverage < 0.45) score -= 180;
  if (coverage >= 0.85) score += 80;

  // Prefer shorter, more specific titles slightly when coverage is equal.
  score -= Math.min(40, Math.floor((name.length || 0) / 12));

  return score;
}

function looksLikeSku(term) {
  const t = String(term || "").trim();
  return /^[a-z]{1,8}[-_][a-z0-9][-a-z0-9_]*$/i.test(t) || /^cc[-_]?\d+/i.test(t);
}

/**
 * Fetch + re-rank products for suggest / catalog search.
 *
 * @returns {Promise<{ rows: object[], total: number, mode: string, parsed: object }>}
 */
export async function queryProductsSmart(Product, baseFilter, q, opts = {}) {
  const {
    limit = 8,
    skip = 0,
    select,
    populate,
    candidateLimit = Math.max(40, limit * 5),
    sortSpec = null,
    countTotal = false,
  } = opts;

  const term = String(q || "").trim();
  const parsed = parseSearchQuery(term);

  async function findLean(filter, projection, sort, lim) {
    let query = Product.find(filter, projection);
    if (select) query = query.select(select);
    if (populate) query = query.populate(populate, "name slug");
    if (sort) query = query.sort(sort);
    return query.limit(lim).maxTimeMS(3500).lean();
  }

  if (!term) {
    let query = Product.find(baseFilter);
    if (select) query = query.select(select);
    if (populate) query = query.populate(populate, "name slug");
    const rows = await query
      .sort(sortSpec || { createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    const total = countTotal ? await Product.countDocuments(baseFilter) : rows.length;
    return { rows, total, mode: "none", parsed };
  }

  if (looksLikeSku(term)) {
    const skuFilter = {
      ...baseFilter,
      articleNo: new RegExp(`^${escapeRegex(term)}`, "i"),
    };
    const rows = await findLean(skuFilter, null, sortSpec || { createdAt: -1 }, limit + skip);
    if (rows.length) {
      const sliced = rows.slice(skip, skip + limit);
      const total = countTotal ? await Product.countDocuments(skuFilter) : rows.length;
      return { rows: sliced, total, mode: "sku", parsed };
    }
  }

  const byId = new Map();

  function addRows(rows, withTextScore = false) {
    for (const row of rows || []) {
      const id = String(row._id);
      const prev = byId.get(id);
      const ts = withTextScore ? Number(row.score) || 0 : 0;
      if (!prev || ts > (prev._textScore || 0)) {
        byId.set(id, { ...row, _textScore: ts });
      }
    }
  }

  // Pass 1 — phrase-aware $text (best recall + index speed).
  const textQ = buildTextSearchString(parsed);
  try {
    const textFilter = { ...baseFilter, $text: { $search: textQ } };
    const textRows = await findLean(
      textFilter,
      { score: { $meta: "textScore" } },
      { score: { $meta: "textScore" } },
      candidateLimit
    );
    addRows(textRows, true);
  } catch {
    // no text index
  }

  // Pass 2 — when the user named a product type, insist name matches it
  // (plus make/model if present) so indicators aren't drowned by Honda City OR hits.
  if (parsed.typeTokens.length) {
    const and = [];
    for (const t of parsed.typeTokens) {
      const alts = [t, ...(SYNONYMS[t] || [])];
      and.push({
        $or: alts.map((a) => ({ name: new RegExp(escapeRegex(a), "i") })),
      });
    }
    for (const make of parsed.makeTokens.slice(0, 1)) {
      and.push({ name: new RegExp(escapeRegex(make), "i") });
    }
    for (const model of parsed.modelTokens.slice(0, 1)) {
      and.push({ name: new RegExp(escapeRegex(model), "i") });
    }
    try {
      const typed = await findLean(
        { ...baseFilter, $and: and },
        null,
        { createdAt: -1 },
        Math.min(30, candidateLimit)
      );
      addRows(typed, false);
    } catch {
      // ignore
    }
  }

  // Pass 3 — regex fallback if still empty (typos / no text index).
  if (!byId.size) {
    const rx = new RegExp(escapeRegex(term), "i");
    const regexOr = [
      { name: rx },
      { slug: rx },
      { articleNo: rx },
      { tags: rx },
      { "compatibleCars.make": rx },
      { "compatibleCars.model": rx },
    ];
    // Multi-token AND on name for longer queries.
    if (parsed.tokens.length >= 2) {
      const andName = parsed.tokens.slice(0, 5).map((t) => ({
        name: new RegExp(escapeRegex(t), "i"),
      }));
      try {
        const andRows = await findLean(
          { ...baseFilter, $and: andName },
          null,
          { createdAt: -1 },
          candidateLimit
        );
        addRows(andRows, false);
      } catch {
        // ignore
      }
    }
    if (!byId.size) {
      const rows = await findLean(
        { ...baseFilter, $or: regexOr },
        null,
        { createdAt: -1 },
        candidateLimit
      );
      addRows(rows, false);
    }
  }

  const ranked = [...byId.values()]
    .map((doc) => ({
      doc,
      smart: scoreSearchCandidate(doc, parsed, doc._textScore),
    }))
    .sort((a, b) => b.smart - a.smart || (b.doc._textScore || 0) - (a.doc._textScore || 0));

  let total = ranked.length;
  if (countTotal) {
    try {
      const textFilter = { ...baseFilter, $text: { $search: textQ || parsed.normalized } };
      const textCount = await Product.countDocuments(textFilter).maxTimeMS(3000);
      total = Math.max(ranked.length, textCount || 0);
    } catch {
      total = ranked.length;
    }
  }

  const page = ranked.slice(skip, skip + limit).map(({ doc }) => {
    const { _textScore, ...rest } = doc;
    return rest;
  });

  return {
    rows: page,
    total,
    mode: "smart",
    parsed,
  };
}
