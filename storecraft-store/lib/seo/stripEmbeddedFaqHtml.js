/**
 * Remove Shopify-era FAQ blocks embedded in product/blog HTML when the page
 * already renders a dedicated FaqSection (avoids duplicate visible FAQ headings).
 *
 * Matches case-insensitively with collapsed whitespace; headings may be h2 or h3
 * (also h1/h4 for odd imports). Strips every FAQ section, not only the first —
 * some longDescriptions embed the block twice.
 */

const FAQ_HEADING_RE = /^(?:frequently\s+asked(?:\s+questions?)?|faq(?:s)?)\b/i;

/** @param {string} headingInnerHtml */
export function isEmbeddedFaqHeading(headingInnerHtml) {
  const text = String(headingInnerHtml || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return FAQ_HEADING_RE.test(text);
}

/** h1–h4 — imports sometimes use h1 or wrap FAQ under h3. */
const HEADING_BLOCK_RE = /<h([1-4])\b[^>]*>([\s\S]*?)<\/h\1>/gi;

/**
 * Cut one FAQ section starting at faqIdx in headings over source string s.
 * @returns {string}
 */
function cutOneFaqSection(s, headings, faqIdx) {
  const faqHeading = headings[faqIdx];
  const faqStart = faqHeading.index;
  const faqLevel = Number(faqHeading.level) || 2;
  let cutEnd = s.length;
  for (let i = faqIdx + 1; i < headings.length; i++) {
    const h = headings[i];
    const level = Number(h.level) || 2;
    // End at the next heading of the same or higher rank (h2 ends at next h2/h1).
    if (level <= faqLevel) {
      cutEnd = h.index;
      break;
    }
  }
  return `${s.slice(0, faqStart)}${s.slice(cutEnd)}`.trim();
}

/**
 * @param {string} html
 * @returns {string}
 */
export function stripEmbeddedFaqHtml(html) {
  let s = String(html || "");
  if (!s.trim()) return s;

  // Loop: descriptions may contain two+ FAQ blocks separated by other h2s.
  for (let guard = 0; guard < 8; guard++) {
    /** @type {{ index: number, level: string, inner: string }[]} */
    const headings = [];
    HEADING_BLOCK_RE.lastIndex = 0;
    for (const match of s.matchAll(HEADING_BLOCK_RE)) {
      headings.push({
        index: match.index ?? 0,
        level: match[1] || "2",
        inner: match[2] || "",
      });
    }
    const faqIdx = headings.findIndex((h) => isEmbeddedFaqHeading(h.inner));
    if (faqIdx < 0) break;
    s = cutOneFaqSection(s, headings, faqIdx);
  }

  return s;
}
