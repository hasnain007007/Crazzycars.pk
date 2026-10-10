# SEO TODO for owner (Search Console audit, 10 Oct 2026)

Do not publish bracketed copy. Decide each item, then we can apply.

## Category: LED Headlights & Bulbs

**Page:** `/categories/led-headlights-bulbs`  
**Status:** Restored on the wire to `LED Headlights & Bulbs | Crazzycars.pk` via `CATEGORY_SEO_OWNER_LOCKED` (excluded from GSC apply). Production Mongo still has a divergent row (`LED Headlights Price in Pakistan`) — that was **not** from `CATEGORY_KEYWORD_META` in the audit commit; code now ignores DB SEO for this slug until you decide.

> The category is titled "LED Headlights & Bulbs" and the meta promises "plug-and-play LED headlight bulbs", but no LED headlight bulb is listed. Do you stock LED bulbs? If yes, add them to the category. If no, apply: title "Projector Headlights & LED Fog Lights Pakistan | CrazzyCars", meta "Corolla Nike style projector headlights, OSRAM 3-colour projector lights and H11 switchback LED fog lights. Fitment on every listing. COD on eligible items."

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
Code already shows H1/name as “Honda City Carbon Fiber Gear Knob Cover 2021–2026” via `PRODUCT_NAME_OVERRIDES`. The Mongo URI used for dry-run did not contain that product document — confirm the rename is written when you run apply against the live catalogue.
