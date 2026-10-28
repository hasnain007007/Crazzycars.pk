# Empty / 404 main images — dry-run (stop for GO EMPTY-IMAGES)

**Branch:** `fix/empty-main-images-1029`  
**Fingerprint for later write:** `84143ac0cb2c3085`  
**Live scan:** 410 products; **65** with empty `media.images`; **0** with non-empty main returning 404.

**Counts:** promote from own media **15** · needs photo / hide-noindex **50**

Rules: promote only slug-matching files on `/media/products` (or m5 known same-product path). Never competitor sites. Never cross-SKU fuzzy matches.

## A. Propose promote main (`$set media.images` to working path)

| slug | name | gallery 200 | disk / recovery | proposed main |
|------|------|-------------|-----------------|---------------|
| `toyota-mark-x-duck-tail-spoiler-2004-2009` | Toyota Mark X Duck tail Spoiler 2004-2009 | (empty) | recovery/m5 known same-product file | `/media/products/mark-x-spoiler-unpainted-abs-2004-2009-1-d6f806266f.webp` |
| `honda-city-rgb-side-mirror-indicator-led-dynamic-mirror-lights` | Honda City RGB Side Mirror Indicator (LED Dynamic  | (empty) | honda-city-rgb-side-mirror-indicator-led-dynamic-mirror-lights-1-3ff0543e9e.webp | `/media/products/honda-city-rgb-side-mirror-indicator-led-dynamic-mirror-lights-1-3ff0543e9e.webp` |
| `civic-rebirth-side-mirror-rgb-indicator` | Civic Rebirth Side Mirror RGB Indicator | (empty) | civic-rebirth-side-mirror-rgb-indicator-1-51db570844.webp | `/media/products/civic-rebirth-side-mirror-rgb-indicator-1-51db570844.webp` |
| `honda-civic-reborn-mugen-rr-rear-trunk-spoiler-2007-2011` | Honda Civic Reborn 2007-2011 Mugen RR Rear Trunk S | (empty) | honda-civic-reborn-mugen-rr-rear-trunk-spoiler-2007-2011-1-a8c2f9b7b3.webp, hond | `/media/products/honda-civic-reborn-mugen-rr-rear-trunk-spoiler-2007-2011-1-a8c2f9b7b3.webp` |
| `honda-civic-2001-2005-rear-trunk-spoiler-unpainted-abs` | Honda Civic 2001-2005 Rear Trunk Spoiler Unpainted | (empty) | honda-civic-2001-2005-rear-trunk-spoiler-unpainted-abs-1-b7d45c956c.webp | `/media/products/honda-civic-2001-2005-rear-trunk-spoiler-unpainted-abs-1-b7d45c956c.webp` |
| `honda-civic-x-2016-2021-rear-bumper-diffuser-gloss-black-led` | Honda Civic X 2016-2021 Rear Bumper Diffuser Gloss | (empty) | honda-civic-x-2016-2021-rear-bumper-diffuser-gloss-black-led-1-40d703b73e.webp | `/media/products/honda-civic-x-2016-2021-rear-bumper-diffuser-gloss-black-led-1-40d703b73e.webp` |
| `toyota-corolla-2008-2010-diamond-style-chrome-front-grille` | Toyota Corolla 2008-2010 Diamond Style Chrome Fron | (empty) | recovery/m5 known same-product file | `/media/products/toyota-corolla-2008-2011-front-chrome-grilles-set-unpainted-steel-1-3d2a57629c.webp` |
| `toyota-corolla-2008-2011-front-chrome-grilles-set-unpainted-steel` | Toyota Corolla 2008-2011 Front Chrome Grilles Set  | (empty) | toyota-corolla-2008-2011-front-chrome-grilles-set-unpainted-steel-1-3d2a57629c.w | `/media/products/toyota-corolla-2008-2011-front-chrome-grilles-set-unpainted-steel-1-3d2a57629c.webp` |
| `honda-vezel-2013-2018-rear-bumper-brake-lamp` | Honda Vezel 2013-2018 Rear Bumper Brake Lamp | (empty) | honda-vezel-2013-2018-rear-bumper-brake-lamp-1-d008aef3cf.webp, honda-vezel-2013 | `/media/products/honda-vezel-2013-2018-rear-bumper-brake-lamp-1-d008aef3cf.webp` |
| `honda-vezel-2013-2018-pvc-trunk-mat` | Honda Vezel 2013-2018 PVC Trunk Mat | (empty) | honda-vezel-2013-2018-pvc-trunk-mat-1-23f7a55b1e.webp | `/media/products/honda-vezel-2013-2018-pvc-trunk-mat-1-23f7a55b1e.webp` |
| `toyota-corolla-e120-dynamic-back-bumper-light-rgb-2002-2008` | Toyota Corolla E120 Dynamic Back Bumper Light RGB  | (empty) | toyota-corolla-e120-dynamic-back-bumper-light-rgb-2002-2008-1-1788716245714-fe98 | `/media/products/toyota-corolla-e120-dynamic-back-bumper-light-rgb-2002-2008-1-1788716245714-fe98e93f.webp` |
| `toyota-corolla-2014-2026-side-mirror-led-indicators` | Toyota Corolla 2014-2026 Side Mirror LED Indicator | (empty) | toyota-corolla-2014-2026-side-mirror-led-indicators-1-6d7faec0c5.webp, toyota-co | `/media/products/toyota-corolla-2014-2026-side-mirror-led-indicators-5-32aa522429.webp` |
| `car-door-welcome-logo-lights` | Car Door Welcome Logo Lights – Bright LED Projecti | (empty) | car-door-welcome-logo-lights-1-fa56483fee.jpg, car-door-welcome-logo-lights-2-80 | `/media/products/car-door-welcome-logo-lights-1-fa56483fee.jpg` |
| `toyota-corolla-carbon-fiber-dashboard-trim-3pcs-lcd-2014-2026` | Toyota Corolla Carbon Fiber Dashboard Trim 3PCS 20 | (empty) | toyota-corolla-carbon-fiber-dashboard-trim-3pcs-lcd-2014-2026-1-nologo-04518dd4f | `/media/products/toyota-corolla-carbon-fiber-dashboard-trim-3pcs-lcd-2014-2026-1-nologo-04518dd4fc.webp` |
| `toyota-corolla-carbon-fiber-interior-door-panels-4pcs-2014-2026` | Toyota Corolla Carbon Fiber Interior Door Panels 4 | (empty) | toyota-corolla-carbon-fiber-interior-door-panels-4pcs-2014-2026-1-819c0d9322.web | `/media/products/toyota-corolla-carbon-fiber-interior-door-panels-4pcs-2014-2026-1-819c0d9322.webp` |

### Proposed `$set` (apply only after `GO EMPTY-IMAGES`)

```js
// toyota-mark-x-duck-tail-spoiler-2004-2009
db.products.updateOne({slug:"toyota-mark-x-duck-tail-spoiler-2004-2009"},{$set:{"media.images":[{url:"/media/products/mark-x-spoiler-unpainted-abs-2004-2009-1-d6f806266f.webp",isMain:true,alt:"Toyota Mark X Duck tail Spoiler 2004-2009"}]}});
// honda-city-rgb-side-mirror-indicator-led-dynamic-mirror-lights
db.products.updateOne({slug:"honda-city-rgb-side-mirror-indicator-led-dynamic-mirror-lights"},{$set:{"media.images":[{url:"/media/products/honda-city-rgb-side-mirror-indicator-led-dynamic-mirror-lights-1-3ff0543e9e.webp",isMain:true,alt:"Honda City RGB Side Mirror Indicator (LED Dynamic Mirror Lights)"}]}});
// civic-rebirth-side-mirror-rgb-indicator
db.products.updateOne({slug:"civic-rebirth-side-mirror-rgb-indicator"},{$set:{"media.images":[{url:"/media/products/civic-rebirth-side-mirror-rgb-indicator-1-51db570844.webp",isMain:true,alt:"Civic Rebirth Side Mirror RGB Indicator"}]}});
// honda-civic-reborn-mugen-rr-rear-trunk-spoiler-2007-2011
db.products.updateOne({slug:"honda-civic-reborn-mugen-rr-rear-trunk-spoiler-2007-2011"},{$set:{"media.images":[{url:"/media/products/honda-civic-reborn-mugen-rr-rear-trunk-spoiler-2007-2011-1-a8c2f9b7b3.webp",isMain:true,alt:"Honda Civic Reborn 2007-2011 Mugen RR Rear Trunk Spoiler Unpainted ABS"}]}});
// honda-civic-2001-2005-rear-trunk-spoiler-unpainted-abs
db.products.updateOne({slug:"honda-civic-2001-2005-rear-trunk-spoiler-unpainted-abs"},{$set:{"media.images":[{url:"/media/products/honda-civic-2001-2005-rear-trunk-spoiler-unpainted-abs-1-b7d45c956c.webp",isMain:true,alt:"Honda Civic 2001-2005 Rear Trunk Spoiler Unpainted ABS"}]}});
// honda-civic-x-2016-2021-rear-bumper-diffuser-gloss-black-led
db.products.updateOne({slug:"honda-civic-x-2016-2021-rear-bumper-diffuser-gloss-black-led"},{$set:{"media.images":[{url:"/media/products/honda-civic-x-2016-2021-rear-bumper-diffuser-gloss-black-led-1-40d703b73e.webp",isMain:true,alt:"Honda Civic X 2016-2021 Rear Bumper Diffuser Gloss Black with LED"}]}});
// toyota-corolla-2008-2010-diamond-style-chrome-front-grille
db.products.updateOne({slug:"toyota-corolla-2008-2010-diamond-style-chrome-front-grille"},{$set:{"media.images":[{url:"/media/products/toyota-corolla-2008-2011-front-chrome-grilles-set-unpainted-steel-1-3d2a57629c.webp",isMain:true,alt:"Toyota Corolla 2008-2010 Diamond Style Chrome Front Grille ABS"}]}});
// toyota-corolla-2008-2011-front-chrome-grilles-set-unpainted-steel
db.products.updateOne({slug:"toyota-corolla-2008-2011-front-chrome-grilles-set-unpainted-steel"},{$set:{"media.images":[{url:"/media/products/toyota-corolla-2008-2011-front-chrome-grilles-set-unpainted-steel-1-3d2a57629c.webp",isMain:true,alt:"Toyota Corolla 2008-2011 Front Chrome Grilles Set Unpainted Steel"}]}});
// honda-vezel-2013-2018-rear-bumper-brake-lamp
db.products.updateOne({slug:"honda-vezel-2013-2018-rear-bumper-brake-lamp"},{$set:{"media.images":[{url:"/media/products/honda-vezel-2013-2018-rear-bumper-brake-lamp-1-d008aef3cf.webp",isMain:true,alt:"Honda Vezel 2013-2018 Rear Bumper Brake Lamp"}]}});
// honda-vezel-2013-2018-pvc-trunk-mat
db.products.updateOne({slug:"honda-vezel-2013-2018-pvc-trunk-mat"},{$set:{"media.images":[{url:"/media/products/honda-vezel-2013-2018-pvc-trunk-mat-1-23f7a55b1e.webp",isMain:true,alt:"Honda Vezel 2013-2018 PVC Trunk Mat"}]}});
// toyota-corolla-e120-dynamic-back-bumper-light-rgb-2002-2008
db.products.updateOne({slug:"toyota-corolla-e120-dynamic-back-bumper-light-rgb-2002-2008"},{$set:{"media.images":[{url:"/media/products/toyota-corolla-e120-dynamic-back-bumper-light-rgb-2002-2008-1-1788716245714-fe98e93f.webp",isMain:true,alt:"Toyota Corolla E120 Dynamic Back Bumper Light RGB 2002-2008"}]}});
// toyota-corolla-2014-2026-side-mirror-led-indicators
db.products.updateOne({slug:"toyota-corolla-2014-2026-side-mirror-led-indicators"},{$set:{"media.images":[{url:"/media/products/toyota-corolla-2014-2026-side-mirror-led-indicators-5-32aa522429.webp",isMain:true,alt:"Toyota Corolla 2014-2026 Side Mirror LED Indicators"}]}});
// car-door-welcome-logo-lights
db.products.updateOne({slug:"car-door-welcome-logo-lights"},{$set:{"media.images":[{url:"/media/products/car-door-welcome-logo-lights-1-fa56483fee.jpg",isMain:true,alt:"Car Door Welcome Logo Lights \u2013 Bright LED Projection"}]}});
// toyota-corolla-carbon-fiber-dashboard-trim-3pcs-lcd-2014-2026
db.products.updateOne({slug:"toyota-corolla-carbon-fiber-dashboard-trim-3pcs-lcd-2014-2026"},{$set:{"media.images":[{url:"/media/products/toyota-corolla-carbon-fiber-dashboard-trim-3pcs-lcd-2014-2026-1-nologo-04518dd4fc.webp",isMain:true,alt:"Toyota Corolla Carbon Fiber Dashboard Trim 3PCS 2014\u20132026 (L/R + LCD)"}]}});
// toyota-corolla-carbon-fiber-interior-door-panels-4pcs-2014-2026
db.products.updateOne({slug:"toyota-corolla-carbon-fiber-interior-door-panels-4pcs-2014-2026"},{$set:{"media.images":[{url:"/media/products/toyota-corolla-carbon-fiber-interior-door-panels-4pcs-2014-2026-1-819c0d9322.webp",isMain:true,alt:"Toyota Corolla Carbon Fiber Interior Door Panels 4PCS 2014\u20132026"}]}});
```

## B. Needs photo from owner — propose hide from sitemap/category (noindex, not deleted)

| slug | name | gallery 200 | disk match |
|------|------|-------------|------------|
| `suzuki-swift-2018-2024-complete-body-kit-fibreglass-crazzycars-pk` | Suzuki Swift 2018-2024 Complete Body Kit Fibreglass | — | none |
| `honda-civic-reborn-2006-2011-body-kit-d4-crazzycars-pk` | Honda Civic Reborn 2006-2011 Body Kit D4 | — | none |
| `honda-civic-reborn-2006-2011-body-kit-d1-crazzycars-pk` | Honda Civic Reborn 2006-2011 Body Kit D1 | — | none |
| `toyota-corolla-2014-2026-sequential-side-mirror-indicators` | Toyota Corolla 2014-2026 Side Mirror Sequential LED Ind | — | none |
| `kia-sportage-awd-premium-metal-key-cover` | KIA Sportage AWD Premium Metal Key Cover | — | none |
| `honda-civic-3-button-premium-metal-key-cover` | Honda Civic 3 Button Premium Metal Key Cover | — | none |
| `honda-civic-4-button-premium-metal-key-cover` | Honda Civic 4 Button Premium Metal Key Cover | — | none |
| `honda-city-2022-3-button-premium-metal-key-cover` | Honda CITY 2022 3 Button Premium Metal Key Cover | — | none |
| `honda-civic-2022-premium-metal-key-cover` | Honda Civic 2022 Premium Metal Key Cover | — | none |
| `honda-vezel-premium-metal-key-cover` | Honda Vezel 2013-2026 Premium Metal Key Cover | — | none |
| `honda-brv-premium-metal-key-cover` | Honda BRV Premium Metal Key Cover | — | none |
| `honda-civic-rebirth-premium-metal-key-cover` | Honda Rebirth Premium Metal Key Cover | — | none |
| `toyota-corolla-grande-premium-metal-key-cover` | Toyota Corolla Grande NEW Premium Metal Key Cover | — | none |
| `toyota-fortuner-3-button-premium-metal-key-cover` | Toyota Fortuner 3 Button Premium Metal Key Cover | — | none |
| `toyota-fortuner-4-button-premium-metal-key-cover` | Toyota Fortuner 4 Button Premium Metal Key Cover | — | none |
| `toyota-prado-premium-metal-key-cover` | Toyota Prado Premium Metal Key Cover | — | none |
| `toyota-yaris-premium-metal-key-cover` | Toyota Yaris Premium Metal Key Cover | — | none |
| `toyota-prius-premium-metal-key-cover` | Toyota Prius NEW Premium Metal Key Cover | — | none |
| `kia-sportage-alpha-premium-metal-key-cover` | KIA Sportage Alpha 3 Button Premium Metal Key Cover | — | none |
| `kia-sorento-3-button-premium-metal-key-cover` | KIA Sorento 3 Button Premium Metal Key Cover | — | none |
| `kia-stonic-3-button-premium-metal-key-cover` | KIA Stonic 3 Button Premium Metal Key Cover | — | none |
| `hyundai-tucson-premium-metal-key-cover` | Hyundai Tucson Premium Metal Key Cover | — | none |
| `hyundai-elantra-premium-metal-key-cover` | Hyundai Elantra Premium Metal Key Cover | — | none |
| `hyundai-sonata-premium-metal-key-cover` | Hyundai Sonata Premium Metal Key Cover | — | none |
| `mg-hs-premium-metal-key-cover` | MG HS Premium Metal Key Cover | — | none |
| `changan-alsvin-premium-metal-key-cover` | Changan Alsvin Premium Metal Key Cover | — | none |
| `oshan-x7-premium-metal-key-cover` | Changan Oshan X7 Premium Metal Key Cover | — | none |
| `audi-a4-premium-metal-key-cover` | Audi A4 Premium Metal Key Cover | — | none |
| `audi-a5-premium-metal-key-cover` | Audi A5 Premium Metal Key Cover | — | none |
| `mercedes-benz-e260-premium-metal-key-cover` | Mercedes BENZ E260 Premium Metal Key Cover | — | none |
| `mercedes-benz-e-class-premium-metal-key-cover` | Mercedes Benz E Class Premium Metal Key Cover | — | none |
| `glory-580-pro-premium-metal-key-cover` | Glory 580 PRO Premium Metal Key Cover | — | none |
| `haval-h6-premium-metal-key-cover` | Haval H6 Premium Metal Key Cover | — | none |
| `nissan-note-premium-metal-key-cover` | Nissan NOTE Premium Metal Key Cover | — | none |
| `baic-bj40-premium-metal-key-cover` | BAIC BJ40 Premium Metal Key Cover | — | none |
| `chery-tiggo-8-pro-premium-metal-key-cover` | Cherry Tiggo 8 PRO Premium Metal Key Cover | — | none |
| `chery-tiggo-4-pro-premium-metal-key-cover` | Cherry Tiggo 4 PRO Premium Metal Key Cover | — | none |
| `proton-x70-premium-metal-key-cover` | Proton X70 Premium Metal Key Cover | — | none |
| `suzuki-swift-premium-metal-key-cover` | Suzuki Swift Premium Metal Key Cover | — | none |
| `honda-city-2009-2021-premium-metal-key-cover` | Honda CITY 2009-2021 Premium Metal Key Cover | — | none |
| `honda-city-2009-2020-premium-metal-key-cover` | Honda CITY 2009-2020 Premium Metal Key Cover | — | none |
| `suzuki-alto-premium-metal-key-cover` | Suzuki ALTO NEW Premium Metal Key Cover | — | none |
| `universal-car-led-reflector-bumper-side-marker-light` | Universal Car LED Reflector Bumper Side Marker Light | — | none |
| `toyota-prius-2012-quarter-glass-louvers-carbon-fiber` | Toyota Prius 2012 Quarter Glass Louvers Carbon Fiber La | — | none |
| `universal-car-digital-eyes-led-panel-lights` | Universal Car Digital Eyes LED Panel Lights | — | none |
| `toyota-corolla-x-dynamic-back-bumper-light-rgb-2022-2023` | Toyota Corolla X Dynamic Back Bumper Light RGB 2022-202 | — | none |
| `toyota-corolla-2002-2008-black-abs-mesh-grill` | Toyota Corolla 2002-2008 Black ABS Mesh Grill | — | none |
| `suzuki-alto-2019-2026-premium-air-press-without-chrome` | Suzuki Alto 2019-2026 Premium Air Press Without Chrome | — | none |
| `sogo-universal-car-grass-floor-mats-in-roll-custom-fitting-premium-quality-1` | SOGO Universal Car Grass Floor Mats In Roll Custom Fitt | — | none |
| `universal-usb-car-humidifier-atmosphere-light-laser-roof-light` | Universal USB Car Humidifier with Atmosphere Light & La | — | none |

### Proposed hide (no delete)
- `$set` flags such as `seo.robots` / `excludeFromSitemap` / listing hide (confirm schema at GO); **not** deleted.
- Keep PDP URL for direct links; omit from sitemap + category grids.
- Mostly premium metal key covers + body kits / universal SKUs without files.

## STOP

Awaiting exact message: **`GO EMPTY-IMAGES`**
