/**
 * Generation search / SEO aliases for Pakistan fitment intent
 * (e.g. "splitter for civic reborn", "corolla 12 model").
 *
 * Aliases are discovery hints only — never invent fitment. Gate visible
 * fitment claims on compatibleVehicles / VC table rows.
 */

/**
 * @typedef {{
 *   displayName: string,
 *   make: string,
 *   modelTokens: string[],
 *   aliases: string[],
 *   yearFrom: number,
 *   yearTo: number | null,
 *   yearTokens: string[],
 * }} GenerationAliasEntry
 */

/** @type {Record<string, GenerationAliasEntry>} */
export const GENERATION_BY_SLUG = {
  "honda-civic-reborn-2006-2012": {
    displayName: "Honda Civic Reborn (2006–2012)",
    make: "honda",
    modelTokens: ["civic"],
    aliases: [
      "reborn",
      "civic reborn",
      "honda civic reborn",
      "8th gen",
      "8th generation",
      "civic 8th",
    ],
    yearFrom: 2006,
    yearTo: 2012,
    yearTokens: ["2006", "2007", "2008", "2009", "2010", "2011", "2012"],
  },
  "honda-civic-rebirth-2012-2016": {
    displayName: "Honda Civic Rebirth (2012–2016)",
    make: "honda",
    modelTokens: ["civic"],
    aliases: [
      "rebirth",
      "civic rebirth",
      "honda civic rebirth",
      "9th gen",
      "9th generation",
      "civic 9th",
      "2012 model",
      "2015 model",
    ],
    yearFrom: 2012,
    yearTo: 2016,
    yearTokens: ["2012", "2013", "2014", "2015", "2016"],
  },
  "honda-civic-x-2016-2021": {
    displayName: "Honda Civic X (2016–2021)",
    make: "honda",
    modelTokens: ["civic"],
    aliases: [
      "civic x",
      "honda civic x",
      "10th gen",
      "10th generation",
      "civic 10th",
      "civic 20",
      "civic 2018",
      "civic 2019",
      "civic 2020",
    ],
    yearFrom: 2016,
    yearTo: 2021,
    yearTokens: ["2016", "2017", "2018", "2019", "2020", "2021"],
  },
  "honda-civic-11th-gen-2022-present": {
    displayName: "Honda Civic 11th Gen (2022–Present)",
    make: "honda",
    modelTokens: ["civic"],
    aliases: [
      "11th gen",
      "11 gen",
      "11th generation",
      "civic 11",
      "civic 11th",
      "honda civic 11",
      "civic 2022",
      "civic 2023",
      "civic 2024",
      "civic 2025",
      "civic 2026",
    ],
    yearFrom: 2022,
    yearTo: null,
    yearTokens: ["2022", "2023", "2024", "2025", "2026"],
  },
  "toyota-corolla-e140-2009-2014": {
    displayName: "Toyota Corolla E140 (2009–2014)",
    make: "toyota",
    modelTokens: ["corolla"],
    aliases: [
      "e140",
      "corolla e140",
      "corolla 12",
      "corolla 12 model",
      "corolla 2012",
      "corolla 2010",
      "corolla 2011",
      "corolla 2013",
      "corolla 2009",
      "corolla 2014",
    ],
    yearFrom: 2009,
    yearTo: 2014,
    yearTokens: ["2009", "2010", "2011", "2012", "2013", "2014"],
  },
  "toyota-corolla-e170-2014-2026": {
    displayName: "Toyota Corolla E170–E210 (2014–2026)",
    make: "toyota",
    modelTokens: ["corolla"],
    aliases: [
      "e170",
      "e210",
      "corolla e170",
      "corolla e210",
      "corolla grande",
      "grande x",
      "corolla 2015",
      "corolla 2018",
      "corolla 2020",
      "corolla 2022",
      "corolla 2024",
      "corolla 2025",
      "corolla 2026",
    ],
    yearFrom: 2014,
    yearTo: 2026,
    yearTokens: ["2014", "2015", "2016", "2017", "2018", "2019", "2020", "2021", "2022", "2023", "2024", "2025", "2026"],
  },
};

/** Multi-word phrases longest-first for search parsing. */
export const GENERATION_PHRASES = Object.values(GENERATION_BY_SLUG)
  .flatMap((e) => e.aliases.filter((a) => a.includes(" ")))
  .sort((a, b) => b.length - a.length);

/** Single-token → related tokens for SYNONYMS-style expansion. */
export function buildGenerationTokenSynonyms() {
  /** @type {Record<string, string[]>} */
  const out = {};
  const add = (key, values) => {
    const k = String(key || "")
      .toLowerCase()
      .trim();
    if (!k || k.includes(" ")) return;
    if (!out[k]) out[k] = [];
    for (const v of values) {
      const t = String(v || "")
        .toLowerCase()
        .trim();
      if (!t || t === k || t.includes(" ")) continue;
      if (!out[k].includes(t)) out[k].push(t);
    }
  };

  for (const entry of Object.values(GENERATION_BY_SLUG)) {
    const singles = entry.aliases
      .map((a) => a.toLowerCase())
      .filter((a) => !a.includes(" "));
    const blob = [
      ...singles,
      ...entry.modelTokens,
      entry.make,
      // Keep a few year tokens as soft synonyms (not AND filters).
      ...entry.yearTokens.slice(0, 3),
    ];
    for (const s of singles) add(s, blob);
    for (const m of entry.modelTokens) add(m, singles.slice(0, 4));
  }

  // Brembo-style / caliper discovery (universal cover SKU).
  add("brembo", ["caliper", "calipers", "brake"]);
  add("caliper", ["brembo", "calipers", "brake"]);
  add("calipers", ["brembo", "caliper", "brake"]);

  return out;
}

export function aliasesForSlug(slug) {
  const key = String(slug || "")
    .trim()
    .toLowerCase();
  return GENERATION_BY_SLUG[key] || null;
}

/**
 * Resolve alias entry from a vehicle-like object (slug / nickname / years).
 * @param {{ slug?: string, make?: string, model?: string, nickname?: string, generation?: string, displayName?: string, yearFrom?: number, yearTo?: number|null }} vehicle
 */
export function aliasesForVehicle(vehicle) {
  if (!vehicle) return null;
  const bySlug = aliasesForSlug(vehicle.slug);
  if (bySlug) return bySlug;

  const hay = `${vehicle.nickname || ""} ${vehicle.generation || ""} ${vehicle.displayName || ""} ${vehicle.slug || ""}`
    .toLowerCase()
    .replace(/[–—]/g, "-");

  for (const [slug, entry] of Object.entries(GENERATION_BY_SLUG)) {
    if (entry.aliases.some((a) => hay.includes(a.toLowerCase()))) {
      return { slug, ...entry };
    }
    const yf = Number(vehicle.yearFrom);
    const yt = Number(vehicle.yearTo) || yf;
    if (
      String(vehicle.make || "")
        .toLowerCase()
        .includes(entry.make) &&
      entry.modelTokens.some((m) => hay.includes(m) || String(vehicle.model || "").toLowerCase().includes(m)) &&
      Number.isFinite(yf) &&
      yf >= entry.yearFrom &&
      (entry.yearTo == null || yt <= entry.yearTo + 0)
    ) {
      // Prefer nickname hits; year overlap alone is weak across Civic gens.
      if (/reborn|rebirth|civic x|11th|e140|e170|e210/i.test(hay)) {
        return { slug, ...entry };
      }
    }
  }
  return null;
}

/** Short “also known as …” line for car hubs (not H1). */
export function alsoKnownAsLine(vehicle, { max = 4 } = {}) {
  const entry = aliasesForVehicle(vehicle);
  if (!entry) return "";
  const nick = String(vehicle?.nickname || vehicle?.generation || "")
    .trim()
    .toLowerCase();
  const picks = entry.aliases
    .filter((a) => {
      const al = a.toLowerCase();
      if (nick && (al === nick || al === `civic ${nick}` || al === `honda civic ${nick}`))
        return false;
      // Drop bare year tokens from the visible line (keep in search only).
      if (/^\d{4}$/.test(al)) return false;
      return true;
    })
    .slice(0, max);
  if (!picks.length) return "";
  return `Also searched as ${picks.join(", ")}.`;
}

/** Meta description fragment with aliases + COD. */
export function vehicleMetaDescription(vehicle, catalogDesc) {
  const base = String(catalogDesc || "").trim();
  if (base) {
    const aka = alsoKnownAsLine(vehicle, { max: 3 });
    if (aka && !/also searched|also known/i.test(base)) {
      return `${base.replace(/\s+$/, "")} ${aka} Cash on Delivery on eligible items.`.slice(0, 320);
    }
    if (!/cash on delivery|cod/i.test(base)) {
      return `${base.replace(/\s+$/, "")} Cash on Delivery on eligible items.`.slice(0, 320);
    }
    return base.slice(0, 320);
  }
  const entry = aliasesForVehicle(vehicle);
  const name = vehicle?.displayName || "this car";
  const aka = entry
    ? ` Also searched as ${entry.aliases.slice(0, 3).join(", ")}.`
    : "";
  return `Shop ${name} accessories in Pakistan — splitters, body kits, LED lights & more.${aka} Cash on Delivery on eligible orders.`.slice(
    0,
    320
  );
}

function yearMidpointInRange(prodFrom, prodTo, genFrom, genTo) {
  const p1 = Number(prodFrom);
  const p2 = Number(prodTo) || p1;
  const g1 = Number(genFrom);
  const g2 = genTo == null ? 2099 : Number(genTo);
  if (![p1, p2, g1, g2].every(Number.isFinite)) return false;
  const mid = (p1 + p2) / 2;
  return mid >= g1 && mid <= g2;
}

/** Boundary-aware alias match — avoids "civic 20" hitting "civic 2006". */
function blobHasAlias(blob, alias) {
  const a = String(alias || "")
    .toLowerCase()
    .trim();
  if (!a) return false;
  const padded = ` ${blob} `;
  const needle = ` ${a} `;
  if (padded.includes(needle)) return true;
  // digit-ending aliases need a non-digit boundary after the match
  if (/\d$/.test(a)) {
    const re = new RegExp(
      `(?:^|[^a-z0-9])${a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![0-9])`,
      "i"
    );
    return re.test(blob);
  }
  return false;
}

/**
 * Extra haystack text so products matching a generation (by name/VC) also
 * match alias queries like "reborn" / "civic x" / "corolla 12".
 */
export function aliasTextForProductDoc(doc) {
  const name = String(doc?.name || "").toLowerCase();
  const slug = String(doc?.slug || "")
    .toLowerCase()
    .replace(/-/g, " ");
  const tags = Array.isArray(doc?.tags) ? doc.tags.join(" ").toLowerCase() : "";
  const blob = `${name} ${slug} ${tags}`;

  const parts = [];
  const hitSlugs = new Set();

  for (const [genSlug, entry] of Object.entries(GENERATION_BY_SLUG)) {
    if (entry.aliases.some((a) => blobHasAlias(blob, a))) {
      hitSlugs.add(genSlug);
      continue;
    }
    // VC year rows — midpoint of product years must sit inside the generation.
    const rows = Array.isArray(doc?.vehicleCompatibility?.vehicles)
      ? doc.vehicleCompatibility.vehicles
      : [];
    for (const row of rows) {
      const make = String(row?.make || "").toLowerCase();
      const model = String(row?.model || "").toLowerCase();
      if (!make.includes(entry.make)) continue;
      if (!entry.modelTokens.some((m) => model.includes(m) || blobHasAlias(blob, m))) continue;
      if (yearMidpointInRange(row.yearFrom, row.yearTo, entry.yearFrom, entry.yearTo)) {
        hitSlugs.add(genSlug);
        break;
      }
    }
  }

  for (const genSlug of hitSlugs) {
    const entry = GENERATION_BY_SLUG[genSlug];
    parts.push(entry.displayName, ...entry.aliases.slice(0, 6));
  }

  // Universal caliper / Brembo-style discovery
  if (/caliper|brembo|brake cover/i.test(blob) || /bcc/i.test(String(doc?.articleNo || ""))) {
    parts.push("brembo", "brembo style", "caliper cover", "brake caliper");
  }

  return parts.join(" ");
}

/**
 * Expand parsed search tokens/phrases with generation aliases.
 * Only expand entries that the query already hints at (alias phrase/token),
 * never every Civic/Corolla generation from a bare "civic"/"corolla" token.
 * @param {{ phrases: string[], significantTokens: string[], tokens: string[], normalized: string }} parsed
 */
export function expandParsedQueryWithGenerationAliases(parsed) {
  if (!parsed) return parsed;
  const phrases = new Set(parsed.phrases || []);
  const significant = new Set(parsed.significantTokens || []);
  const all = new Set(parsed.tokens || []);
  const norm = ` ${String(parsed.normalized || "")} `;

  /** @type {Set<string>} */
  const hitSlugs = new Set();

  for (const [slug, entry] of Object.entries(GENERATION_BY_SLUG)) {
    const aliases = entry.aliases.map((a) => a.toLowerCase());
    const hitPhrase = aliases.some(
      (a) => a.includes(" ") && (norm.includes(` ${a} `) || phrases.has(a))
    );
    const hitSingle = aliases.some(
      (a) => !a.includes(" ") && (significant.has(a) || all.has(a))
    );
    if (hitPhrase || hitSingle) hitSlugs.add(slug);
  }

  for (const slug of hitSlugs) {
    const entry = GENERATION_BY_SLUG[slug];
    for (const m of entry.modelTokens) {
      significant.add(m);
      all.add(m);
    }
    if (entry.make) {
      significant.add(entry.make);
      all.add(entry.make);
    }
    for (const a of entry.aliases) {
      const al = a.toLowerCase();
      if (al.includes(" ")) phrases.add(al);
      else {
        significant.add(al);
        all.add(al);
      }
    }
  }

  // brembo ↔ caliper
  if (significant.has("brembo") || norm.includes(" brembo ")) {
    significant.add("caliper");
    phrases.add("caliper cover");
  }
  if (significant.has("caliper") || significant.has("calipers")) {
    significant.add("brembo");
  }

  parsed.phrases = [...phrases];
  parsed.significantTokens = [...significant];
  parsed.tokens = [...all];
  return parsed;
}

/** Category meta overrides for keyword strategy leaves + GSC audit (10 Oct 2026). */
export const CATEGORY_KEYWORD_META = {
  "splitters-side-skirts": {
    metaTitle: "Car Side Skirts & Bumper Splitters in Pakistan | CrazzyCars",
    metaDescription:
      "Buy car side skirts, front and rear bumper splitters and lip kits in Pakistan for Civic, Corolla and City. COD on eligible items, nationwide delivery.",
    absoluteTitle: true,
  },
  "led-indicator-lights": {
    metaTitle: "LED Indicator Lights & Mirror Indicators | CrazzyCars.pk",
    metaDescription:
      "LED indicator lights, bulbs and side mirror indicators for Corolla, Civic and City. COD on eligible items, nationwide delivery from Gujranwala.",
    absoluteTitle: true,
  },
  "quarter-window-louvers": {
    metaTitle: "Quarter Window Louvers Price in Pakistan | Civic, Corolla",
    metaDescription:
      "Quarter window louvers for Civic, Corolla, City, Alto and Yaris in Pakistan. Carbon and gloss black options. COD on eligible items, nationwide delivery.",
    absoluteTitle: true,
  },
  "interior-lights": {
    metaTitle: "Car Interior & Ambient Lights Price in Pakistan | CrazzyCars",
    metaDescription:
      "Buy car interior lights in Pakistan: ambient dashboard strips, footwell RGB lights, door welcome logo lights and roof star lights. COD on eligible items.",
    absoluteTitle: true,
  },
  "led-lighting": {
    metaTitle: "Car LED Lights in Pakistan – Headlights, Indicators, DRL",
    metaDescription:
      "Shop car LED lights in Pakistan: headlights, fog lamps and DRL covers, indicators, tail lights, reflectors and SOS flashers. COD on eligible items.",
    absoluteTitle: true,
  },
  "steering-wheel-covers": {
    metaTitle: "Steering Wheel Covers Price in Pakistan | CrazzyCars",
    metaDescription:
      "Steering wheel covers in Pakistan, including hand-stitched carbon fiber in universal fit. Price on every listing. COD on eligible items, nationwide delivery.",
    absoluteTitle: true,
  },
};
