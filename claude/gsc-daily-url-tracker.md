# GSC daily URL inspection tracker (crazzycars.pk)

Limit: **10 URL inspections / day**. Prefer lowest-CTR pages first, then apply-touched URLs.

Re-measure window: on or after **2026-11-08** (see `SEO_CHANGELOG.md`).

## Batches

### R1 — lowest CTR / zero-click (submitted or next)

| # | URL | Notes |
|---|-----|--------|
| 1 | https://crazzycars.pk/pages/contact-1 | 849 impr / 0 clicks — also confirm redirect/legacy |
| 2 | https://crazzycars.pk/contact | Canonical contact |
| 3 | https://crazzycars.pk/ (or ranking PDP with ~1% CTR) | Owner pick from GSC |
| 4–10 | Next lowest-CTR PDPs from `seo-data/Pages.csv` | Grande steering trim, funny hand gesture, GLi/XLi buttons, monogram, Batman splitter, Aqua kit, … |

**Status:** fill date submitted / result when done.

### R2 — already-ranking pages (protect)

| # | URL |
|---|-----|
| 1 | https://crazzycars.pk/cars/toyota-corolla-e140-2009-2014 |
| 2 | https://crazzycars.pk/car-heads-up-display-hud |
| 3 | https://crazzycars.pk/toyota-corolla-airflow-ambient-led-ac-vent-trims-plug-and-play |
| 4 | https://crazzycars.pk/ (Oshan X7 Batman mirror covers PDP) |
| 5 | https://crazzycars.pk/toyota-corolla-2012-top-ac-panel |
| 6 | https://crazzycars.pk/ (Yaris trunk spoiler PDP) |

**Status:** fill when requested.

### R3 — SEO apply 1 (titles/metas/content)

| # | URL |
|---|-----|
| 1 | https://crazzycars.pk/cars/suzuki-alto-2020-present |
| 2 | https://crazzycars.pk/cars/suzuki-liana-2006-2014 |
| 3 | https://crazzycars.pk/cars/honda-city-2021-present |
| 4 | https://crazzycars.pk/cars/toyota-aqua-2012-present |
| 5 | https://crazzycars.pk/categories/splitters-side-skirts |
| 6 | https://crazzycars.pk/categories/quarter-window-louvers |
| 7 | https://crazzycars.pk/categories/led-indicator-lights |
| 8 | https://crazzycars.pk/toyota-corolla-x-carbon-fiber-interior-door-handle-panels-2014-2026 |
| 9 | https://crazzycars.pk/categories/steering-wheel-covers |
| 10 | https://crazzycars.pk/categories/interior-lights |

**Status:** fill when requested.

### R4 — fitment / membership apply 2 (priority after R1–R3)

Add these after apply 2 (membership + vehicle tags changed):

| # | URL | Why |
|---|-----|-----|
| 1 | https://crazzycars.pk/cars/toyota-corolla-e140-2009-2014 | −2 wrong-gen products |
| 2 | https://crazzycars.pk/cars/honda-civic-x-2016-2021 | −1 rebirth ducktail |
| 3 | https://crazzycars.pk/categories/splitters-side-skirts | membership + Aqua splitter |
| 4 | https://crazzycars.pk/categories/quarter-window-louvers | −1 steering trim cover |
| 5 | https://crazzycars.pk/categories/steering-wheel-covers | thin (1 product) |
| 6 | https://crazzycars.pk/categories/stickers-monograms-emblems | monogram moved here |
| 7 | https://crazzycars.pk/categories/spoilers-diffusers | +ducktail + shark fin |
| 8 | https://crazzycars.pk/cars/honda-civic-rebirth-2012-2016 | rebirth ducktail remains |
| 9 | https://crazzycars.pk/cars/honda-civic-reborn-2006-2012 | rebirth SKU untagged |
| 10 | https://crazzycars.pk/toyota-corolla-x-carbon-fiber-interior-door-handle-panels-2014-2026 | still on E170/Axio |

**Status:** queued — request indexing 10/day after R1–R3 or interleave with lowest-CTR.

## Sitemap

- Resubmit **once:** `https://crazzycars.pk/sitemap.xml` (covers products / categories / cars).
- Date submitted: ________
