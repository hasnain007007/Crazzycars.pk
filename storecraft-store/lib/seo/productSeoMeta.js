/**
 * Product <title> / meta description precedence:
 *   1. what the owner stored on the product (seo.metaTitle / seo.metaDescription),
 *   2. the code keyword-map override (PAGE_SEO_OVERRIDES),
 *   3. the template (name / short description).
 * Admin edits must always show on the live page.
 */
import { withBrandTitleSuffix } from "@/lib/brand";

export function productSeoTitle({ name, metaTitle, override }) {
  const stored = String(metaTitle || "").trim();
  if (stored) return withBrandTitleSuffix(stored);
  if (override?.title) return String(override.title).trim();
  return withBrandTitleSuffix(String(name || "").trim());
}

export function productSeoDescription({ metaDescription, override, fallbacks = [] }) {
  const stored = String(metaDescription || "").trim();
  if (stored) return stored;
  const fromOverride = String(override?.meta || "").trim();
  if (fromOverride) return fromOverride;
  for (const f of fallbacks) {
    const s = String(f || "").trim();
    if (s) return s;
  }
  return "";
}
