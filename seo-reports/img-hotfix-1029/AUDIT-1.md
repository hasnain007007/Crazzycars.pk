# AUDIT-1 — img-hotfix-1029 site audit (read-only)

Fingerprint `84143ac0cb2c3085`. GRANTED: (none). No DB writes in this loop.

## H1 status (code + media)
- Persistent volume: host `/data/crazzycars/media` → container `/app/media` (bind mount).
- Generated ~941 `-sm.webp` masters into that volume; marker file survives container recreate.
- Code: PDP/preload/og resolve existing derivative; WatermarkedImage onError fallback; live image `crazzycars-store:live` redeployed.
- H1c Mark X: slugs are `...-unpainted-fiberglass` and `...-glossy-black-abs`. Originals + `-sm` HEAD/GET **200** now (~80KB, perms 1001:1001). Prior 502 not reproduced — likely transient proxy; no file corruption.

## 1. Broken / missing images (C25)
- Unique image URLs checked: **2552**
- Broken: **439** (re-run after extractor fix pending if still polluted)
- byType pages: `{"product": 378, "category": 7, "car": 58, "blog": 32, "other": 3, "broken": 439}`
- brokenByType: `{"product": 371, "category": 6, "car": 56, "blog": 0, "other": 6}`

## 2. Old brand text ("Sialkot Motorsports" / Sialkot)
- Dry-run `$set` ops prepared: **2501** (token `BRAND-TEXT`).
- by collection: `{'products': 2127, 'blogposts': 107, 'categories': 144, 'vehicles': 97, 'settings': 26}`

| collection | slug | field | current text | proposed replacement |
|---|---|---|---|---|
| products | `toyota-corolla-2014-2026-interior-door-handle-carb` | `longDescription` | <h1>Toyota Corolla 2014-2026 Interior Door Handle Carbon Fiber Trims — 4 Piece Set</h1> <p>Upgrade e | <h1>Toyota Corolla 2014-2026 Interior Door Handle Carbon Fiber Trims — 4 Piece Set</h1> <p>Upgrade e |
| products | `toyota-corolla-2014-2026-interior-door-handle-carb` | `metaDescription` | Toyota Corolla 2014–2026 interior door handle carbon fiber trims — 4-piece set. Cash on Delivery nat | Toyota Corolla 2014–2026 interior door handle carbon fiber trims — 4-piece set. Cash on Delivery nat |
| products | `toyota-corolla-2014-2026-interior-door-handle-carb` | `metaTitle` | Toyota Corolla 2014-2026 Interior Door Handle Carbon Trims 4PCS \| Sialkot Motorsports | Toyota Corolla 2014-2026 Interior Door Handle Carbon Trims 4PCS \| CrazzyCars.pk |
| products | `toyota-corolla-2014-2026-interior-door-handle-carb` | `seo.metaTitle` | Corolla Door Handle Carbon Trims 4PCS 2014–2026 \| Sialkot Motorsports | Corolla Door Handle Carbon Trims 4PCS 2014–2026 \| CrazzyCars.pk |
| products | `toyota-corolla-2014-2026-interior-door-handle-carb` | `seo.metaDescription` | Toyota Corolla 2014–2026 interior door handle carbon fiber trims — 4-piece set for all doors. Cash o | Toyota Corolla 2014–2026 interior door handle carbon fiber trims — 4-piece set for all doors. Cash o |
| products | `toyota-corolla-2014-2026-interior-door-handle-carb` | `vendor` | Sialkot Motorsports | CrazzyCars.pk |
| products | `toyota-corolla-airflow-ambient-led-ac-vent-trims-p` | `longDescription` | <h1>Toyota Corolla AirFlow Ambient LED Vent Trims — Plug and Play Interior Lighting</h1>  <p>Transfo | <h1>Toyota Corolla AirFlow Ambient LED Vent Trims — Plug and Play Interior Lighting</h1>  <p>Transfo |
| products | `toyota-corolla-airflow-ambient-led-ac-vent-trims-p` | `metaTitle` | Toyota Corolla AirFlow Ambient LED Vent Trims \| Sialkot Motorsports | Toyota Corolla AirFlow Ambient LED Vent Trims \| CrazzyCars.pk |
| products | `toyota-corolla-airflow-ambient-led-ac-vent-trims-p` | `seo.metaTitle` | Toyota Corolla AirFlow Ambient LED Vent Trims \| Sialkot Motorsports | Toyota Corolla AirFlow Ambient LED Vent Trims \| CrazzyCars.pk |
| products | `toyota-corolla-airflow-ambient-led-ac-vent-trims-p` | `vendor` | Sialkot Motorsports | CrazzyCars.pk |
| products | `toyota-corolla-carbon-fiber-gear-knob-cover-2014-2` | `longDescription` | <h1>Toyota Corolla Carbon Fiber Gear Knob Cover 2014-2026</h1>  <p>Give your <strong>Toyota Corolla< | <h1>Toyota Corolla Carbon Fiber Gear Knob Cover 2014-2026</h1>  <p>Give your <strong>Toyota Corolla< |
| products | `toyota-corolla-carbon-fiber-gear-knob-cover-2014-2` | `metaTitle` | Toyota Corolla Carbon Fiber Gear Knob Cover \| Sialkot Motorsports | Toyota Corolla Carbon Fiber Gear Knob Cover \| CrazzyCars.pk |
| products | `toyota-corolla-carbon-fiber-gear-knob-cover-2014-2` | `seo.metaTitle` | Toyota Corolla Carbon Fiber Gear Knob Cover \| Sialkot Motorsports | Toyota Corolla Carbon Fiber Gear Knob Cover \| CrazzyCars.pk |
| products | `toyota-corolla-carbon-fiber-gear-knob-cover-2014-2` | `vendor` | Sialkot Motorsports | CrazzyCars.pk |
| products | `toyota-corolla-2015-2026-led-side-mirror-neon-indi` | `longDescription` | <h2>Toyota Corolla 2015–2026 LED Side Mirror Neon Indicator Pair</h2> <p>Upgrade your <strong>Toyota | <h2>Toyota Corolla 2015–2026 LED Side Mirror Neon Indicator Pair</h2> <p>Upgrade your <strong>Toyota |
| products | `toyota-corolla-2015-2026-led-side-mirror-neon-indi` | `metaTitle` | Toyota Corolla 2017-2020 LED Side Mirror \| Sialkot Motorsports | Toyota Corolla 2017-2020 LED Side Mirror \| CrazzyCars.pk |
| products | `toyota-corolla-2015-2026-led-side-mirror-neon-indi` | `seo.metaTitle` | Corolla 2015–2026 Neon Side Mirror Indicator \| Sialkot Motorsports | Corolla 2015–2026 Neon Side Mirror Indicator \| CrazzyCars.pk |
| products | `toyota-corolla-2015-2026-led-side-mirror-neon-indi` | `seo.metaDescription` | Toyota Corolla 2015–2026 LED side mirror neon indicator pair — neon style (not sequential). Cash on  | Toyota Corolla 2015–2026 LED side mirror neon indicator pair — neon style (not sequential). Cash on  |
| products | `toyota-corolla-2015-2026-led-side-mirror-neon-indi` | `vendor` | Sialkot Motorsports | CrazzyCars.pk |
| products | `honda-civic-x-2016-2021-carbon-fiber-front-dashboa` | `longDescription` | <h1>Honda Civic X 2016-2021 Carbon Fiber Interior Front Dashboard Trims 3PCS</h1><p>Transform your < | <h1>Honda Civic X 2016-2021 Carbon Fiber Interior Front Dashboard Trims 3PCS</h1><p>Transform your < |
| products | `honda-civic-x-2016-2021-carbon-fiber-front-dashboa` | `metaTitle` | Civic X Carbon Front Dashboard Trims 3PCS \| Sialkot Motorsports | Civic X Carbon Front Dashboard Trims 3PCS \| CrazzyCars.pk |
| products | `honda-civic-x-2016-2021-carbon-fiber-front-dashboa` | `seo.metaTitle` | Civic X Carbon Front Dashboard Trims 3PCS \| Sialkot Motorsports | Civic X Carbon Front Dashboard Trims 3PCS \| CrazzyCars.pk |
| products | `honda-civic-x-2016-2021-carbon-fiber-front-dashboa` | `vendor` | Sialkot Motorsports | CrazzyCars.pk |
| products | `honda-civic-x-2016-2021-carbon-fiber-gear-panel-tr` | `longDescription` | <h1>Honda Civic X 2016-2021 Carbon Fiber Gear Panel Trim</h1><p>Upgrade your <strong>Honda Civic X 2 | <h1>Honda Civic X 2016-2021 Carbon Fiber Gear Panel Trim</h1><p>Upgrade your <strong>Honda Civic X 2 |
| products | `honda-civic-x-2016-2021-carbon-fiber-gear-panel-tr` | `metaDescription` | car accessory for Honda Civic X 2016-2021 — premium Carbon Fiber Gear Panel Trim from Sialkot Motors | car accessory for Honda Civic X 2016-2021 — premium Carbon Fiber Gear Panel Trim from CrazzyCars.pk  |
| products | `honda-civic-x-2016-2021-carbon-fiber-gear-panel-tr` | `metaTitle` | Honda Civic X Carbon Fiber Gear Panel Trim \| Sialkot Motorsports | Honda Civic X Carbon Fiber Gear Panel Trim \| CrazzyCars.pk |
| products | `honda-civic-x-2016-2021-carbon-fiber-gear-panel-tr` | `seo.metaTitle` | Civic X Carbon Gear Panel Trim 2016–2021 \| Sialkot Motorsports | Civic X Carbon Gear Panel Trim 2016–2021 \| CrazzyCars.pk |
| products | `honda-civic-x-2016-2021-carbon-fiber-gear-panel-tr` | `seo.metaDescription` | Honda Civic X 2016–2021 carbon fiber gear panel trim. Easy bolt-on interior styling. Cash on Deliver | Honda Civic X 2016–2021 carbon fiber gear panel trim. Easy bolt-on interior styling. Cash on Deliver |
| products | `honda-civic-x-2016-2021-carbon-fiber-gear-panel-tr` | `shortDescription` | Honda Civic X 2016-2021 Carbon Fiber Gear Panel Trim Upgrade your Honda Civic X 2016-2021 interior w | Honda Civic X 2016-2021 Carbon Fiber Gear Panel Trim Upgrade your Honda Civic X 2016-2021 interior w |
| products | `honda-civic-x-2016-2021-carbon-fiber-gear-panel-tr` | `vendor` | Sialkot Motorsports | CrazzyCars.pk |
| products | `toyota-corolla-2015-2023-power-window-carbon-fiber` | `longDescription` | <h1>Toyota Corolla 2015-2023 Power Window Carbon Fiber Trims Set of 4PCS</h1><p>Give your <strong>To | <h1>Toyota Corolla 2015-2023 Power Window Carbon Fiber Trims Set of 4PCS</h1><p>Give your <strong>To |
| products | `toyota-corolla-2015-2023-power-window-carbon-fiber` | `metaTitle` | Toyota Corolla Power Window Carbon Trims 4PCS \| Sialkot Motorsports | Toyota Corolla Power Window Carbon Trims 4PCS \| CrazzyCars.pk |
| products | `toyota-corolla-2015-2023-power-window-carbon-fiber` | `seo.metaTitle` | Toyota Corolla Power Window Carbon Trims 4PCS \| Sialkot Motorsports | Toyota Corolla Power Window Carbon Trims 4PCS \| CrazzyCars.pk |
| products | `toyota-corolla-2015-2023-power-window-carbon-fiber` | `vendor` | Sialkot Motorsports | CrazzyCars.pk |
| products | `toyota-corolla-2015-2024-carbon-fiber-gear-shifter` | `longDescription` | <h1>Toyota Corolla 2015-2024 Carbon Fiber Gear Shifter Trim</h1><p>Upgrade your <strong>Toyota Corol | <h1>Toyota Corolla 2015-2024 Carbon Fiber Gear Shifter Trim</h1><p>Upgrade your <strong>Toyota Corol |
| products | `toyota-corolla-2015-2024-carbon-fiber-gear-shifter` | `metaTitle` | Toyota Corolla Carbon Gear Shifter Trim \| Sialkot Motorsports | Toyota Corolla Carbon Gear Shifter Trim \| CrazzyCars.pk |
| products | `toyota-corolla-2015-2024-carbon-fiber-gear-shifter` | `seo.metaTitle` | Toyota Corolla Carbon Gear Shifter Trim \| Sialkot Motorsports | Toyota Corolla Carbon Gear Shifter Trim \| CrazzyCars.pk |
| products | `toyota-corolla-2015-2024-carbon-fiber-gear-shifter` | `vendor` | Sialkot Motorsports | CrazzyCars.pk |
| products | `suzuki-alto-multimedia-steering-control-buttons-wi` | `longDescription` | <h1>Suzuki Alto Multimedia Steering Control Buttons with Spiral Cable – Glossy Black</h1><p>Upgrade  | <h1>Suzuki Alto Multimedia Steering Control Buttons with Spiral Cable – Glossy Black</h1><p>Upgrade  |
| products | `suzuki-alto-multimedia-steering-control-buttons-wi` | `media.images.0.altText` | Suzuki Alto Multimedia Steering Control Buttons with Spiral Cable Glossy Black Pakistan – Sialkot Mo | Suzuki Alto Multimedia Steering Control Buttons with Spiral Cable Glossy Black Pakistan – CrazzyCars |

_Full table: `BRAND-TEXT-dry-run.json` (2501 rows)._

## 3. Wrong photos
- Main slug mismatch: **2**
- Shared files across products: **7**
- Foreign description images: **0** (HTML `<img>` largely absent; media lives in `media.images`)
- Name vs image keyword flags: **6** (some soft/false positives)

| product | image | belongs to | action |
|---|---|---|---|
| `suzuki-alto-2018-2023-multimedia-steering-wheel-audio-control-buttons-panel` | `premium-metal-key-cover-1-822f07371e.webp` | `premium-metal-key-cover` | replace from own photos |
| `honda-vezel-2013-2018-fog-lamps-drl-cover-hd011-l2` | `osram-projector-lights-3-colour-premium-quality-1-fcc6deaa81.webp` | `osram-projector-lights-3-colour-premium-quality` | replace from own photos |
| `toyota-corolla-2015-2026-rgb-side-style` | `/media/products/toyota-corolla-rgb-side-style-and-back-bumper-light-1-d5bba4e978.webp` | `toyota-corolla-rgb-side-style-and-back-bumper-light` | remove |
| `toyota-corolla-2009-2013-trd-style-front-grill` | `/media/products/toyota-corolla-trd-style-front-grille-gloss-black-abs-1-5b3b1314d9.webp` | `toyota-corolla-trd-style-front-grille-gloss-black-abs` | remove |
| `universal-front-bumper-splitter-canard-1pcs-matt-black-abs` | `/media/products/universal-front-splitter-style-4-gloss-black-canard-3pcs-1-6267f55d74.webp` | `universal-front-splitter-style-4-gloss-black-canard-3pcs` | remove |
| `universal-front-bumper-splitter-canard-1pcs-matt-black-abs` | `/media/products/universal-front-splitter-style-4-gloss-black-canard-3pcs-2-034216a978.webp` | `universal-front-splitter-style-4-gloss-black-canard-3pcs` | remove |
| `honda-vezel-2013-2018-fog-lamps-drl-cover-hd011-l2` | `/media/products/osram-projector-lights-3-colour-premium-quality-1-fcc6deaa81.webp` | `osram-projector-lights-3-colour-premium-quality` | remove |
| `toyota-corolla-2008-2010-diamond-style-chrome-front-grille` | `/media/products/toyota-corolla-2008-2011-front-chrome-grilles-set-unpainted-steel-1-3d2a57629c.webp` | `toyota-corolla-2008-2011-front-chrome-grilles-set-unpainted-steel` | remove |
| `toyota-corolla-carbon-fiber-center-console-gear-glass-holder-2014-2026` | `/media/products/toyota-corolla-carbon-fiber-dashboard-trim-3pcs-lcd-2014-2026-1-nologo-04518dd4fc.webp` | `toyota-corolla-carbon-fiber-dashboard-trim-3pcs-lcd-2014-2026` | remove |
| `suzuki-alto-2018-2023-multimedia-steering-wheel-audio-control-buttons-panel` | `premium-metal-key-cover-1-822f07371e.webp` | (review) | replace if confirmed mismatch |
| `honda-civic-x-2016-2021-carbon-fiber-ac-vent-trims-full-set` | `honda-civic-x-2016-2021-carbon-fiber-ac-vent-trims-full-set-1-e8495c0093.webp` | (review) | replace if confirmed mismatch |
| `toyota-corolla-2012-top-ac-panel` | `toyota-corolla-2012-top-ac-panel-1-210e0307d9.webp` | (review) | replace if confirmed mismatch |
| `car-decoration-solar-powered-aeroplane` | `car-decoration-solar-powered-aeroplane-1-d136477563.webp` | (review) | replace if confirmed mismatch |
| `dynamic-car-underglow-lights` | `dynamic-car-underglow-lights-1-933e03f25a.webp` | (review) | replace if confirmed mismatch |
| `toyota-corolla-carbon-fiber-center-console-gear-glass-holder-2014-2026` | `toyota-corolla-carbon-fiber-dashboard-trim-3pcs-lcd-2014-2026-1-nologo-04518dd4fc.webp` | (review) | replace if confirmed mismatch |

Note: Corolla door panels product has correct own files in `media.images` but shortDescription still says "Price in Pakistan at Sialkot Motorsports" (BRAND-TEXT). No foreign nologo imgs currently in its description HTML.

## 4. Watermark OCR
- Running tesseract over 941 product masters on VPS → `ocr-watermarks.json` (attach when DONE).
- Rule: any domain/store/phone watermark that is not CrazzyCars.pk → hide or replace with own photos; never reuse.

## 5. Other mismatches
- Set-count text vs title: 0 hard mismatches in automated scan.
- Fitment years: deferred to PHOTO-FIX/copy pass; flag during apply review.
- Filenames containing literal `Sialkot Motorsports` (example perfume SKU) → rename/replace under PHOTO-FIX.

## Dry-runs (await GO)
- `BRAND-TEXT-dry-run.json`
- `PHOTO-FIX-dry-run.json`

**Tokens to add next:** `PHOTO-FIX`, `BRAND-TEXT`

## OCR watermarks (final first-pass)
- Scanned: 941 masters; flagged: **2**; decode/timeout errors: 20
| product | image | watermark | action |
|---|---|---|---|
| `honda-vezel-2013-2018-rear-bumper-brake-lamp` | `honda-vezel-2013-2018-rear-bumper-brake-lamp-2-27bb228716.webp` | GULAUTOS.PK | replace/hide (own photos only) |
| `honda-vezel-2013-2018-rear-bumper-brake-lamp` | `honda-vezel-2013-2018-rear-bumper-brake-lamp-1-d008aef3cf.webp` | GULAUTOS.PK | replace/hide (own photos only) |

## H3 live metrics
- Broken image URLs (C25): **1** / 2107 (byType broken: `{"product": 0, "category": 0, "car": 0, "blog": 0, "other": 1}`)
- PDP main-image 200: **399/399 (100.0%)**
- Lighthouse mobile PDP LCP: **2.7 s** (perf score 0.94)

## Pending (need GO tokens)
- BRAND-TEXT dry-run ready
- PHOTO-FIX dry-run ready (wrong/shared/watermarked/missing car image)
