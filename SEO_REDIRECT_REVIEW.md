# SEO redirect review (Search Console audit, 10 Oct 2026)

Owner: approve or change proposed targets before treating them as final.

## Admin Redirect model

The admin `Redirect` collection (`storecraft-admin` Redirect model) is **not** applied by storefront middleware today. Live redirects come from `middleware.js`, `next.config.mjs` (`buildLegacyRedirects`), and route-level `permanentRedirect`.

Could not auto-diff admin Redirect rows against the new map without a confirmed staging Mongo fingerprint. After you run the apply/redirect deploy, spot-check Admin → Redirects for any `fromPath` under `/products/` or `/collections/` that disagrees with the maps below and remove or align them.

## `/products/` URLs with no flat twin (live probe)

Pages.csv had **188** unique `/products/` URLs. Live check (crazzycars.pk): **183** already resolve to a 200 PDP via suffix strip / fuzzy slug match; **5** land on 404. Brief estimated ~28; catalogue resolution improved since the Shopify migration.

| From | Proposed target | Reason |
|---|---|---|
| `/products/honda-civic-reborn-2006-2011-body-kit-d1-crazzycars-pk` | `/honda-civic-reborn-2006-2011-body-kit-d3` | Closest live Reborn body-kit variant (d3) |
| `/products/honda-civic-reborn-2006-2011-body-kit-d4-crazzycars-pk` | `/honda-civic-reborn-2006-2011-body-kit-d3` | Closest live Reborn body-kit variant (d3) |
| `/products/toyota-corolla-2017-2020-led-side-mirror-sequential-indicator-pair-crazzycars-pk` | `/toyota-corolla-2014-2026-side-mirror-neon-style-indicator` | Closest live Corolla side-mirror indicator |
| `/products/suzuki-swift-2018-2024-complete-body-kit-fibreglass-crazzycars-pk` | `/suzuki-swift-2022-2024-rs-style-body-kit-fibreglass` | Closest live Swift body kit |
| `/products/canbus-bright-led-indicator-bulbs-2-pcs-crazzycars-pk` | `/bright-led-indicator-bulbs-2-pcs` | Renamed universal indicator bulb SKU |

Implemented in `storecraft-store/lib/productFallbackRedirects.mjs` (also redirects the flat 404 path in one hop).

## Uncertain `/collections/` mappings

| From | Proposed target | Reason |
|---|---|---|
| `/collections/honda-city` | `/cars/honda-city-2021-present` | Ambiguous vs `/cars/honda-city-classic-2009-2020`; newest gen chosen |
| `/collections/car-emergency-safety-products` | `/categories/car-care-safety` | No exact emergency-safety leaf; closest live category |

All other Pages.csv `/collections/` handles have verified 200 targets in `storecraft-store/lib/collectionRedirectMap.mjs`.
