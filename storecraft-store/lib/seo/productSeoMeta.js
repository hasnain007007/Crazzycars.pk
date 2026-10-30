/**
 * Product <title> / meta description precedence:
 *   1. what the owner stored on the product (seo.metaTitle / seo.metaDescription),
 *   2. the code keyword-map override (PAGE_SEO_OVERRIDES),
 *   3. the template (name / short description).
 * Admin edits must always show on the live page.
 */
import { withBrandTitleSuffix } from "@/lib/brand";
import { fitMetaDescription } from "@/lib/seo/metaDescription";

export function productSeoTitle({ name, metaTitle, override }) {
  const stored = String(metaTitle || "").trim();
  if (stored) return withBrandTitleSuffix(stored);
  if (override?.title) return String(override.title).trim();
  return withBrandTitleSuffix(String(name || "").trim());
}

export function productSeoDescription({ metaDescription, override, fallbacks = [], transform = (t) => t }) {
  // Precedence decides the text; then it is only fitted to 70–160 characters
  // (short → factual tail appended, long → cut at a word).
  const chosen = [metaDescription, override?.meta, ...fallbacks]
    .map((t) => String(t || "").trim())
    .find(Boolean);
  return fitMetaDescription([transform(chosen || "")], fallbacks[fallbacks.length - 1] || "");
}
