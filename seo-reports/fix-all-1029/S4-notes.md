# S4 Sitemap hygiene

## Requirements
- Sitemap URLs: HTTP 200, no redirect, indexable, self-canonical
- Real `updatedAt` / `contentUpdatedAt` for `lastmod` (already in `lib/sitemap/entries.js`)
- C23 hard check in `scripts/seo-verify.mjs`

## Result
- Pre-change sample (80 URLs): 0 noindex / canonical / redirect problems
- Full verify (S2a run): **C23 pass** (532/532)
- C23 strengthened to also fail on sitemap noindex or non-self canonical (same bar as C2)

## Code already enforcing hygiene
- Empty categories excluded unless parent rollup has products (`getCategoryIdsWithProducts`)
- `DELETED_URL_REDIRECTS` sources excluded from sitemap
- Product filter uses `WEBSITE_PRODUCT_FILTER` + price > 0

## Follow-ups (not blocking C23)
- S3 empty leaf categories that are inactive kitchen/beauty: already absent from sitemap
- Parent hubs like `/categories/car-care-safety` remain if children have products
