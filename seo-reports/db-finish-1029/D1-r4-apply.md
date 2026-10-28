# D1 — R4 APPLY report

**When:** 2026-10-28T23:15:13Z  
**GRANTED:** `R4`  
**Fingerprint:** `84143ac0cb2c3085`  
**Dump:** `/data/crazzycars-mongo-backups/db-finish-r4-20261028T230513Z/sialkot_motorsports.archive.gz`  
**Scratch restore-test:** OK (p410/b18/o603/c342 matched live before write)

## Counts

| Collection | Before | After |
|------------|-------:|------:|
| products | 410 | 430 |
| blogposts | 18 | 38 |
| blogposts published | 18 | 32 (18 prior + **14** new) |
| blogposts draft (held) | — | **6** new held until photos |
| orders | 603 | 603 |
| customers | 342 | 342 |

## Published (14)

- `batman-style-side-mirror-covers-pakistan-fitment-guide` title=44 meta=147 remap=`/media/products/deepal-s05-batman-style-side-mirror-covers-1-3b77ae3d91.webp`
- `abs-vs-real-carbon-fiber-car-accessories-pakistan` title=45 meta=146
- `car-accessories-returns-wrong-item-pakistan-crazzycars` title=43 meta=142
- `car-air-press-window-visors-fitment-pakistan` title=41 meta=141
- `car-chargers-air-compressors-roadside-pakistan` title=45 meta=144
- `car-door-welcome-logo-lights-pakistan-guide` title=45 meta=148 remap=`/media/products/car-door-welcome-logo-lights-1-fa56483fee.jpg`
- `crazzycars-delivery-charges-regular-vs-bulky-pakistan` title=39 meta=141 remap=`/media/products/deal-5-complete-body-kit-deal-front-splitter-side-skirts-back-bumper-lip-1-09a75b4213.webp`
- `dashboard-mats-pakistan-sun-glare-buying-guide` title=45 meta=143
- `door-handle-covers-buying-guide-pakistan-city-civic-corolla` title=44 meta=145
- `front-splitters-side-skirts-buying-guide-pakistan` title=42 meta=142
- `quarter-window-louvers-civic-corolla-fitment-pakistan` title=43 meta=140
- `suzuki-swift-carbon-door-handle-covers-pakistan` title=44 meta=144 remap=`/media/products/suzuki-swift-2022-2025-carbon-fiber-door-handles-cover-1-33c6b8cd63.webp`
- `toyota-corolla-rgb-bumper-neon-mirror-lights-pakistan` title=45 meta=146 remap=`/media/products/toyota-corolla-2015-2026-led-side-mirror-neon-indicator-pair-1-21fb988ce1.webp`
- `trunk-lip-spoiler-buying-guide-pakistan-alsvin-city-corolla` title=46 meta=144 remap=`/media/products/honda-city-new-model-trunk-lip-spoiler-2021-2026-1-3a3370e574.webp`

## Held until photos (6)

- `honda-civic-11th-gen-carbon-fiber-interior-kit-pakistan-guide` — depends_draft_or_photoless, held_until_photos; named_bad=['/2-in-1-microfiber-towels-ultra-thick-40x40cm', '/honda-civic-11th-gen-2022-2026-carbon-center-console-gear-shift-panel', '/honda-civic-11th-gen-2022-2026-carbon-dashboard-trims-2pcs', '/honda-civic-11th-gen-2022-2026-carbon-gear-shift-knob-cover']
- `honda-city-2021-2026-carbon-interior-upgrades-pakistan` — depends_draft_or_photoless, held_until_photos; named_bad=['/honda-city-2021-2026-carbon-fiber-gear-knob', '/honda-city-2021-2026-carbon-fiber-steering-trim', '/honda-city-new-model-complete-interior-carbon-fiber-trim-set', '/products/honda-city-2021-2026-carbon-fiber-gear-knob']
- `push-start-cover-carbon-key-fob-accessories-pakistan` — depends_draft_or_photoless, held_until_photos; named_bad=['/carbon-fiber-push-start-cover-for-cars', '/honda-civic-11th-gen-2022-2026-carbon-gear-shift-knob-cover', '/honda-civic-2022-2026-carbon-fiber-key-fob-cover-5-button', '/products/carbon-fiber-push-start-cover-for-cars']
- `cabin-mood-lighting-usb-atmosphere-digital-eyes-pakistan` — depends_draft_or_photoless; named_bad=['/products/universal-car-digital-eyes-led-panel-lights', '/products/universal-usb-car-humidifier-atmosphere-light-laser-roof-light']
- `match-year-variant-order-car-accessories-online-pakistan` — depends_draft_or_photoless; named_bad=['/2-in-1-microfiber-towels-ultra-thick-40x40cm', '/products/2-in-1-microfiber-towels-ultra-thick-40x40cm']
- `key-covers-key-chains-match-buttons-pakistan` — depends_draft_or_photoless, held_until_photos; named_bad=['/honda-civic-2022-2026-carbon-fiber-key-fob-cover-5-button']

## Products inserted as draft (20)

All 20 active-in-source missing SKUs inserted with `status: draft`, `seo.excludeFromSitemap/Listings/MerchantFeed=true`, `omitProductSchemaImage=true`, `robots=noindex,follow`. Not in sitemap.

## Batman redirect

`/blogs/news/how-to-install-batman-style-side-mirror-covers-step-by-step-guide` → `/blogs/batman-style-side-mirror-covers-pakistan-fitment-guide` (code in `oldBlogNewsRedirects.mjs`; deploy with this commit).

## Rollback

```bash
# Preferred: restore blogposts+products from pre-R4 archive (does not touch orders/customers if nsInclude limited)
docker exec sialkot-mongo mongorestore --gzip \
  --archive=/backup/db-finish-r4-20261028T230513Z.archive \
  --nsInclude='sialkot_motorsports.blogposts' \
  --nsInclude='sialkot_motorsports.products' --drop
# Or delete insert-only by recorded _id list (owner-approved).
```

Archive also at: `/data/crazzycars-mongo-backups/db-finish-r4-20261028T230513Z/sialkot_motorsports.archive.gz`

## Verify notes

- Published restored posts: HTTP 200, self-canonical, indexable, images 200, in sitemap (14/14).
- Held drafts: HTTP 404 on storefront; absent from sitemap.
- Draft products: absent from sitemap.
- Orders/customers unchanged.
