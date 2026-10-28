# D1 — R4 restore dry-run (NO APPLY)

**When:** 2026-10-28T22:46:42Z
**GRANTED:** empty → dry-run only. Token needed: `R4`.
**Fingerprint for later write:** `84143ac0cb2c3085` (never Atlas `317ae4de8eb24f84`).
**Best source:** Mac `crazzycars_local_real` (:27028) + `backups/seo-2026-10-apply/` for SEO text (not used in D1 inserts).

## Live baseline

| Collection | Count |
|------------|------:|
| products | 410 |
| blogs | 18 |
| categories | 84 |
| vehicles | 68 |
| orders | 603 |
| customers | 342 |

## Pre-checks (a)–(e)

### (a) Insert-only; door-handle clash
- Missing blogs by slug+_id: **20** insert-ok.
- Missing products by slug+_id: **20** active car-ish (plus more inactive skipped).
- Door-handle: live `_id` `6aca877d…` (Set of 4 @ Rs. 5,999 already live) vs source `_id` `6aca8810…` → **SKIP insert**; do not undo live.

### (b) Blog images
- Featured image HTTP 200 today: **8 / 20**.
- Featured 404 needing remap to own-site product photo before publish: **12**.
- Method on apply: same as BLOG-IMAGES (slug/topic → matching `/media/products/…` that already 200; never competitor; never overwrite media files).

### (c) Products → draft only
- Active missing with main image 200: **1**.
- Active missing with image 404: **19**.
- On apply: insert **all** as `status: "draft"` / inactive; not in sitemap; not published until owner photos exist.

### (d) Demo / test
- No demo|test|sample|placeholder|profit among insert candidates.

### (e) Slug / SEO gate for blogs
- Live `/blogs/{slug}` currently 404 for missing set (no URL collision); confirm no DELETED_URL_REDIRECTS source on apply.
- Titles >60 chars today: **20 / 20** → must shorten ≤60 before insert.
- Meta 140–155, one H1, ≥3 internal links to existing pages: enforce on apply (rewrite if source fails).

## Planned ops when `GRANTED: R4` (after fresh mongodump + scratch restore-test)

| Op | Count | Notes |
|----|------:|-------|
| insert blogposts | 20 | Remap featured 404s; shorten titles; gate meta/H1/links |
| insert products | 20 | **draft only**; skip door-handle clash |
| publish products | 0 | blocked until media 200 |

## Missing blogs

| slug | titleLen | featured |
|------|---------:|----------|
| `honda-civic-11th-gen-carbon-fiber-interior-kit-pakistan-guide` | 91 | 404 `https://crazzycars.pk/media/blogs/crazzycars-pk-blog-honda-c` |
| `toyota-corolla-rgb-bumper-neon-mirror-lights-pakistan` | 100 | 404 `https://crazzycars.pk/media/blogs/crazzycars-pk-blog-toyota-` |
| `batman-style-side-mirror-covers-pakistan-fitment-guide` | 89 | 404 `https://crazzycars.pk/media/blogs/crazzycars-pk-blog-batman-` |
| `trunk-lip-spoiler-buying-guide-pakistan-alsvin-city-corolla` | 77 | 404 `https://crazzycars.pk/media/blogs/crazzycars-pk-blog-trunk-l` |
| `honda-city-2021-2026-carbon-interior-upgrades-pakistan` | 83 | 404 `https://crazzycars.pk/media/blogs/crazzycars-pk-blog-honda-c` |
| `car-door-welcome-logo-lights-pakistan-guide` | 82 | 404 `https://crazzycars.pk/media/blogs/crazzycars-pk-blog-car-doo` |
| `push-start-cover-carbon-key-fob-accessories-pakistan` | 83 | 404 `https://crazzycars.pk/media/blogs/crazzycars-pk-blog-push-st` |
| `suzuki-swift-carbon-door-handle-covers-pakistan` | 86 | 404 `https://crazzycars.pk/media/blogs/crazzycars-pk-blog-suzuki-` |
| `cabin-mood-lighting-usb-atmosphere-digital-eyes-pakistan` | 81 | 404 `https://crazzycars.pk/media/blogs/crazzycars-pk-blog-cabin-m` |
| `match-year-variant-order-car-accessories-online-pakistan` | 78 | 404 `https://crazzycars.pk/media/blogs/crazzycars-pk-blog-match-y` |
| `abs-vs-real-carbon-fiber-car-accessories-pakistan` | 84 | 200 `https://crazzycars.pk/media/products/honda-city-2020-2026-ca` |
| `car-accessories-returns-wrong-item-pakistan-crazzycars` | 84 | 200 `https://crazzycars.pk/media/products/honda-city-2020-2026-ca` |
| `crazzycars-delivery-charges-regular-vs-bulky-pakistan` | 71 | 404 `https://crazzycars.pk/media/products/universal-front-splitte` |
| `front-splitters-side-skirts-buying-guide-pakistan` | 87 | 200 `https://crazzycars.pk/media/products/universal-front-splitte` |
| `quarter-window-louvers-civic-corolla-fitment-pakistan` | 77 | 200 `https://crazzycars.pk/media/products/honda-civic-reborn-2006` |
| `door-handle-covers-buying-guide-pakistan-city-civic-corolla` | 62 | 200 `https://crazzycars.pk/media/products/honda-city-2020-2026-ca` |
| `key-covers-key-chains-match-buttons-pakistan` | 71 | 404 `https://crazzycars.pk/media/products/honda-civic-2022-2026-c` |
| `dashboard-mats-pakistan-sun-glare-buying-guide` | 67 | 200 `https://crazzycars.pk/media/products/toyota-corolla-2014-202` |
| `car-air-press-window-visors-fitment-pakistan` | 72 | 200 `https://crazzycars.pk/media/products/toyota-corolla-2008-201` |
| `car-chargers-air-compressors-roadside-pakistan` | 70 | 200 `https://crazzycars.pk/media/products/4-in-1-45w-fast-car-cha` |

## Active missing products (draft on apply)

| slug | main image live |
|------|-----------------|
| `universal-car-anti-rust-door-lock-cover-premium-protection-cap` | 200 |
| `honda-civic-11th-gen-2022-2026-carbon-gear-shift-knob-cover` | 404/missing |
| `honda-civic-2022-2026-carbon-fiber-key-fob-cover-5-button` | 404/missing |
| `honda-civic-11th-gen-2022-2026-carbon-window-control-armrest-cover` | 404/missing |
| `honda-civic-11th-gen-2022-2026-carbon-center-console-gear-shift-panel` | 404/missing |
| `honda-civic-11th-gen-2022-2026-carbon-steering-wheel-decorative-trim` | 404/missing |
| `honda-civic-11th-gen-2022-2026-carbon-dashboard-trims-2pcs` | 404/missing |
| `honda-city-new-model-complete-interior-carbon-fiber-trim-set` | 404/missing |
| `honda-civic-reborn-2006-2011-carbon-fiber-steering-trim` | 404/missing |
| `honda-city-2021-2026-carbon-fiber-steering-trim` | 404/missing |
| `honda-city-2021-2026-carbon-fiber-gear-knob` | 404/missing |
| `honda-city-2009-2018-interior-carbon-fiber-trims` | 404/missing |
| `honda-city-2009-2021-complete-interior-carbon-fiber-trim-set` | 404/missing |
| `2-in-1-microfiber-towels-ultra-thick-40x40cm` | 404/missing |
| `carbon-fiber-push-start-cover-for-cars` | 404/missing |
| `mg-logo-seat-belt-clip-2pcs` | 404/missing |
| `x-perfume-card-pack-car-interior-hanging-fragrance` | 404/missing |
| `lion-style-car-perfume` | 404/missing |
| `usb-car-roof-star-night-light-galaxy-projector` | 404/missing |
| `universal-lime-green-fog-light-led-h11-pair` | 404/missing |

## Rollback (when applied)

```bash
# Preferred: mongorestore pre-flight archive for blogposts+products only (never orders/customers)
# docker exec sialkot-mongo mongorestore --archive=/backup/db-finish-r4-<STAMP>.archive \
#   --nsInclude='sialkot_motorsports.blogposts' --nsInclude='sialkot_motorsports.products' --drop
# Or delete insert-only docs by recorded _id list (owner-approved deletes only).
```

## APPLY STATUS

**BLOCKED — GRANTED does not include R4.** Dry-run only; live counts unchanged (410p / 18b).

## Before → after (this step)

410p / 18b → **unchanged** (dry-run). Expected when granted: blogs 18→38; products 410→430 with ~20 drafts.
