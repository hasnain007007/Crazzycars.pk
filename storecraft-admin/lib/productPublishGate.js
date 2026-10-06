/**
 * Block activating catalog products that still carry draft / placeholder markers,
 * or SKUs that require explicit owner confirmation before going live.
 */

const DRAFT_PUBLISH_PATTERNS = [
  { re: /\bdraft\b/i, label: "draft" },
  { re: /price\s*\.?\s*pending/i, label: "price pending" },
  { re: /\bTBD\b/i, label: "TBD" },
  { re: /do\s+not\s+publish/i, label: "do not publish" },
  { re: /\bplaceholder\b/i, label: "placeholder" },
];

/**
 * Owner must confirm before publish (photos / CN7 roof-glass). Do not invent stock or copy.
 * Unlock by setting product.ownerPublishConfirmed === true after owner sign-off.
 */
export const OWNER_CONFIRM_BEFORE_PUBLISH = {
  "CC-0240": "draft-until-photos — owner confirmation required before publish",
  "CC-0241": "draft-until-photos — owner confirmation required before publish",
  "CC-0257": "CN7 roof-glass profile — owner confirmation required before publish",
};

function collectText(product) {
  const parts = [
    product?.name,
    product?.shortDescription,
    product?.longDescription,
    ...(Array.isArray(product?.tags) ? product.tags : []),
  ];
  return parts
    .map((s) => String(s || "").trim())
    .filter(Boolean)
    .join("\n");
}

function articleKeys(product) {
  return [product?.articleNo, product?.sku, product?.inventory?.sku]
    .map((s) => String(s || "").trim().toUpperCase())
    .filter(Boolean);
}

/**
 * @returns {{ ok: true } | { ok: false, error: string }}
 */
export function validateProductActivePublishGate(product) {
  if (product?.ownerPublishConfirmed !== true) {
    for (const key of articleKeys(product)) {
      const reason = OWNER_CONFIRM_BEFORE_PUBLISH[key];
      if (reason) {
        return {
          ok: false,
          error: `Cannot set status to active for ${key}: ${reason}. Set ownerPublishConfirmed after owner sign-off.`,
        };
      }
    }
  }

  const haystack = collectText(product);
  if (!haystack) {
    return { ok: true };
  }
  for (const { re, label } of DRAFT_PUBLISH_PATTERNS) {
    if (re.test(haystack)) {
      return {
        ok: false,
        error: `Cannot set status to active: listing text matches "${label}" (draft/placeholder gate). Fix name, descriptions, or tags first.`,
      };
    }
  }
  return { ok: true };
}
