# EMPTY-IMAGES apply report (REVISED)

**Applied:** 2026-10-28T22:28:51Z
**Branch:** `fix/empty-main-images-1029`
**Fingerprint:** `84143ac0cb2c3085`
**Dump:** `empty-images-20261028T222646Z.archive` (pre-apply)

## Counts

| Action | Count |
|--------|------:|
| A) Promote from gallery (main `$set` only) | 15 |
| B) Placeholder + keep indexed (Photo needed - urgent) | 6 |
| B) Hidden (noindex / exclude sitemap+listings) | 44 |
| Still needing photos (urgent placeholders) | 6 |

Traffic rule: any clicks **or** ≥20 impressions (flat URL + `/products/` URL) → placeholder/urgent; else hide.

## A. Promoted main image (15)

| slug | new main url |
|------|--------------|
| `toyota-mark-x-duck-tail-spoiler-2004-2009` | `/media/products/mark-x-spoiler-unpainted-abs-2004-2009-1-d6f806266f.webp` |
| `honda-city-rgb-side-mirror-indicator-led-dynamic-mirror-lights` | `/media/products/honda-city-rgb-side-mirror-indicator-led-dynamic-mirror-lights-1-3ff0543e9e.webp` |
| `civic-rebirth-side-mirror-rgb-indicator` | `/media/products/civic-rebirth-side-mirror-rgb-indicator-1-51db570844.webp` |
| `honda-civic-reborn-mugen-rr-rear-trunk-spoiler-2007-2011` | `/media/products/honda-civic-reborn-mugen-rr-rear-trunk-spoiler-2007-2011-1-a8c2f9b7b3.webp` |
| `honda-civic-2001-2005-rear-trunk-spoiler-unpainted-abs` | `/media/products/honda-civic-2001-2005-rear-trunk-spoiler-unpainted-abs-1-b7d45c956c.webp` |
| `honda-civic-x-2016-2021-rear-bumper-diffuser-gloss-black-led` | `/media/products/honda-civic-x-2016-2021-rear-bumper-diffuser-gloss-black-led-1-40d703b73e.webp` |
| `toyota-corolla-2008-2010-diamond-style-chrome-front-grille` | `/media/products/toyota-corolla-2008-2011-front-chrome-grilles-set-unpainted-steel-1-3d2a57629c.webp` |
| `toyota-corolla-2008-2011-front-chrome-grilles-set-unpainted-steel` | `/media/products/toyota-corolla-2008-2011-front-chrome-grilles-set-unpainted-steel-1-3d2a57629c.webp` |
| `honda-vezel-2013-2018-rear-bumper-brake-lamp` | `/media/products/honda-vezel-2013-2018-rear-bumper-brake-lamp-1-d008aef3cf.webp` |
| `honda-vezel-2013-2018-pvc-trunk-mat` | `/media/products/honda-vezel-2013-2018-pvc-trunk-mat-1-23f7a55b1e.webp` |
| `toyota-corolla-e120-dynamic-back-bumper-light-rgb-2002-2008` | `/media/products/toyota-corolla-e120-dynamic-back-bumper-light-rgb-2002-2008-1-1788716245714-fe98e93f.webp` |
| `toyota-corolla-2014-2026-side-mirror-led-indicators` | `/media/products/toyota-corolla-2014-2026-side-mirror-led-indicators-5-32aa522429.webp` |
| `car-door-welcome-logo-lights` | `/media/products/car-door-welcome-logo-lights-1-fa56483fee.jpg` |
| `toyota-corolla-carbon-fiber-dashboard-trim-3pcs-lcd-2014-2026` | `/media/products/toyota-corolla-carbon-fiber-dashboard-trim-3pcs-lcd-2014-2026-1-nologo-04518dd4fc.webp` |
| `toyota-corolla-carbon-fiber-interior-door-panels-4pcs-2014-2026` | `/media/products/toyota-corolla-carbon-fiber-interior-door-panels-4pcs-2014-2026-1-819c0d9322.webp` |

## B1. Photo needed - urgent (placeholder, indexed, excluded from Merchant + Product schema image)

| slug | name | clicks | impressions |
|------|------|-------:|------------:|
| `toyota-corolla-2014-2026-sequential-side-mirror-indicators` | Toyota Corolla 2014-2026 Side Mirror Sequential LED Ind | 3 | 28 |
| `glory-580-pro-premium-metal-key-cover` | Glory 580 PRO Premium Metal Key Cover | 2 | 6 |
| `toyota-fortuner-3-button-premium-metal-key-cover` | Toyota Fortuner 3 Button Premium Metal Key Cover | 2 | 5 |
| `honda-city-2009-2020-premium-metal-key-cover` | Honda CITY 2009-2020 Premium Metal Key Cover | 1 | 10 |
| `changan-alsvin-premium-metal-key-cover` | Changan Alsvin Premium Metal Key Cover | 1 | 5 |
| `proton-x70-premium-metal-key-cover` | Proton X70 Premium Metal Key Cover | 1 | 2 |

Flags: `seo.excludeFromMerchantFeed=true`, `seo.omitProductSchemaImage=true`, `media.images[0].isPlaceholder=true` → `/media/products/{slug}-placeholder.webp` (branded neutral, title overlay; no competitor photos).

## B2. Hidden — zero clicks and &lt;20 impressions (44)

| slug | name | clicks | impressions |
|------|------|-------:|------------:|
| `audi-a4-premium-metal-key-cover` | Audi A4 Premium Metal Key Cover | 0 | 1 |
| `audi-a5-premium-metal-key-cover` | Audi A5 Premium Metal Key Cover | 0 | 0 |
| `baic-bj40-premium-metal-key-cover` | BAIC BJ40 Premium Metal Key Cover | 0 | 4 |
| `chery-tiggo-4-pro-premium-metal-key-cover` | Cherry Tiggo 4 PRO Premium Metal Key Cover | 0 | 4 |
| `chery-tiggo-8-pro-premium-metal-key-cover` | Cherry Tiggo 8 PRO Premium Metal Key Cover | 0 | 0 |
| `haval-h6-premium-metal-key-cover` | Haval H6 Premium Metal Key Cover | 0 | 3 |
| `honda-brv-premium-metal-key-cover` | Honda BRV Premium Metal Key Cover | 0 | 0 |
| `honda-city-2009-2021-premium-metal-key-cover` | Honda CITY 2009-2021 Premium Metal Key Cover | 0 | 2 |
| `honda-city-2022-3-button-premium-metal-key-cover` | Honda CITY 2022 3 Button Premium Metal Key Cover | 0 | 0 |
| `honda-civic-2022-premium-metal-key-cover` | Honda Civic 2022 Premium Metal Key Cover | 0 | 0 |
| `honda-civic-3-button-premium-metal-key-cover` | Honda Civic 3 Button Premium Metal Key Cover | 0 | 0 |
| `honda-civic-4-button-premium-metal-key-cover` | Honda Civic 4 Button Premium Metal Key Cover | 0 | 0 |
| `honda-civic-rebirth-premium-metal-key-cover` | Honda Rebirth Premium Metal Key Cover | 0 | 1 |
| `honda-civic-reborn-2006-2011-body-kit-d1-crazzycars-pk` | Honda Civic Reborn 2006-2011 Body Kit D1 | 0 | 1 |
| `honda-civic-reborn-2006-2011-body-kit-d4-crazzycars-pk` | Honda Civic Reborn 2006-2011 Body Kit D4 | 0 | 2 |
| `honda-vezel-premium-metal-key-cover` | Honda Vezel 2013-2026 Premium Metal Key Cover | 0 | 0 |
| `hyundai-elantra-premium-metal-key-cover` | Hyundai Elantra Premium Metal Key Cover | 0 | 0 |
| `hyundai-sonata-premium-metal-key-cover` | Hyundai Sonata Premium Metal Key Cover | 0 | 0 |
| `hyundai-tucson-premium-metal-key-cover` | Hyundai Tucson Premium Metal Key Cover | 0 | 1 |
| `kia-sorento-3-button-premium-metal-key-cover` | KIA Sorento 3 Button Premium Metal Key Cover | 0 | 3 |
| `kia-sportage-alpha-premium-metal-key-cover` | KIA Sportage Alpha 3 Button Premium Metal Key Cover | 0 | 0 |
| `kia-sportage-awd-premium-metal-key-cover` | KIA Sportage AWD Premium Metal Key Cover | 0 | 0 |
| `kia-stonic-3-button-premium-metal-key-cover` | KIA Stonic 3 Button Premium Metal Key Cover | 0 | 2 |
| `mercedes-benz-e-class-premium-metal-key-cover` | Mercedes Benz E Class Premium Metal Key Cover | 0 | 0 |
| `mercedes-benz-e260-premium-metal-key-cover` | Mercedes BENZ E260 Premium Metal Key Cover | 0 | 1 |
| `mg-hs-premium-metal-key-cover` | MG HS Premium Metal Key Cover | 0 | 3 |
| `nissan-note-premium-metal-key-cover` | Nissan NOTE Premium Metal Key Cover | 0 | 1 |
| `oshan-x7-premium-metal-key-cover` | Changan Oshan X7 Premium Metal Key Cover | 0 | 0 |
| `sogo-universal-car-grass-floor-mats-in-roll-custom-fitting-premium-quality-1` | SOGO Universal Car Grass Floor Mats In Roll Custom Fitt | 0 | 0 |
| `suzuki-alto-2019-2026-premium-air-press-without-chrome` | Suzuki Alto 2019-2026 Premium Air Press Without Chrome | 0 | 0 |
| `suzuki-alto-premium-metal-key-cover` | Suzuki ALTO NEW Premium Metal Key Cover | 0 | 1 |
| `suzuki-swift-2018-2024-complete-body-kit-fibreglass-crazzycars-pk` | Suzuki Swift 2018-2024 Complete Body Kit Fibreglass | 0 | 1 |
| `suzuki-swift-premium-metal-key-cover` | Suzuki Swift Premium Metal Key Cover | 0 | 0 |
| `toyota-corolla-2002-2008-black-abs-mesh-grill` | Toyota Corolla 2002-2008 Black ABS Mesh Grill | 0 | 0 |
| `toyota-corolla-grande-premium-metal-key-cover` | Toyota Corolla Grande NEW Premium Metal Key Cover | 0 | 0 |
| `toyota-corolla-x-dynamic-back-bumper-light-rgb-2022-2023` | Toyota Corolla X Dynamic Back Bumper Light RGB 2022-202 | 0 | 1 |
| `toyota-fortuner-4-button-premium-metal-key-cover` | Toyota Fortuner 4 Button Premium Metal Key Cover | 0 | 0 |
| `toyota-prado-premium-metal-key-cover` | Toyota Prado Premium Metal Key Cover | 0 | 2 |
| `toyota-prius-2012-quarter-glass-louvers-carbon-fiber` | Toyota Prius 2012 Quarter Glass Louvers Carbon Fiber La | 0 | 0 |
| `toyota-prius-premium-metal-key-cover` | Toyota Prius NEW Premium Metal Key Cover | 0 | 1 |
| `toyota-yaris-premium-metal-key-cover` | Toyota Yaris Premium Metal Key Cover | 0 | 0 |
| `universal-car-digital-eyes-led-panel-lights` | Universal Car Digital Eyes LED Panel Lights | 0 | 4 |
| `universal-car-led-reflector-bumper-side-marker-light` | Universal Car LED Reflector Bumper Side Marker Light | 0 | 4 |
| `universal-usb-car-humidifier-atmosphere-light-laser-roof-light` | Universal USB Car Humidifier with Atmosphere Light & La | 0 | 2 |

Flags: `seo.robots=noindex,follow`, `seo.excludeFromSitemap=true`, `seo.excludeFromListings=true`. Not deleted.


## Verify

- Dump: `empty-images-20261028T222646Z.archive` before writes
- Store deploy: `crazzycars-store:live` @ `cdc3d4b` (+ schema-image omit hotfix)
- seo-verify: see `seo-verify.txt` (pre-existing hard fails C4–C7,C9,C10,C12,C15; C23 sitemap pass)
- Live crawl: `crawl.md` — promote 14/15 PDP 200 (1 pre-existing 308 to car hub); urgent placeholders 200; hide 38/44 noindex (3 pre-existing 308, 3 already 404); hide absent from sitemap; urgent absent from `/feed/products.xml`
