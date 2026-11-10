# Malformed /cars/ URL generators (T10a)

Two GSC URLs look like concatenated slugs:

- `/cars/hyundai-elantra-2020-2024-2020-elantra-2020-2024-cn7`
- `/cars/hyundai-sonata-2020-sonata-2020-2024-dn8`

## Likely source

`storecraft-store/lib/vehiclePageData.js` → `buildVehicleSlug()` / `ensureVehicleFromCatalog()` prefers `catalogModelSlug` when it already contains the make. If a client or import **also** prepends a vehicle slug or display-name slug to a catalog slug that already embeds years + chassis (`cn7` / `dn8`), the result is a double path.

`ShopByVehicle` previously could emit `/cars/${undefined}` or coerce image objects; hardened in T10g.

## Fix applied

Explicit 301s in `vehicleSlugRedirects.mjs` for both malformed paths. No automatic slug-inference rule.

## Still open

`/cars/tucson-hybrid-2025-nx4` — **owner decision** whether to redirect to `/cars/hyundai-tucson-2020-2024` or create a hybrid hub.
