# R1 — Gap analysis (read-only)

**Live:** FP `84143ac0cb2c3085` / `sialkot_motorsports` (VPS `sialkot-mongo`).  
**Best source:** Mac `crazzycars_local_real` @ `:27028` (blogs + missing products).  
**Cutoff:** ~2026-10-10T21:18Z (fitment backup timestamp).  
**Never overwrite:** live orders/customers (newer than any backup).

## Collection summary

| Collection | Live | Best source | Missing in live | Live newer (keep) |
|------------|-----:|------------:|----------------:|-------------------|
| blogposts | 18 | local_real 35 | **20** | 3 live-only blogs |
| products | 410 | local_real 476 | **66** slug-only (21 active / 1 draft / 44 inactive) | 0 live-only slugs |
| categories | 84 | local_real 94 | shell bikes etc. not on live car catalog | live OK for car |
| vehicles | 68 | local_real 85 | bike vehicles extra in local | live OK for car |
| orders | 603 | archive 408 | — | **42** created after cut |
| customers | 342 | archive 335 | — | **7** after cut |
| reviews | 1175 | archive 1175 | 0 | none after cut |

## 20 missing blog posts (insert-only candidates)

From `crazzycars_local_real` (published). Live also has 3 blogs **not** in local_real — keep them.

| # | slug | createdAt (source) |
|---|------|--------------------|
| 1 | car-chargers-air-compressors-roadside-pakistan | 2026-10-01T22:38:08Z |
| 2 | car-air-press-window-visors-fitment-pakistan | 2026-10-01T22:38:08Z |
| 3 | dashboard-mats-pakistan-sun-glare-buying-guide | 2026-10-01T22:38:07Z |
| 4 | key-covers-key-chains-match-buttons-pakistan | 2026-10-01T22:38:07Z |
| 5 | door-handle-covers-buying-guide-pakistan-city-civic-corolla | 2026-10-01T22:38:07Z |
| 6 | quarter-window-louvers-civic-corolla-fitment-pakistan | 2026-10-01T22:38:07Z |
| 7 | front-splitters-side-skirts-buying-guide-pakistan | 2026-10-01T22:38:06Z |
| 8 | crazzycars-delivery-charges-regular-vs-bulky-pakistan | 2026-10-01T22:37:21Z |
| 9 | car-accessories-returns-wrong-item-pakistan-crazzycars | 2026-10-01T22:37:20Z |
| 10 | abs-vs-real-carbon-fiber-car-accessories-pakistan | 2026-10-01T22:36:53Z |
| 11 | match-year-variant-order-car-accessories-online-pakistan | 2026-09-18T15:24:55Z |
| 12 | cabin-mood-lighting-usb-atmosphere-digital-eyes-pakistan | 2026-09-18T15:24:55Z |
| 13 | suzuki-swift-carbon-door-handle-covers-pakistan | 2026-09-18T15:24:55Z |
| 14 | push-start-cover-carbon-key-fob-accessories-pakistan | 2026-09-18T15:24:55Z |
| 15 | car-door-welcome-logo-lights-pakistan-guide | 2026-09-18T15:24:55Z |
| 16 | honda-city-2021-2026-carbon-interior-upgrades-pakistan | 2026-09-18T15:24:55Z |
| 17 | trunk-lip-spoiler-buying-guide-pakistan-alsvin-city-corolla | 2026-09-18T15:24:55Z |
| 18 | batman-style-side-mirror-covers-pakistan-fitment-guide | 2026-09-18T15:24:55Z |
| 19 | toyota-corolla-rgb-bumper-neon-mirror-lights-pakistan | 2026-09-18T15:24:55Z |
| 20 | honda-civic-11th-gen-carbon-fiber-interior-kit-pakistan-guide | 2026-09-18T15:24:55Z |

**Live-only (do not delete):** `7d-vs-9d-vs-tpe-floor-mats-pakistan`, `body-kit-price-in-pakistan-2026`, `honda-city-2021-modification-cost-pakistan`.

## Missing products (~27 intended / 66 slug-diff)

### Priority insert: **21 active** (+ optional 1 draft)

| slug | status | createdAt |
|------|--------|-----------|
| universal-lime-green-fog-light-led-h11-pair | active | 2026-10-19 |
| usb-car-roof-star-night-light-galaxy-projector | active | 2026-09-20 |
| lion-style-car-perfume | active | 2026-09-16 |
| x-perfume-card-pack-car-interior-hanging-fragrance | active | 2026-09-16 |
| mg-logo-seat-belt-clip-2pcs | active | 2026-09-16 |
| carbon-fiber-push-start-cover-for-cars | active | 2026-09-16 |
| 2-in-1-microfiber-towels-ultra-thick-40x40cm | active | 2026-09-16 |
| honda-city-2009-2021-complete-interior-carbon-fiber-trim-set | active | 2026-09-16 |
| honda-city-2009-2018-interior-carbon-fiber-trims | active | 2026-09-16 |
| honda-city-2021-2026-carbon-fiber-gear-knob | active | 2026-09-16 |
| honda-city-2021-2026-carbon-fiber-steering-trim | active | 2026-09-16 |
| honda-civic-reborn-2006-2011-carbon-fiber-steering-trim | active | 2026-09-16 |
| honda-city-new-model-complete-interior-carbon-fiber-trim-set | active | 2026-09-16 |
| honda-civic-11th-gen-2022-2026-carbon-dashboard-trims-2pcs | active | 2026-09-16 |
| honda-civic-11th-gen-2022-2026-carbon-steering-wheel-decorative-trim | active | 2026-09-16 |
| honda-civic-11th-gen-2022-2026-carbon-window-control-armrest-cover | active | 2026-09-16 |
| honda-civic-11th-gen-2022-2026-carbon-center-console-gear-shift-panel | active | 2026-09-16 |
| honda-civic-11th-gen-2022-2026-carbon-gear-shift-knob-cover | active | 2026-09-16 |
| honda-civic-2022-2026-carbon-fiber-key-fob-cover-5-button | active | 2026-09-16 |
| toyota-corolla-2014-2026-side-mirror-neon-style-indicator | active | 2026-08-17 |
| universal-car-anti-rust-door-lock-cover-premium-protection-cap | active | 2026-07-19 |
| bosch-white-h11-led-fog-light-bulbs-pair | draft | 2026-10-19 |

### Also in local only: **44 inactive** (Oct 3–4 batch)

Owner decide: insert as inactive inventory, or skip. Full slug list in working notes (`/tmp/gap-missing-products.txt` on agent host).

## Orders / customers / stock after cut

- Orders after `2026-10-10T21:18Z`: **42** on live — **keep; never restore from archive**.
- Customers after cut: **7** — keep.
- Reviews: none newer than 2026-09-14.
- Stock/settings: no alternate newer source; leave live.

## Oct 10 SEO text (13 products / 6 categories / 8 vehicles)

**Status:** rolled back / diverged. Live product `metaTitle`s still carry `| Sialkot Motorsports` and do **not** match post-apply targets in `seo-apply-20261010T200917Z.txt` / `L1-dry-run-m4b-reapply.md`.

| Bucket | Count | Restore method |
|--------|------:|----------------|
| products | 13 | field `$set` from apply script after-values (not from before JSON) |
| categories | 6 | same |
| vehicles | 8 | same |
| honda-city-2021-2026-carbon-fiber-gear-knob | — | **doc missing** → insert product first, then SEO |

Before-values: `backups/seo-2026-10-apply/seo-backup-2026-10.json`.  
After targets: `backups/seo-2026-10-apply/seo-apply-20261010T200917Z.txt` + `scripts/seo/apply-seo-2026-10.mjs`.

## Fitment / category membership (9 products)

Before snapshot: `fitment-membership-before-values-20261010T211824Z.json` (cut exact).  
Apply ops (from L1 plan; after-values = script, not before):

| slug | intended ops |
|------|----------------|
| toyota-corolla-e140-2009-2013-ducktail-trunk-spoiler | `$pull` splitters; `$addToSet` spoilers |
| toyota-corolla-2015-2026-carbon-steering-trim | `$pull` splitters |
| toyota-corolla-x-shark-fin-style-lower-panel-diffuser | `$pull` splitters; `$addToSet` spoilers |
| honda-civic-x-2016-2021-carbon-steering-trim-cover | `$pull` louvers |
| + 5 others in before JSON | re-diff at apply time vs live |

**Conflict:** fitment before `_id` for door-handle = `6aca8810…` (Set of 4). Live doc `_id` = `6aca877d…` (Set of 2). Membership `$set` must target **live `_id`**, not local_real’s.

## Owner door-handle edit

| | Live | local_real |
|--|------|------------|
| `_id` | `6aca877dc7b9bcec06c09a32` | `6aca8810b039d73bf1c379de` |
| name | Set of **2** | Set of **4** |
| salePrice | **4490** | 5999 |
| regularPrice | 5490 | 7999 |

**Decision required:** keep Set of 2 @ 4490 (live), or rename/SEO to Set of 4 while keeping live price (L1 plan), or insert second SKU. Do **not** replace live `_id` with local_real doc.

## Documents where live is newer

- All orders/customers after cut.
- Any product `updatedAt` after cut from m5/batman photo ops (partially present; some images emptied — see R2).
- Live-only blog posts listed above.

## Archive / mig_compare

`sialkot_motorsports.archive` + `mig_compare_readonly` ≈ 411p/18b — **not** a source for the 20 blogs or ~21 active missing products (+1 product vs live only).
