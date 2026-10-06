/**
 * Title / brand strings for storefront SEO.
 *
 * Product PDP absolute titles: `metaTitle | CrazzyCars` (no .pk) — keep stored
 * metaTitles ≤46 chars without brand so branded ≤60.
 * Category titles: append ` | Crazzycars.pk` when the branded result fits ≤60;
 * otherwise use metaTitle as-is (see buildBrandedAbsoluteTitle).
 * Do not unify product suffix to CrazzyCars.pk in this pass.
 */
export const BRAND = "CrazzyCars.pk";

/** Product `<title>` suffix brand (plan: `| CrazzyCars`). */
export const PRODUCT_TITLE_BRAND = "CrazzyCars";

/** Category / collection title brand (plan: `| Crazzycars.pk`). */
export const CATEGORY_TITLE_BRAND = "Crazzycars.pk";
