# Catalog fix 2026-10 — where the data lives and how it is changed

## Storage (step 0)

| What | Where |
|---|---|
| Products | MongoDB `crazzycars_motorsports.products` on the VPS (`sialkot-mongo`, write fingerprint `187aad8c44fe3a84`). Schema: `storecraft-admin/lib/models/Product.model.js` (store has a copy). |
| Prices | `pricing.regularPrice`, `pricing.salePrice`, `pricing.saleSchedule`, `pricing.costPerItem`. `price` / `isOnSale` in the API are **derived** on read (`storecraft-store/lib/storeSerialize.js`: on sale only when `0 < sale < regular`). |
| Fitment | `vehicleCompatibility.vehicles[]` (source, edited in admin) → copied to `compatibleCars[]` on save; `compatibleVehicles[]` = links to car pages (`vehicles` collection). Generations come from the Car Catalog (`carcatalogs.models[]`: name, generation, years). |
| Images | `media.images[]` (`url`, `isMain`, `altText`); files under `/data/crazzycars/media/products/<slug>-<n>-<hash>.webp` on the VPS, served at `/media/products/…`. |
| Categories | `categories[]` (ObjectIds into `categories`). |
| Writes | Admin API only (`storecraft-admin/app/api/products/**`): create, edit, CSV import, bulk edit. No seed/fixture is the source of truth. |

## Changes in code (deployed with the repo)

- `/api/products/[slug]` and the app's `/api/mobile/v1/products/[slug]` returned CC-0001 for every slug (`{ slug, ...STOREFRONT_PRODUCT_FILTER }` — the filter's own `slug` key overwrote it). Fixed with `storefrontProductLookup()`; also accepts a Mongo id.
- Price rules on create / edit / CSV import (`lib/productPriceRules.js`): whole rupees, sale > 0 and < regular, empty or 0 = no sale. Bulk edit accepts whole rupees only. Admin `computeProductSaleState` uses the same rule as the store.
- Fitment rows are normalised on save (`lib/normalizeFitmentOnSave.js`): a generation code in the model field becomes the catalog model + generation.
- `scripts/catalog/check-catalog.mjs` — read-only check (title vs fitment, title years, image name vs slug, shared image, missing/placeholder image, prices, missing category). `--fail-on high` for CI.

## Data changes (need GO)

`scripts/fix-catalog-2026-10.mjs` — dry run by default; see `DRY-RUN.md` (70 products). Apply on the VPS:

```
MONGODB_URI=<live uri> node --import ./tests/alias-loader.mjs scripts/fix-catalog-2026-10.mjs --apply --allow-write
```

It refuses any database but the live fingerprint, writes `backup-before-apply-<time>.json` first, and is idempotent (re-run shows 0 changes). The JSON dry run cannot see existing car-page links; against the DB it keeps them and only adds.

Everything else: `NEEDS_HUMAN_REVIEW.md`.
