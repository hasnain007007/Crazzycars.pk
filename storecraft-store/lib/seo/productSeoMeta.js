/**
 * Product <title> / meta description precedence:
 *   1. what the owner stored on the product (seo.metaTitle / seo.metaDescription),
 *   2. the code keyword-map override (PAGE_SEO_OVERRIDES),
 *   3. the template (name / short description).
 * Admin edits must always show on the live page.
 */
import { stripTrailingBrandSuffix, withBrandTitleSuffix } from "@/lib/brand";
import { fitMetaDescription } from "@/lib/seo/metaDescription";
import { productFirstTitle, withVariantLabel } from "@/lib/seo/productTitleFit";

const MAX_TITLE = 60;

/**
 * Brand-suffix a product title. Over-long "Vehicle · … Product" names are rewritten
 * product-first so the cut never drops the product type, and a colour variant from the
 * product name is kept so sibling colour pages don't share one title.
 */
function fitProductTitle(text, name) {
  const base = withVariantLabel(stripTrailingBrandSuffix(text), name);
  if (base.length > MAX_TITLE) {
    const productFirst = productFirstTitle(base, MAX_TITLE);
    if (productFirst) return withBrandTitleSuffix(productFirst, { maxLen: MAX_TITLE });
  }
  return withBrandTitleSuffix(base, { maxLen: MAX_TITLE });
}

export function productSeoTitle({ name, metaTitle, override }) {
  const stored = String(metaTitle || "").trim();
  if (stored) return fitProductTitle(stored, name);
  if (override?.title) return String(override.title).trim();
  return fitProductTitle(String(name || "").trim(), name);
}

export function productSeoDescription({ metaDescription, override, fallbacks = [], transform = (t) => t }) {
  // Precedence decides the text; then it is only fitted to 70–160 characters
  // (short → factual tail appended, long → cut at a word).
  const chosen = [metaDescription, override?.meta, ...fallbacks]
    .map((t) => String(t || "").trim())
    .find(Boolean);
  return fitMetaDescription([transform(chosen || "")], fallbacks[fallbacks.length - 1] || "");
}
