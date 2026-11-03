/**
 * Claim-free blog title/meta overrides (Task 13). Slugs unchanged.
 * Applied when admin seo fields are empty or still contain banned claim words.
 */
export const BLOG_SEO_OVERRIDES = {
  "best-floor-mats-pakistani-weather-guide": {
    title: "Floor Mats for Pakistan Weather: Rubber vs TPE | CrazzyCars",
  },
  "toyota-yaris-vs-honda-city-best-accessories": {
    title: "Yaris vs City Accessories in Pakistan | CrazzyCars",
  },
  "how-to-choose-right-front-grille": {
    metaReplace: [/OEM-style/gi, "factory-style"],
  },
  "best-body-kit-styles-toyota-corolla-pakistan": {
    title: "Body Kit Styles for Toyota Corolla in Pakistan | CrazzyCars",
  },
};

const CLAIM_RE = /\b(best|#1|oem|genuine|original|perfect|premium|100%)\b/i;

export function resolveBlogSeo(slug, post) {
  const o = BLOG_SEO_OVERRIDES[String(slug || "").trim()] || {};
  let title = String(post?.seo?.metaTitle || post?.title || "").trim();
  let description = String(post?.seo?.metaDescription || post?.excerpt || post?.title || "").trim();
  if (o.title && (!post?.seo?.metaTitle || CLAIM_RE.test(title))) {
    title = o.title;
  }
  if (Array.isArray(o.metaReplace) && o.metaReplace.length === 2) {
    description = description.replace(o.metaReplace[0], o.metaReplace[1]);
  }
  if (CLAIM_RE.test(title) && o.title) title = o.title;
  return { title, description };
}
