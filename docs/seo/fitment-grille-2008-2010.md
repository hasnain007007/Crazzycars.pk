# Fitment mismatch — Corolla 2008–2010 chrome grille (Task 15)

**Product:** `/toyota-corolla-2008-2010-diamond-style-chrome-front-grille`  
**Status:** Report only — **no fitment data changed** (owner approval required).

## Evidence (live 4 Nov 2026)

- Product **name** / description: Toyota Corolla **2008–2010**
- Product JSON-LD `additionalProperty` / `isAccessoryOrSparePartFor` listed:
  - Toyota Corolla **2002–2008**
  - Toyota Corolla **2009–2014**

## Proposed fix (after approval)

1. Replace stored compatibility rows with a single fitment: **Toyota Corolla 2008–2010**.
2. Optional code flag `SEO_CLAMP_FITMENT_TO_NAME_YEARS=1`: when the product name carries an explicit year range, intersect schema fitment years with that range (dry-run diff first).

## Dry-run script

`scripts/seo/dry-run-fitment-grille-2008-2010.mjs` (default dry-run; `--apply` only after owner sign-off).

## Related scan

See `docs/seo/fitment-mismatch-2026-11-04.csv` for other products where schema years are wider than the name range.

## Applied 4 Nov 2026 (owner approved)

- Script: `storecraft-store/scripts/seo/apply-fitment-grille-2008-2010.mjs --apply`
- Before: Corolla 2002–2008 + 2009–2014
- After: single row Toyota Corolla 2008–2010
- Verified unchanged: slug, status=active, regularPrice=8000, salePrice=5999, quantity=25
- Global `SEO_CLAMP_FITMENT_TO_NAME_YEARS` was **not** enabled
