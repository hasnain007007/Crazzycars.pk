/**
 * Remove Shopify-era FAQ blocks embedded in product HTML when the PDP
 * already renders a dedicated FaqSection from buildProductKeywordFaqs.
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

const H23_BLOCK_RE = /<h([23])\b[^>]*>([\s\S]*?)<\/h\1>/gi;

/**
 * @param {string} html
 * @returns {string}
 */
export function stripEmbeddedFaqHtml(html) {
  const s = String(html || "");
  if (!s.trim()) return s;

  /** @type {{ index: number, level: string, inner: string }[]} */
  const headings = [];
  for (const match of s.matchAll(H23_BLOCK_RE)) {
    headings.push({
      index: match.index ?? 0,
      level: match[1] || "2",
      inner: match[2] || "",
    });
  }

  const faqIdx = headings.findIndex((h) => isEmbeddedFaqHeading(h.inner));
  if (faqIdx < 0) return s;

  const faqHeading = headings[faqIdx];
  const faqStart = faqHeading.index;
  let cutEnd = s.length;
  for (let i = faqIdx + 1; i < headings.length; i++) {
    const h = headings[i];
    if (faqHeading.level === "2") {
      if (h.level === "2") {
        cutEnd = h.index;
        break;
      }
      continue;
    }
    cutEnd = h.index;
    break;
  }

  return `${s.slice(0, faqStart)}${s.slice(cutEnd)}`.trim();
}
