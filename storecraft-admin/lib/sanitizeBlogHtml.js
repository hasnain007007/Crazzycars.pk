/**
 * Defense-in-depth HTML sanitizer for blog posts on save.
 * Storefront also runs sanitizeBlogHtml on render — this keeps XSS out of Mongo.
 * TipTap/YouTube iframes are stripped (storefront allowlist has no iframe either).
 */
export function sanitizeBlogHtml(dirty) {
  let s = String(dirty || "");
  if (!s) return "";

  s = s.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
  s = s.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "");
  s = s.replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, "");
  s = s.replace(/<object\b[^>]*>[\s\S]*?<\/object>/gi, "");
  s = s.replace(/<embed\b[^>]*\/?>/gi, "");
  s = s.replace(/<link\b[^>]*\/?>/gi, "");
  s = s.replace(/<meta\b[^>]*\/?>/gi, "");
  s = s.replace(/<base\b[^>]*\/?>/gi, "");
  // Event handlers: onclick=, onerror=, etc.
  s = s.replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  s = s.replace(/(href|src|xlink:href)\s*=\s*(['"])\s*javascript:[\s\S]*?\2/gi, '$1=$2#$2');
  s = s.replace(/(href|src)\s*=\s*(['"])\s*data:text\/html[\s\S]*?\2/gi, '$1=$2#$2');
  return s;
}
