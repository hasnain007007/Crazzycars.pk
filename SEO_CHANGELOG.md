# crazzycars.pk SEO apply: changelog, baseline and open issues

Change date: **2026-10-11** (Asia/Karachi). Re-measure on or after **2026-11-08** (4 full weeks).

## What shipped

- Redirects (308), titles/metas, content blocks and FAQs live on `vps-test` → Coolify (commits `3100c26`, `0d72458`, `92f58e7`, `5bacfb7`, `fc8a844`, `3f0fb83`, `6d89ddf` and the follow-up copy fixes).
- **Production Mongo apply 1** (SEO text, fingerprint `84143ac0cb2c3085`): **27 docs** (`$set` only; 13 products, 6 categories, 8 vehicles). LED headlights category excluded (owner-locked). Backup: `/data/crazzycars-mongo-backups/seo-apply-20261010T200917Z`; before-values in `backups/seo-2026-10-apply/seo-backup-2026-10.json`.
- **Production Mongo apply 2** (fitment and category membership, same fingerprint): **9 products**, `compatibleVehicles` / `categories` only. Backup: `/data/crazzycars-mongo-backups/fitment-membership-20261010T211824Z`; before-values: `backups/seo-2026-10-apply/fitment-membership-before-values-20261010T211824Z.json`.
  - Removed from E140: Corolla X door handle panels, Corolla dashboard trim 3PCS (2014–2026).
  - Removed from Civic X and Civic Reborn: Civic Rebirth ducktail spoiler.
  - Removed from `splitters-side-skirts`: Corolla E140 ducktail spoiler, Corolla 2015–2026 carbon steering trim, Corolla X shark fin diffuser. Added to `splitters-side-skirts`: Aqua 2022–2024 Sportline front splitter. Added to `spoilers-diffusers`: E140 ducktail, shark fin.
  - Removed from `quarter-window-louvers`: Civic X carbon steering trim cover. Mirror rack louver kept.
  - Corolla steering monogram moved from `steering-wheel-covers` to `stickers-monograms-emblems`.
- Separate owner edit (not from the audit): Corolla X door handle panels now “(Set of 4)”, Rs. 5,999 (was Rs. 7,999).
- Follow-up fixes verified live 2026-10-11: City and Liana metas (about 126–128 chars, no price in Liana); “Popular:” lines cleaned (no “LED headlights”); Alto and Liana subtitle “Accessories”; Aqua text “2012–2022”; splitters, louvers and led-indicator-lights metas; door handle panels title (60 chars), JSON-LD price 5999.00, no empty alt.
- Live check after apply 2: E140 41 → 39 results, Civic X 51 → 50, splitters 26 → 24, louvers 14 → 13, steering-wheel-covers 1, stickers-monograms-emblems 1, spoilers-diffusers 31. Titles/metas/H1 unchanged.

### Field list (apply 1 `$set` only)

- **products:** `name`, `metaTitle`, `metaDescription`, `seo.metaTitle`, `seo.metaDescription`, `shortDescription`, `longDescription`, `features`
- **categories:** `name`, `seo.metaTitle`, `seo.metaDescription`, `description`
- **vehicles:** `metaTitle`, `metaDescription`, `description`
- **carcatalogs:** `metaDescription`, `description`
- Never touched: pricing/price/compare*, inventory/stock, media/images, variants*

### Field list (apply 2)

- **products only:** `compatibleVehicles` (`$pull`), `categories` (`$pull` / `$addToSet`)
- Never touched: pricing, stock, images, variants, SEO text fields

## Baseline (from the GSC export, before the change)

- Lowest-CTR pages: `/pages/contact-1` 849 impr / 0 clicks; Grande steering trim 1.19%; funny hand gesture light 0.96%; GLi/XLi buttons 1.53%; Corolla monogram 1.98%; Batman splitter 2.11%; Aqua 2012–2015 kit 2.22%.
- Six pages that already ranked, **115 clicks** combined: E140 23, HUD 20, Airflow ambient trims 19, Oshan X7 mirror covers 19, Corolla 2012 AC panel 18, Yaris trunk spoiler 16.
- Missed clicks from weak titles: about **27 per quarter** on 17 pages.
- “[model] accessories” queries (149) sit near position **32**.
- Compare the same URLs for **2026-11-08 minus 28 days** against the **28 days before 2026-10-11**. Judge average CTR over the window, not single days.

## Still open

1. `stickers-monograms-emblems` now has 1 product but still shows “products are being added” placeholder copy. Rewrite the copy, or set it noindex and keep it out of the sitemap until it has about 3 products.
2. `steering-wheel-covers` has 1 product (thin page). Add covers or consider merging.
3. 4 active products had no category: Aqua splitter fixed; `deal-1`, `deal-2`, `deal-3` (Corolla 15–26 bundles) still need an owner-picked category.
4. Not fixed (owner): Swift (2025–Present page) lists door handle covers 2022–2025 and mats 2022–2026; Mark X 2009–2022 lists three 2004–2009 products; `led-indicator-lights` still holds non-indicators (OSRAM, angel wings, switchback fog, reverse bulb, Alto lava tail lights).
5. About 697 product images are served from the Shopify CDN: plan a move to Cloudinary.
6. Owner decisions (`SEO_TODO_FOR_OWNER.md`): LED headlight bulbs stocked or not (LED headlights category meta still promises them); bulb base type; AC panel and Airflow fitment years; Yaris hatchback fitment; Liana spare parts; Alto steering years; Swift RS body kit location; Devil Eye / Angel Wings placement; redirect approvals in `SEO_REDIRECT_REVIEW.md`.
7. `spoilers-diffusers` (31 products) has a generic title and short meta (“Car Spoiler Price in Pakistan”); optional improvement.

## Search Console steps

- Re-index batches R1–R3 are in `claude/gsc-daily-url-tracker.md`.
- Resubmit `sitemap.xml` once.
- Add the E140, Civic X and category pages changed by apply 2 to a re-index batch.
- Re-check CTR and position after 4 weeks with the same date-range length.

## Files (audit implementation)

- `seo-data/Pages.csv`, `seo-data/Queries.csv` — GSC exports (read-only input)
- `storecraft-store/lib/collectionRedirectMap.mjs`, `productFallbackRedirects.mjs`, `stripQueryKeys.mjs`, `legacyHandleMaps.mjs`, `middleware.js`
- `storecraft-store/lib/seo/gscAudit2026-10.mjs`, `generationAliases.js`
- `storecraft-store/app/cars/[slug]/page.jsx`, `categories/[slug]/page.jsx`, `[slug]/page.jsx`
- `storecraft-store/components/store/ProductDetailMedico.jsx`
- `scripts/seo/apply-seo-2026-10.mjs`, `scripts/seo/apply-fitment-membership-2026-10.mongosh.js`, `scripts/seo-verify/verify-seo-2026-10.mjs`
- `SEO_REDIRECT_REVIEW.md`, `SEO_TODO_FOR_OWNER.md`, `claude/gsc-daily-url-tracker.md`, this file
