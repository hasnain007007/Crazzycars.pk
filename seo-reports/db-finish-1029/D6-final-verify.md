# D6 — Final verification (read-only)

**When:** 2026-10-28T22:55:42Z
**GRANTED:** empty — no DB writes this loop.

## Counts before → after

| Collection | Before | After | Delta |
|------------|-------:|------:|------:|
| products | 410 | 410 | 0 |
| blogs | 18 | 18 | 0 |
| categories | 84 | 84 | 0 |
| vehicles | 68 | 68 | 0 |
| orders | 603 | 603 | 0 |
| customers | 342 | 342 | 0 |

Orders/customers unchanged (this loop wrote nothing).

## seo-verify C1–C24

See `seo-verify-D6.txt` / `.json`. Pre-existing hard fails: C4–C7,C9,C10,C12,C15; soft C8,C19. C23 sitemap pass expected.

## Sitemap sample (37 of 494 URLs)

- HTTP 200: 37/37
- self-canonical: 37/37
- noindex: 0/37
- issues: 0

## Top-20 click pages (Pages.csv)

| clicks | code | self-can | titleLen | metaLen | H1 | noindex | URL |
|-------:|-----:|:--------:|---------:|-------:|---:|:-------:|-----|
| 139 | 200 | True | 47 | 156 | 1 | False | `https://crazzycars.pk/` |
| 23 | 200 | True | 44 | 142 | 1 | False | `https://crazzycars.pk/cars/toyota-corolla-e140-2009-2014` |
| 20 | 200 | True | 51 | 148 | 1 | False | `https://crazzycars.pk/car-heads-up-display-hud` |
| 19 | 200 | True | 67 | 98 | 1 | False | `https://crazzycars.pk/toyota-corolla-airflow-ambient-led-ac-vent-trims-plug-and-play` |
| 19 | 200 | True | 63 | 124 | 1 | False | `https://crazzycars.pk/changan-oshan-x7-batman-style-side-mirror-covers` |
| 18 | 200 | True | 57 | 160 | 1 | False | `https://crazzycars.pk/toyota-corolla-2012-top-ac-panel` |
| 16 | 200 | True | 59 | 135 | 1 | False | `https://crazzycars.pk/toyota-yaris-2020-2026-trunk-lip-spoiler-abs-plastic` |
| 14 | 200 | True | 48 | 145 | 1 | False | `https://crazzycars.pk/categories/splitters-side-skirts` |
| 13 | 200 | True | 44 | 148 | 1 | False | `https://crazzycars.pk/categories/led-indicator-lights` |
| 13 | 200 | True | 42 | 140 | 1 | False | `https://crazzycars.pk/cars/deepal-s05-2024-present` |
| 13 | 200 | True | 67 | 132 | 1 | False | `https://crazzycars.pk/2pcs-front-bumper-lip-splitter-chin-spoiler-for-honda-civic-11th-gen-2022-2026-gloss-black` |
| 12 | 200 | True | 60 | 121 | 1 | False | `https://crazzycars.pk/honda-city-2008-2014-complete-body-kit` |
| 12 | 200 | True | 43 | 142 | 1 | False | `https://crazzycars.pk/cars/toyota-corolla-e170-2014-2026` |
| 11 | 200 | True | 68 | 142 | 1 | False | `https://crazzycars.pk/devil-eye-led-rear-windshield-light` |
| 11 | 200 | True | 48 | 153 | 1 | False | `https://crazzycars.pk/categories/quarter-window-louvers` |
| 11 | 200 | True | 53 | 145 | 1 | False | `https://crazzycars.pk/categories/interior-lights` |
| 11 | 200 | True | 42 | 145 | 1 | False | `https://crazzycars.pk/cars/honda-civic-reborn-2006-2012` |
| 10 | 308 | False | 0 | 0 | 0 | False | `https://crazzycars.pk/products/toyota-corolla-2012-top-ac-panel` |
| 10 | 308 | False | 0 | 0 | 0 | False | `https://crazzycars.pk/products/hyundai-elantra-2023-2026-sporty-style-body-kit-fibreglass-crazzycars-pk` |
| 9 | 200 | True | 61 | 116 | 1 | False | `https://crazzycars.pk/toyota-aqua-2016-2019-front-body-kit-fibreglass` |

Top-20 non-200: 2

## Loop outcome

All DB apply steps **dry-run only** (GRANTED empty). No rollback needed. Waiting on tokens: `R4`, `L1`, `L2`, `S6-DB`.
