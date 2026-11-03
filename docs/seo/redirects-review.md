# Legacy redirects — owner review (Task 2, 4 Nov 2026)

Review / none rows live in `storecraft-store/data/seo/legacy-redirects-review.json` with `enabled: false`. **Do not enable without owner sign-off.**

## Disputed rows resolved in `legacy-redirects.json` (sign-off)

| From | CSV | Choice | Why |
|------|-----|--------|-----|
| `/collections/carbon-fiber-car-accessories-shop-online-crazzycars-pk` | `/categories/carbon-fiber-accessories` | **LIVE** `/categories/carbon-fiber` | Both 200; carbon-fiber is the live category in use. |
| `/products/toyota-corolla-2014-2026-sequential-side-mirror-indicators` | `/toyota-corolla-2008-2013-sequential-side-mirror-indicators` | **LIVE** `/toyota-corolla-2014-2026-side-mirror-led-indicators` | Year range matches the old URL. |
| `/products/reverse-bright-light-bulb-24-smd-led-w16w-t15-crazzycars-pk` | `/…-t15-4-pack` | **CSV** 4-pack | Live short slug 308s to the same 4-pack (one hop). |
| `/products/toyota-corolla-2017-2020-led-side-mirror-sequential-indicator-pair-crazzycars-pk` | neon-indicator-pair | **CSV** `/toyota-corolla-2015-2026-led-side-mirror-neon-indicator-pair` | Live neon-style-indicator was **404**. |
| `/products/toyota-corolla-2015-2026-rgb-side-mirror-indicator-dragon-style-crazzycars-pk` | 2009–2014 dragon | **CSV** dragon 2009–2014 | Live flat slug 308s to LED indicators (wrong family). |

## Review rows (disabled)

See JSON for the full list (~70). Rules applied:

- Live `/blogs/<slug>` returning **200** → leave as-is (no redirect).
- `/blogs/...` **404** → propose closest blog or 410 after owner.
- Collection rows where live ≠ CSV → keep live mapping via existing `collectionRedirectMap` until confirmed.
- `/products`, `/blogs`, `/collections` indexes → already handled; not enabled in the exact map as new behaviour.

## Enabling a review row

1. Confirm target returns 200 and is active.
2. Move the row into `legacy-redirects.json` (or set `enabled: true` and extend the loader).
3. Re-run `__tests__/legacy-redirects.test.mjs` and `npm run seo:check-redirects`.
