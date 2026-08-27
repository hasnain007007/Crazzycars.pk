/**
 * Sanitize product/category HTML from our DB (Shopify-migrated).
 * Allows only safe structural tags — strips scripts, styles, event handlers.
 */
import sanitizeHtml from "sanitize-html";

const ALLOWED_TAGS = [
  "h1",
  "h2",
  "h3",
  "p",
  "ul",
  "ol",
  "li",
  "strong",
  "em",
  "b",
  "i",
  "br",
  "hr",
  "a",
];

const ALLOWED_ATTR = {
  a: ["href", "name", "target", "rel"],
};

/**
 * Some imported descriptions were stored as escaped HTML (`&lt;p&gt;…`).
 * Decode until real tags appear (max 3 passes for double-encoding).
 */
export function decodeHtmlEntities(input) {
  let s = String(input || "");
  for (let i = 0; i < 3; i++) {
    if (!/&(?:amp|lt|gt|quot|nbsp|#0*3[468]|#0*39|#x27);/i.test(s)) break;
    s = s
      .replace(/&amp;/gi, "&")
      .replace(/&#0*38;/g, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&#0*60;/g, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&#0*62;/g, ">")
      .replace(/&quot;/gi, '"')
      .replace(/&#0*34;/g, '"')
      .replace(/&#0*39;/g, "'")
      .replace(/&#x27;/gi, "'")
      .replace(/&nbsp;/gi, " ");
  }
  return s;
}

export function sanitizeProductHtml(dirty) {
  const raw = decodeHtmlEntities(String(dirty || "").trim());
  if (!raw) return "";
  return sanitizeHtml(raw, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTR,
    allowedSchemes: ["http", "https", "mailto"],
    // Drop Shopify/editor junk attributes (data-*, style, class, etc.)
    allowedClasses: {},
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer" }),
      h1: "h2",
    },
  });
}

export function toPlainText(htmlOrText, maxLen = 0) {
  const plain = decodeHtmlEntities(String(htmlOrText || ""))
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!maxLen || plain.length <= maxLen) return plain;
  const cut = plain.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 40 ? cut.slice(0, lastSpace) : cut).trim()}…`;
}

/** CMS / static pages — slightly broader tags, still no scripts/handlers. */
export function sanitizePageHtml(dirty) {
  const raw = decodeHtmlEntities(String(dirty || "").trim());
  if (!raw) return "";
  return sanitizeHtml(raw, {
    allowedTags: [
      ...ALLOWED_TAGS,
      "h4",
      "div",
      "span",
      "img",
      "blockquote",
      "table",
      "thead",
      "tbody",
      "tr",
      "th",
      "td",
    ],
    allowedAttributes: {
      ...ALLOWED_ATTR,
      img: ["src", "alt", "width", "height", "loading"],
      td: ["colspan", "rowspan"],
      th: ["colspan", "rowspan"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowedClasses: {},
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer" }),
    },
  });
}

/** Blog posts — same allowlist as CMS pages. */
export function sanitizeBlogHtml(dirty) {
  return sanitizePageHtml(dirty);
}
