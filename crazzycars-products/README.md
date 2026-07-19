# CrazzyCars.pk — Products Seed (234 products, fully linked)

Built by merging your Shopify CSV export with LIVE collection memberships
pulled via the Shopify API (the CSV alone doesn't contain collections).

## Contents
- `data/products.json` — all 234 products: clean names, PKR prices + compare-at,
  697 images, variants (24 multi-variant), tags, category links, vehicle links,
  featured/deal/universal flags, unique SEO meta per product
- `data/collection_memberships.json` — raw Shopify collection→product mapping (reference)
- `models/Product.js` — Product schema (adapt field names if you already have one)
- `seed/seedProducts.js` — resolves category/vehicle slugs → ObjectIds and upserts
- `transform.py` — the generator (re-run if you re-export the CSV)

## Order matters
1. seedCategories.js  → 2. seedVehicles.js  → 3. seedProducts.js

## Stats
234 products · 229 active · 195 car-specific · 45 universal · 16 featured · 11 deals

## Notes found during migration
- 51 products were missing category assignments in Shopify (only in car collections);
  categories were inferred from product names — review the INFERRED list in transform output.
- 1 product is for Honda Vezel (not in your car catalog) — currently marked universal;
  add a Vezel vehicle in admin if you want it car-filtered.
- 3 duplicate-looking products exist (handles ending in "-copy"); review in admin.
