# SEO TODO for owner (Search Console audit, 10 Oct 2026)

Do not publish bracketed copy. Decide each item, then we can apply.

Re-measure GSC: on or after **2026-11-08** (see `SEO_CHANGELOG.md` baseline).

## Category: LED Headlights & Bulbs

**Page:** `/categories/led-headlights-bulbs`  
**Status:** Restored on the wire to `LED Headlights & Bulbs | Crazzycars.pk` via `CATEGORY_SEO_OWNER_LOCKED` (excluded from GSC apply). Production Mongo may still diverge; code ignores DB SEO for this slug until you decide.

> The category is titled "LED Headlights & Bulbs" and the meta promises "plug-and-play LED headlight bulbs", but no LED headlight bulb is listed. Do you stock LED bulbs? If yes, add them to the category. If no, apply: title "Projector Headlights & LED Fog Lights Pakistan | CrazzyCars", meta "Corolla Nike style projector headlights, OSRAM 3-colour projector lights and H11 switchback LED fog lights. Fitment on every listing. COD on eligible items."

## Open issues from live check (2026-10-11)

### Needs owner decision

| # | Issue | Pages |
|---|---|---|
| A | Wrong-generation products on vehicle grids | **Done (2026-10-11 apply):** E140 door panels + dashboard trim untagged; rebirth ducktail off Civic X and Civic Reborn. Swift/Mark X left alone. |
| B | Category membership noise (metas already fixed) | **Partial (2026-10-11 apply):** splitters/louvers/steering-cover/monogram/Aqua splitter fixed. Back Mirror Rack kept in louvers. Still open: `led-indicator-lights` non-indicators (OSRAM, angel wings, fog, reverse, Alto lava — list only). |
| C | Swift 2025 page fitment years | Door handle covers 2022–2025 and floor/dash mats 2022–2026 on the 2025–Present page — confirm or move to 2018–2024. |
| D | Yaris hatchback fitment | Do listings fit hatchback? |
| E | Liana spare parts | Bumpers, windscreens, back light covers? |
| F | Alto multimedia steering years | Which years for each of the two Rs. 7,500 listings? |
| G | Swift RS body kit location | Confirm 2022–2024 kit lives on `/cars/suzuki-swift-2018-2024`. |
| H | Devil Eye / Angel Wings | Keep in interior-lights or move? |
| I | Redirect approvals | See `SEO_REDIRECT_REVIEW.md`. |
| J | AC panel / Airflow fitment years | One owner truth for each ranking page. |
| K | LED indicator bulb base type | Bright LED Indicator Bulbs 2PCS. |
| L | Steering-wheel-covers assignment | Now 1 cover left (thin). Add covers, merge category, or leave. Monogram moved to stickers-monograms-emblems. |
| M | stickers-monograms-emblems placeholder | 1 product but still “products are being added” copy — rewrite, or noindex + omit from sitemap until ~3 products. |
| N | Corolla deal packs (no category) | `deal-1` / `deal-2` / `deal-3` toyota-corolla-15-26 — pick a category. |
| O | Mark X wrong years | Three 2004–2009 SKUs on Mark X 2009–2022 page — confirm untag/move. |
| P | spoilers-diffusers meta (optional) | Generic “Car Spoiler Price in Pakistan” — improve when ready. |
| Q | Shopify CDN images (~697) | Plan move to Cloudinary (ops, not SEO copy). |

### Fixed in follow-up (no owner wait)

- City / Liana meta ≤160 (code + Mongo); Liana meta has velvet dashboard mat, no price.
- Popular chips cleaned on Civic X, E140, Swift 2025, Alto, City (removed LED headlights / DRL / unlisted trims). E140 Popular: body kits · front grilles · trunk spoilers · tail lights.
- Hero + mobile subtitle: “Accessories & Body Kits” only when a body-kit product exists (`cars/[slug]/page.jsx:187–190`); Alto / Liana show Accessories.
- Aqua intro: “2012–2022” instead of “each year”.
- Door handle panels: title `…2014–2026 Set of 4 | CrazzyCars` (≤60); empty alt filled.
- Category metas: splitters (no City); louvers (+Prius, “carbon and black”); LED indicators (Corolla from Rs. 4,999; keeps Corolla/Civic/City).

## Bracketed / omitted questions from the brief

| Page | File / area | Question |
|---|---|---|
| `/categories/led-indicator-lights` | `gscAudit2026-10.mjs` (LED bulbs H2) | State the bulb base type for Bright LED Indicator Bulbs 2PCS. |
| `/categories/steering-wheel-covers` | category assignment | (a) Home page shows Alcantara/suede steering wheel cover and "Universal Carbon Fiber Steering Wheel Cover Trims Anti-Slip 2PCS". Are they assigned to this category? Category lists only 2 products today. (b) Corolla steering monogram (Rs. 799) is an emblem, not a cover — move to a "Steering wheel accessories" category? (c) What wheel diameter range does the universal cover fit? |
| `/categories/interior-lights` | merchandising | "Devil Eye LED Car Rear Windshield Light" and "Universal Angel Wings LED Car Light" look like they are **not** interior lights — confirm whether to move them (not moved by this audit). |
| `/cars/toyota-yaris-2020-present` | FAQ | Do these accessories fit the Yaris hatchback? State which body style the listings fit. |
| `/cars/suzuki-alto-2020-present` | steering buttons H2 | Which model years does each Alto multimedia steering control listing fit? |
| `/cars/suzuki-swift-2025-present` | generation table | Confirm the 2022–2024 RS Style Body Kit sits on `/cars/suzuki-swift-2018-2024`. |
| `/cars/suzuki-liana-2006-2014` | intro | Do you sell Liana spare parts (bumpers, windscreens, back light covers)? |
| `/car-heads-up-display-hud` | HUD fitment H2 | Is an OBD port required, or is a power source enough for older cars? |

## Fitment / year conflicts (not guessed)

| Page | Conflict |
|---|---|
| `/toyota-corolla-2012-top-ac-panel` | Compatibility table says 2009–14; description says 2008–2013; Fitment section says 2012. H1 updated to include 2008–2013 wording only; years still need one owner truth. |
| `/toyota-corolla-airflow-ambient-led-ac-vent-trims-plug-and-play` | Table says 2014–2026; body text says 2014–2024. Care section added; years not changed. |
| `/toyota-aqua-2012-2015-complete-body-kit` | Compatibility table said 2012–26 while FAQ said 2012–2015. Apply script rewrites 2012–26 → 2012–2015 in long description when present; confirm vehicleCompatibility rows in admin. |

## Redirects awaiting approval

See `SEO_REDIRECT_REVIEW.md` (5 product fallbacks + honda-city / car-emergency-safety collections).

## Honda City gear knob rename

**Live slug:** `honda-city-2021-2026-carbon-fiber-gear-knob`  
Applied on production: name → “Honda City Carbon Fiber Gear Knob Cover 2021–2026”.
