/**
 * Category membership sanity checks — title/type vs category purpose.
 * Used for audits and optional storefront filtering of clear misfiles.
 *
 * Prefer structured productType when present; fall back to title tokens.
 * Ambiguous cases return NEEDS_REVIEW (do not auto-hide).
 */

/** Tokens that clearly do NOT belong in splitters / side skirts. */
export const SPLITTERS_FORBIDDEN_TITLE_TOKENS = [
  "steering trim",
  "steering wheel",
  "steering cover",
  "ducktail",
  "trunk spoiler",
  "roof spoiler",
  "rear spoiler",
  "lip spoiler",
  "key cover",
  "key fob",
  "floor mat",
  "dashboard mat",
  "door handle",
  "mirror cover",
  "mirror indicator",
  "seat cover",
  "air freshener",
  "perfume",
];

/** Tokens that support membership in splitters / side skirts. */
export const SPLITTERS_SUPPORTING_TITLE_TOKENS = [
  "splitter",
  "side skirt",
  "side skirts",
  "canard",
  "front lip",
  "rear lip",
  "diffuser",
  "body kit",
  "side splitter",
];

function norm(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function haystack(product) {
  return norm(
    [product?.name, product?.title, product?.slug, product?.productType]
      .filter(Boolean)
      .join(" ")
  );
}

/**
 * @param {object} product
 * @param {string} categorySlug
 * @returns {{ status: 'VERIFIED_CORRECT'|'VERIFIED_INCORRECT'|'AMBIGUOUS'|'INSUFFICIENT_EVIDENCE', reason?: string }}
 */
export function classifyCategoryMembership(product, categorySlug) {
  const slug = String(categorySlug || "")
    .toLowerCase()
    .trim();
  if (!slug) return { status: "INSUFFICIENT_EVIDENCE", reason: "no_category" };

  const text = haystack(product);
  if (!text) return { status: "INSUFFICIENT_EVIDENCE", reason: "no_title" };

  if (slug === "splitters-side-skirts" || slug.includes("splitter") || slug.includes("side-skirt")) {
    const forbidden = SPLITTERS_FORBIDDEN_TITLE_TOKENS.find((t) => text.includes(t));
    if (forbidden) {
      return {
        status: "VERIFIED_INCORRECT",
        reason: `forbidden_token:${forbidden}`,
      };
    }
    const support = SPLITTERS_SUPPORTING_TITLE_TOKENS.find((t) => text.includes(t));
    if (support) {
      return { status: "VERIFIED_CORRECT", reason: `support_token:${support}` };
    }
    return { status: "AMBIGUOUS", reason: "no_support_or_forbid_token" };
  }

  return { status: "INSUFFICIENT_EVIDENCE", reason: "no_rule_for_category" };
}

/**
 * @param {object[]} products
 * @param {string} categorySlug
 */
export function rejectClearCategoryMisfits(products, categorySlug) {
  const kept = [];
  const rejected = [];
  for (const p of products || []) {
    const cls = classifyCategoryMembership(p, categorySlug);
    if (cls.status === "VERIFIED_INCORRECT") rejected.push({ product: p, ...cls });
    else kept.push(p);
  }
  return { kept, rejected };
}

/**
 * Mongo guard for clear misfits (keeps countDocuments aligned with listings).
 * Only encodes high-confidence forbidden title patterns.
 * @param {string} categorySlug
 * @returns {object|null} extra filter clause or null
 */
export function categoryMembershipMongoGuard(categorySlug) {
  const slug = String(categorySlug || "")
    .toLowerCase()
    .trim();
  if (slug !== "splitters-side-skirts") return null;
  // Escape for RegExp; join as alternation.
  const alts = SPLITTERS_FORBIDDEN_TITLE_TOKENS.map((t) =>
    t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  ).join("|");
  return {
    name: { $not: new RegExp(alts, "i") },
  };
}