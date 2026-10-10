# crazzycars.pk SEO apply: changelog, baseline and open issues

Change date: **2026-10-11** (Asia/Karachi). Re-measure on or after **2026-11-08** (4 full weeks).

## What shipped

- Redirects (308), titles/metas, content blocks and FAQs live on `vps-test` → Coolify (commits `3100c26`, `0d72458`, `92f58e7`, `5bacfb7`, plus follow-ups `5ff6d1e`, `982aa42`).
- Production Mongo apply (fingerprint `84143ac0cb2c3085`): **27 docs** (`$set` only; 13 products, 6 categories, 8 vehicles). LED headlights category excluded (owner-locked).
- Backups:
  - Mongodump: `/data/crazzycars-mongo-backups/seo-apply-20261010T200917Z` (58M, taken before apply)
  - Before-values: `backups/seo-2026-10-apply/seo-backup-2026-10.json`
  - Dry-run snapshot: `backups/seo-2026-10-apply/seo-backup-dry-run-2026-10.json`
- Separate owner edit (not from the audit): Corolla X door handle panels now “(Set of 4)”, sale Rs. 5,999 / was Rs. 7,999.

### `$set` field list used in apply

- **products:** `name`, `metaTitle`, `metaDescription`, `seo.metaTitle`, `seo.metaDescription`, `shortDescription`, `longDescription`, `features`
- **categories:** `name`, `seo.metaTitle`, `seo.metaDescription`, `description`
- **vehicles:** `metaTitle`, `metaDescription`, `description`
- **carcatalogs:** `metaDescription`, `description`
- Never touched: pricing/price/compare*, inventory/stock, media/images, variants*

## Baseline (from the GSC export, before the change)

- Lowest-CTR pages: `/pages/contact-1` 849 impr / 0 clicks; Grande steering trim 1.19%; funny hand gesture light 0.96%; GLi/XLi buttons 1.53%; Corolla monogram 1.98%; Batman splitter 2.11%; Aqua 2012–2015 kit 2.22%.
- Six pages that already ranked, **115 clicks** combined: E140 23, HUD 20, Airflow ambient trims 19, Oshan X7 mirror covers 19, Corolla 2012 AC panel 18, Yaris trunk spoiler 16.
- Missed clicks from weak titles: about **27 per quarter** on 17 pages.
- “[model] accessories” queries (149) sit near position **32**.
- Compare the same URLs for **2026-11-08 minus 28 days** against the **28 days before 2026-10-11**. Judge average CTR over the window, not single days.

## Live check 2026-10-11 (cache-busted, after apply)

OK: AC panel (no “Butto” in breadcrumb, H1, wire HTML; Mongo image alts still “Butto” by no-images rule), Oshan X7 description, LED headlights category title (owner-locked), door handle panels (set of 4 / price), Yaris, Aqua, Alto, Swift, Civic X, E140, steering-wheel-covers, interior-lights, led-indicator-lights titles/metas present.

## Open issues found in the live check

See `SEO_TODO_FOR_OWNER.md` for owner decisions. Engineering follow-ups tracked there too.

1. City and Liana metas were ~320 characters (HTML description leaked into meta via `vehicleMetaDescription`). Trimmed overrides applied in follow-up.
2. “Popular: … LED headlights” / wrong Popular chips on Civic X, E140, Swift, Alto; City Popular mentioned DRL covers with none listed. Catalog `popularAccessories` cleaned for those models in follow-up.
3. Alto / Liana subtitle “Accessories & Body Kits” with no body kit — hero subtitle now omits “Body Kits” when none are indicated.
4. Wrong-generation products on vehicle pages (E140 / Civic X) — **owner / fitment review** (not auto-removed).
5. Category membership noise (splitters, louvers, indicators, steering-wheel-covers) — **owner / merchandising review**.
6. Aqua text “body kits for each year” → corrected to 2012–2022 coverage in follow-up.
7. Door handle panels: title tag years + empty alt — follow-up.
8. Swift 2025 page listing 2022–2025 / 2022–2026 fitment — **owner confirmation**.

## Search Console steps

- Resubmit `sitemap-products`, `sitemap-categories` and `sitemap-cars` (or full `sitemap.xml`).
- Request indexing **10 URLs a day**, lowest-CTR pages first.
- Re-check CTR and position after 4 weeks with the same date-range length.

## Files (audit implementation)

- `seo-data/Pages.csv`, `seo-data/Queries.csv` — GSC exports (read-only input)
- `storecraft-store/lib/collectionRedirectMap.mjs`, `productFallbackRedirects.mjs`, `stripQueryKeys.mjs`, `legacyHandleMaps.mjs`, `middleware.js`
- `storecraft-store/lib/seo/gscAudit2026-10.mjs`, `generationAliases.js`
- `storecraft-store/app/cars/[slug]/page.jsx`, `categories/[slug]/page.jsx`, `[slug]/page.jsx`
- `storecraft-store/components/store/ProductDetailMedico.jsx`
- `scripts/seo/apply-seo-2026-10.mjs`, `scripts/seo-verify/verify-seo-2026-10.mjs`
- `SEO_REDIRECT_REVIEW.md`, `SEO_TODO_FOR_OWNER.md`, this file
