/**
 * Smarter storefront search on top of MongoDB $text.
 *
 * Goals:
 *  - Long accessory queries still return matches (not exact-title only)
 *  - Year ranges / stopwords don't kill recall
 *  - Make + product-type beat unrelated OR noise from $text
 *  - Progressive fallbacks: exact → text → typed AND → soft token match
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
  "pakistan",
  "pk",
  "homefy",
  "present",
]);

/** Multi-word product phrases (longest first). Homefy lifestyle terms first. */
const PHRASES = [
  "makeup pouch",
  "makeup bag",
  "toiletry bag",
  "travel kit",
  "beauty bag",
  "vanity bag",
  "ladies bag",
  "mini handbag",
  "tote bag",
  "crossbody bag",
  "frying pan",
  "sauce pan",
  "casserole pot",
  "knife set",
  "dinner plate",
  "spice rack",
  "lunch box",
  "tea set",
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
  "turn signal",
  "led strip",
  "under glow",
  "underglow",
  "head light",
  "tail light",
  "fog light",
  "number plate",
  "license plate",
  "neon indicator",
  "mirror indicator",
  "mirror cover",
];

/** Product-type tokens — missing these from the title is a hard demotion. */
const TYPE_WORDS = new Set([
  "pouch",
  "pouches",
  "tote",
  "totes",
  "clutch",
  "clutches",
  "crossbody",
  "handbag",
  "handbags",
  "makeup",
  "toiletry",
  "vanity",
  "cookware",
  "pan",
  "pans",
  "tawa",
  "casserole",
  "cutlery",
  "chopper",
  "container",
  "containers",
  "serveware",
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
  "neon",
  "sequential",
  "led",
  "rgb",
  "reflector",
  "bumper",
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
  "alto",
  "civic",
  "city",
  "vitz",
  "aqua",
  "yaris",
  "swift",
  "sonata",
  "elantra",
]);

/** Expand user tokens with light accessory synonyms (one hop). */
const SYNONYMS = {
  indicator: ["indicators", "sequential", "flasher", "signal", "neon"],
  indicators: ["indicator", "sequential", "flasher", "signal", "neon"],
  mirror: ["mirrors"],
  mirrors: ["mirror"],
  spoiler: ["spoilers", "wing"],
  spoilers: ["spoiler", "wing"],
  mat: ["mats", "carpet"],
  mats: ["mat", "carpet"],
  cover: ["covers", "cap", "caps"],
  covers: ["cover", "cap", "caps"],
  grille: ["grill", "grills"],
  grill: ["grille", "grills"],
  light: ["lights", "lamp", "lamps", "led"],
  lights: ["light", "lamp", "lamps", "led"],
  bulb: ["bulbs", "led"],
  bulbs: ["bulb", "led"],
  signal: ["indicator", "indicators", "flasher"],
  flasher: ["indicator", "indicators", "signal"],
  sequential: ["indicator", "indicators", "neon"],
  neon: ["indicator", "indicators", "sequential", "led"],
  led: ["light", "lights", "neon"],
  rgb: ["led", "neon"],
};

function isYearToken(t) {
  const s = String(t || "");
  if (/^\d{4}$/.test(s)) {
    const y = Number(s);
    return y >= 1980 && y <= 2035;
  }
  // 2015-2026, 2015–2026, 2009/2014
  if (/^\d{4}\s*[-–—/]\s*\d{4}$/.test(s)) return true;
  if (/^\d{4}\s*[-–—/]\s*present$/.test(s)) return true;
  return false;
}

function normalizeQuery(q) {
  return String(q || "")
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[–—]/g, "-")
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
 *   significantTokens: string[],
 *   typeTokens: string[],
 *   makeTokens: string[],
 *   modelTokens: string[],
 *   yearTokens: string[],
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

  const phraseWords = phrases.flatMap((p) => p.split(/\s+/));
  const allTokens = [...new Set([...tokens, ...phraseWords])].filter(
    (t) => t.length >= 2 && !STOPWORDS.has(t)
  );

  const yearTokens = allTokens.filter((t) => isYearToken(t));
  const typeTokens = allTokens.filter((t) => TYPE_WORDS.has(t));
  const makeTokens = allTokens.filter((t) => MAKES.has(t) && !TYPE_WORDS.has(t));
  const modelTokens = allTokens.filter(
    (t) => !TYPE_WORDS.has(t) && !MAKES.has(t) && !isYearToken(t)
  );
  // Years never belong in strict AND — they kill recall on near year ranges.
  const significantTokens = allTokens.filter((t) => !isYearToken(t));

  return {
    raw,
    normalized,
    phrases,
    tokens: allTokens,
    significantTokens,
    typeTokens,
    makeTokens,
    modelTokens,
    yearTokens,
  };
}

/** Build a $text search string with quoted phrases for higher weight. */
export function buildTextSearchString(parsed) {
  const parts = [];
  for (const phrase of parsed.phrases) {
    parts.push(`"${phrase}"`);
  }
  if (parsed.makeTokens.length && parsed.modelTokens.length) {
    const make = parsed.makeTokens[0];
    const model = parsed.modelTokens[0];
    const combo = `${make} ${model}`;
    if (!parsed.phrases.includes(combo) && parsed.normalized.includes(combo)) {
      parts.push(`"${combo}"`);
    }
  }
  for (const t of parsed.significantTokens) {
    parts.push(t);
  }
  for (const t of parsed.typeTokens) {
    for (const syn of SYNONYMS[t] || []) {
      if (!parsed.significantTokens.includes(syn)) parts.push(syn);
    }
  }
  return [...new Set(parts)].join(" ").trim() || parsed.normalized;
}

function haystackOf(doc) {
  const tags = Array.isArray(doc.tags) ? doc.tags.join(" ") : "";
  const cars = Array.isArray(doc.compatibleCars)
    ? doc.compatibleCars
        .map((c) => `${c?.make || ""} ${c?.model || ""} ${c?.year || ""}`)
        .join(" ")
    : "";
  const vehicles = Array.isArray(doc.vehicleCompatibility?.vehicles)
    ? doc.vehicleCompatibility.vehicles
        .map((c) => `${c?.make || ""} ${c?.model || ""}`)
        .join(" ")
    : "";
  return normalizeQuery(
    `${doc.name || ""} ${doc.slug || ""} ${doc.articleNo || ""} ${doc.shortDescription || ""} ${tags} ${cars} ${vehicles}`
  );
}

function tokenPresent(hay, token) {
  if (!token) return false;
  if (hay.includes(token)) return true;
  for (const syn of SYNONYMS[token] || []) {
    if (hay.includes(syn)) return true;
  }
  return false;
}

function mergeAndFilter(baseFilter, andParts) {
  const baseAnd = Array.isArray(baseFilter?.$and) ? baseFilter.$and : [];
  return {
    ...baseFilter,
    $and: [...baseAnd, ...andParts],
  };
}

/**
 * Higher is better. Tuned for accessory queries with make/model + product type.
 */
export function scoreSearchCandidate(doc, parsed, textScore = 0) {
  const hay = haystackOf(doc);
  const name = normalizeQuery(doc.name || "");
  const slug = normalizeQuery(String(doc.slug || "").replace(/-/g, " "));
  let score = Number(textScore) || 0;

  if (parsed.normalized && (name === parsed.normalized || slug === parsed.normalized)) {
    score += 800;
  } else if (parsed.normalized && name.includes(parsed.normalized)) {
    score += 400;
  }

  for (const phrase of parsed.phrases) {
    if (name.includes(phrase)) score += 220;
    else if (hay.includes(phrase)) score += 120;
    else score -= 40;
  }

  for (const make of parsed.makeTokens) {
    if (name.includes(make) || slug.includes(make)) score += 70;
    else if (hay.includes(make)) score += 35;
    else score -= 25;
  }
  for (const model of parsed.modelTokens.slice(0, 2)) {
    if (name.includes(model) || slug.includes(model)) score += 80;
    else if (hay.includes(model)) score += 40;
  }

  let typeHits = 0;
  for (const t of parsed.typeTokens) {
    if (tokenPresent(name, t) || tokenPresent(slug, t)) {
      typeHits += 1;
      score += 160;
    } else if (tokenPresent(hay, t)) {
      typeHits += 1;
      score += 80;
    } else {
      score -= 120;
    }
  }
  if (parsed.typeTokens.length && typeHits === parsed.typeTokens.length) {
    score += 120;
  } else if (parsed.typeTokens.length && typeHits > 0) {
    score += 40;
  }

  let hits = 0;
  const scoreTokens = parsed.significantTokens.length
    ? parsed.significantTokens
    : parsed.tokens;
  for (const t of scoreTokens) {
    if (tokenPresent(name, t) || tokenPresent(slug, t)) {
      hits += 1;
      score += 28;
    } else if (tokenPresent(hay, t)) {
      hits += 1;
      score += 12;
    }
  }
  const coverage = scoreTokens.length ? hits / scoreTokens.length : 1;
  score += Math.round(coverage * 100);
  if (scoreTokens.length >= 3 && coverage < 0.35) score -= 120;
  if (coverage >= 0.75) score += 80;

  // Soft year overlap bonus (never required).
  for (const y of parsed.yearTokens) {
    if (hay.includes(y.replace(/\s+/g, "")) || hay.includes(y)) score += 15;
  }

  score -= Math.min(40, Math.floor((name.length || 0) / 12));

  return score;
}

function looksLikeSku(term) {
  const t = String(term || "").trim();
  return /^[a-z]{1,8}[-_][a-z0-9][-a-z0-9_]*$/i.test(t) || /^cc[-_]?\d+/i.test(t);
}

function nameRegexForToken(token) {
  const alts = [token, ...(SYNONYMS[token] || [])];
  return {
    $or: alts.flatMap((a) => [
      { name: new RegExp(escapeRegex(a), "i") },
      { slug: new RegExp(escapeRegex(a).replace(/\s+/g, "[-\\s]+"), "i") },
      { tags: new RegExp(escapeRegex(a), "i") },
    ]),
  };
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
    candidateLimit = Math.max(80, limit * 6),
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
    return query.limit(lim).maxTimeMS(4500).lean();
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

  // Pass 0 — exact / near-exact title or slug (handles paste-from-product searches).
  try {
    const exactRx = new RegExp(`^${escapeRegex(term)}$`, "i");
    const slugRx = new RegExp(`^${escapeRegex(normalizeQuery(term).replace(/\s+/g, "-"))}$`, "i");
    const exactRows = await findLean(
      mergeAndFilter(baseFilter, [
        {
          $or: [{ name: exactRx }, { slug: slugRx }, { articleNo: exactRx }],
        },
      ]),
      null,
      null,
      8
    );
    addRows(exactRows, false);
  } catch {
    // ignore
  }

  // Pass 1 — phrase-aware $text.
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
    // no text index / projection conflict
  }

  // Pass 2 — typed soft AND: require make (if any) + at least one type token.
  // Do NOT require every type token or year — that caused zero results.
  if (parsed.typeTokens.length || parsed.makeTokens.length) {
    const and = [];
    if (parsed.typeTokens.length) {
      and.push({
        $or: parsed.typeTokens.map((t) => nameRegexForToken(t)),
      });
    }
    if (parsed.makeTokens.length) {
      and.push(nameRegexForToken(parsed.makeTokens[0]));
    }
    if (parsed.modelTokens.length) {
      and.push(nameRegexForToken(parsed.modelTokens[0]));
    }
    try {
      const typed = await findLean(
        mergeAndFilter(baseFilter, and),
        null,
        { createdAt: -1 },
        Math.min(60, candidateLimit)
      );
      addRows(typed, false);
    } catch {
      // ignore
    }
  }

  // Pass 3 — progressive token AND on significant tokens (drop years already).
  if (!byId.size || byId.size < limit) {
    const progressive = parsed.significantTokens.slice(0, 6);
    for (let keep = Math.min(progressive.length, 5); keep >= 2; keep -= 1) {
      const subset = progressive.slice(0, keep);
      try {
        const andRows = await findLean(
          mergeAndFilter(
            baseFilter,
            subset.map((t) => nameRegexForToken(t))
          ),
          null,
          { createdAt: -1 },
          candidateLimit
        );
        addRows(andRows, false);
        if (byId.size >= limit) break;
      } catch {
        // ignore
      }
    }
  }

  // Pass 4 — broad OR regex fallback.
  if (!byId.size) {
    const rx = new RegExp(escapeRegex(term), "i");
    const tokenOr = parsed.significantTokens.slice(0, 6).flatMap((t) => [
      { name: new RegExp(escapeRegex(t), "i") },
      { slug: new RegExp(escapeRegex(t), "i") },
      { tags: new RegExp(escapeRegex(t), "i") },
    ]);
    const regexOr = [
      { name: rx },
      { slug: rx },
      { articleNo: rx },
      { tags: rx },
      { shortDescription: rx },
      { "compatibleCars.make": rx },
      { "compatibleCars.model": rx },
      ...tokenOr,
    ];
    try {
      const rows = await findLean(
        mergeAndFilter(baseFilter, [{ $or: regexOr }]),
        null,
        { createdAt: -1 },
        candidateLimit
      );
      addRows(rows, false);
    } catch {
      // ignore
    }
  }

  const ranked = [...byId.values()]
    .map((doc) => ({
      doc,
      smart: scoreSearchCandidate(doc, parsed, doc._textScore),
    }))
    .filter(({ smart }) => smart > -250)
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
    mode: byId.size ? "smart" : "empty",
    parsed,
  };
}
