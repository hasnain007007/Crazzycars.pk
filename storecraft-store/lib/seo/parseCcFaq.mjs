/**
 * Extract FAQ Q/A pairs from HTML that contains <div data-cc-faq="1">…</div>.
 * Pairs are <h3>question</h3><p>answer</p> in document order.
 */

function decodeEntities(s) {
  return String(s || "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

function stripTags(html) {
  return decodeEntities(String(html || "").replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * @param {string} html
 * @returns {{ question: string, answer: string }[]}
 */
export function parseCcFaqFromHtml(html) {
  const raw = String(html || "");
  if (!raw || !/data-cc-faq\s*=\s*["']?1["']?/i.test(raw)) return [];

  const blockMatch = raw.match(
    /<div[^>]*data-cc-faq\s*=\s*["']?1["']?[^>]*>([\s\S]*?)<\/div>\s*(?:<!--\s*\/cc-faq\s*-->)?/i
  );
  const block = blockMatch ? blockMatch[1] : raw;
  const pairs = [];
  const re = /<h3\b[^>]*>([\s\S]*?)<\/h3>\s*<p\b[^>]*>([\s\S]*?)<\/p>/gi;
  let m;
  while ((m = re.exec(block))) {
    const question = stripTags(m[1]);
    const answer = stripTags(m[2]);
    if (question && answer) pairs.push({ question, answer });
  }
  return pairs;
}

/** Prefer on-page data-cc-faq; else fallback auto FAQs. */
export function resolveProductFaqItems(product, fallbackItems) {
  const html = [
    product?.description,
    product?.longDescription,
    product?.content,
    product?.body,
    product?.seo?.descriptionHtml,
  ]
    .map((x) => String(x || ""))
    .join("\n");
  const fromBlock = parseCcFaqFromHtml(html);
  if (fromBlock.length) return fromBlock;
  return Array.isArray(fallbackItems) ? fallbackItems : [];
}
