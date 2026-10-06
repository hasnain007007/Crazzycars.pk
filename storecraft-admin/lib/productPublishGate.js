/**
 * Block activating catalog products that still carry draft / placeholder markers.
 */

const DRAFT_PUBLISH_PATTERNS = [
  { re: /\bdraft\b/i, label: "draft" },
  { re: /price\s*\.?\s*pending/i, label: "price pending" },
  { re: /\bTBD\b/i, label: "TBD" },
  { re: /do\s+not\s+publish/i, label: "do not publish" },
  { re: /\bplaceholder\b/i, label: "placeholder" },
];

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

/**
 * @returns {{ ok: true } | { ok: false, error: string }}
 */
export function validateProductActivePublishGate(product) {
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
