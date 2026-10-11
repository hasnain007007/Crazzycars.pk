# Google Search Console — Daily URL Submission Tracker

**Site:** crazzycars.pk  
**Cadence:** 10 URLs/batch (matches GSC URL Inspection manual quota)  
**Started:** 2026-09-20

## How this works

Each session, submit/inspect the next 10 pending URLs in Search Console (Inspect URL → Request Indexing). This doc is updated after each batch, marking URLs `submitted_day_N` with the date, so we never repeat or skip a URL. Just ask "next 10" or "day N" each time.

Note: batch numbering follows the user's own count, not calendar days — multiple batches can happen on the same day, and gaps of several days can pass between batches.

This project doc is the master copy. The repo has a mirror; if the two differ, trust the project/Claude copy for Day 1–8 history until synced here.

## Source of truth

URLs pulled directly from the site's live sitemaps (sitemap.xml → 5 sub-sitemaps):

- `sitemap-pages.xml` — 13 URLs ✅ captured
- `sitemap-categories.xml` — 36 URLs ✅ captured
- `sitemap-cars.xml` — 56 URLs ✅ captured
- `sitemap-blog.xml` — 17 URLs ✅ captured
- `sitemap-products.xml` — **NOT YET CAPTURED** (about 312 URLs as of 2026-10-11, the largest set). Paste this sitemap's contents next so it can be added to the rotation.

**Total captured so far: 122 URLs** (126 rows incl. minor header artifacts — see raw CSV)

Note: product URLs on this store are flat slugs (e.g. `/car-front-bumper-splitter-abs-plastic-4pcs`), not nested under `/products/`.

## Progress

- **Submitted so far: 70 / 126** captured URLs (plus 8 re-index requests on 2026-10-11, see R1)
- **Remaining pending: 56**
- ✅ All pages (13) done
- ✅ All categories (36) done
- 🔄 Cars (56) — in progress, 20/56 done
- ⬜ Blog (17)
- ⬜ Products (not yet captured)

## Day 1 — 2026-09-20 (submitted)

Home, shop, categories, cars, sale, blogs, faq, contact, about, shipping-policy

## Day 2 — 2026-09-21 (submitted)

returns-policy, privacy-policy, terms-conditions, categories/{exterior, interior, led-lighting, carbon-fiber, car-care-safety, universal-accessories, body-kits-extensions}

## Day 3 — 2026-09-21 (submitted)

categories/{splitters-side-skirts, spoilers-diffusers, side-mirror-covers, quarter-window-louvers, exhaust-systems-tips, steering-wheel-covers, multimedia-steering-controls, air-freshener-decoration, interior-lights, sos-flasher-led-lights}

## Day 4 — 2026-09-23 (submitted)

categories/{led-headlights-bulbs, led-indicator-lights, carbon-fiber-accessories, car-care-cleaning, emergency-safety, door-handle-covers, front-grilles, gadgets, fragrances, air-press}

## Day 5 — 2026-09-26 (submitted)

categories/{dashboard-mats, sun-shades, floor-mats, fog-lamps-drl-covers, backlights-tail-lamps, rear-reflectors, key-covers-key-chains, utility, fender-light, hanging-perfumes}

## Day 7 — 2026-10-08 (submitted)

cars/{toyota-corolla-e140-2009-2014, toyota-corolla-e170-2014-2026, toyota-yaris-2020-present, toyota-aqua-2012-present, toyota-vitz-2012-present, honda-civic-reborn-2006-2012, honda-civic-rebirth-2012-2016, honda-civic-x-2016-2021, honda-civic-11th-gen-2022-present, honda-city-classic-2009-2020}

## Day 8 — 2026-10-08 (submitted)

1. https://crazzycars.pk/cars/honda-city-2021-present
2. https://crazzycars.pk/cars/hyundai-elantra-2020-2024
3. https://crazzycars.pk/cars/hyundai-elantra-hybrid-2025-present
4. https://crazzycars.pk/cars/hyundai-sonata-2020-2024
5. https://crazzycars.pk/cars/haval-h6-2021-present
6. https://crazzycars.pk/cars/suzuki-alto-2020-present
7. https://crazzycars.pk/cars/suzuki-swift-2025-present
8. https://crazzycars.pk/cars/honda-vezel-2013-2018
9. https://crazzycars.pk/cars/toyota-corolla-e120-2002-2008
10. https://crazzycars.pk/cars/toyota-prius-2004-2009

## RE-INDEX after the SEO changes of 2026-10-11 (do these BEFORE Day 9)

These pages changed titles/metas/content or product membership on 2026-10-11, so Google needs to recrawl them. Order = biggest CTR loss first. Mark each batch with the date when done.

Search Console's daily request quota ran out after 8 requests on 2026-10-11 ("Quota Exceeded"). The quota resets at midnight Pacific time (about noon in Karachi). Do not retry until then.

### Batch R1 — priority products (8 of 10 submitted 2026-10-11)

1. ✅ 2026-10-11 https://crazzycars.pk/toyota-corolla-grande-steering-wheel-trim-in-carbon-fiber-multimedia
2. ✅ 2026-10-11 https://crazzycars.pk/funny-window-hand-gesture-led-light
3. ✅ 2026-10-11 https://crazzycars.pk/toyota-corolla-gli-xli-2009-2014-multimedia-steering-wheel-audio-control-buttons
4. ✅ 2026-10-11 https://crazzycars.pk/toyota-corolla-2009-2026-carbon-steering-monogram-abs
5. ✅ 2026-10-11 https://crazzycars.pk/toyota-aqua-2012-2015-complete-body-kit
6. ✅ 2026-10-11 https://crazzycars.pk/car-heads-up-display-hud
7. ✅ 2026-10-11 https://crazzycars.pk/toyota-corolla-2012-top-ac-panel
8. ✅ 2026-10-11 https://crazzycars.pk/changan-oshan-x7-batman-style-side-mirror-covers
9. ⏳ PENDING (quota) https://crazzycars.pk/toyota-corolla-2015-2026-rs-style-trunk-spoiler-abs
10. ⏳ PENDING (quota) https://crazzycars.pk/honda-city-new-model-trunk-lip-spoiler-2021-2026

### Batch R2 — vehicle pages and two categories (pending)

First do R1 items 9 and 10, then 8 of the 10 below on the same day, and the rest next day.

1. https://crazzycars.pk/cars/toyota-yaris-2020-present
2. https://crazzycars.pk/cars/suzuki-alto-2020-present
3. https://crazzycars.pk/cars/suzuki-swift-2025-present
4. https://crazzycars.pk/cars/toyota-aqua-2012-present
5. https://crazzycars.pk/cars/honda-civic-x-2016-2021 (also changed by the fitment apply)
6. https://crazzycars.pk/cars/toyota-corolla-e140-2009-2014 (also changed by the fitment apply)
7. https://crazzycars.pk/cars/honda-city-2021-present
8. https://crazzycars.pk/cars/suzuki-liana-2006-2014
9. https://crazzycars.pk/categories/steering-wheel-covers
10. https://crazzycars.pk/categories/interior-lights

### Batch R3 — categories, door handle panels, contact, three more products (pending)

1. https://crazzycars.pk/categories/led-indicator-lights
2. https://crazzycars.pk/categories/splitters-side-skirts (also changed by the fitment apply)
3. https://crazzycars.pk/categories/quarter-window-louvers (also changed by the fitment apply)
4. https://crazzycars.pk/categories/led-lighting
5. https://crazzycars.pk/categories/led-headlights-bulbs
6. https://crazzycars.pk/toyota-corolla-x-carbon-fiber-interior-door-handle-panels-2014-2026
7. https://crazzycars.pk/contact (the old /pages/contact-1 now redirects here)
8. https://crazzycars.pk/car-front-bumper-splitter-abs-plastic-3pcs (Batman style front splitter 3PCS)
9. https://crazzycars.pk/deepal-s05-batman-style-side-mirror-covers
10. https://crazzycars.pk/honda-city-2021-2026-carbon-fiber-gear-knob

### Batch R4 — only what the fitment apply changed and R1–R3 do not cover (pending)

1. https://crazzycars.pk/categories/spoilers-diffusers
2. https://crazzycars.pk/cars/honda-civic-rebirth-2012-2016
3. https://crazzycars.pk/cars/honda-civic-reborn-2006-2012
4. https://crazzycars.pk/honda-civic-rebirth-ducktail-spoiler
5. https://crazzycars.pk/toyota-corolla-e140-2009-2013-ducktail-trunk-spoiler
6. https://crazzycars.pk/categories/stickers-monograms-emblems (copy rewritten 2026-10-11, placeholder gone; OK to request)

### Batch R5 — the four product title/meta updates (live since 2026-10-11) (pending)

1. https://crazzycars.pk/honda-civic-x-2016-2021-carbon-inner-door-panel-trims-4pcs
2. https://crazzycars.pk/suzuki-alto-multimedia-steering-control-buttons-with-spiral-cable-glossy-black
3. https://crazzycars.pk/toyota-aqua-2016-2019-front-body-kit-fibreglass
4. https://crazzycars.pk/toyota-corolla-2015-2024-front-spike-splitter-canard-3pcs

Also: resubmit sitemap.xml once in the GSC Sitemaps report, and do not "Request indexing" for redirecting URLs (www, /products/, /collections/, /pages/about and the other /pages/* redirects); they only need the sitemap. /track-order is blocked by robots.txt, so do not request indexing for it.

## Day 9 — next up after R1–R5 (pending, not yet submitted)

1. https://crazzycars.pk/cars/toyota-prius-2009-2015
2. https://crazzycars.pk/cars/toyota-axio-2014-2022
3. https://crazzycars.pk/cars/toyota-passo-2016-2022
4. https://crazzycars.pk/cars/toyota-raize-2019-present
5. https://crazzycars.pk/cars/toyota-corolla-cross-2020-present
6. https://crazzycars.pk/cars/toyota-hilux-revo-2016-present
7. https://crazzycars.pk/cars/toyota-fortuner-2020-present
8. https://crazzycars.pk/cars/toyota-prado-2009-2023
9. https://crazzycars.pk/cars/honda-brv-2017-present
10. https://crazzycars.pk/cars/suzuki-cultus-2017-present

## Remaining queue order (after Day 9)

Cars (26 left, ~3 more batches) → Blog (17, ~2 batches) → Products (pending capture, about 312)

## Open items

1. Paste `sitemap-products.xml` contents (visit https://crazzycars.pk/sitemap-products.xml) so product pages join the rotation — this is almost certainly the largest and highest-value set (product pages = sales pages). Still not received — outstanding since Day 1.
2. The site is now the custom Next.js store (not Shopify), so the Shopify connector is not the right tool for pulling product URLs; use the sitemap.
3. Submit the sitemap index itself (`https://crazzycars.pk/sitemap.xml`) once under GSC's **Sitemaps** report — lets Google crawl everything in the background while the manual batches cover priority pages faster.
