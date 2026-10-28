# L2 dry-run — low-CTR titles / descriptions (Oct 10 pack gaps)

**Fingerprint for writes:** `84143ac0cb2c3085`. Never Atlas `317ae4de8eb24f84`.  
**Hold:** after M4 settled + preferably after L1; exact message **`GO L2`**.  
**Write style:** products/categories `$set` metaTitle + metaDescription + seo.*; `/shop` and `/cars` are **code** metadata (no GO needed for those two once L2 is approved for code ship — still listed here).

## Price / fact check vs live DB

All user-supplied Rs. amounts match live sale prices. One description trimmed 2 chars to stay ≤158.

| Slug | Live sale | Proposed meta uses | OK? |
|------|----------:|--------------------|-----|
| honda-civic-reborn-…-audio-control-buttons | 7500 | 7,500 | Yes |
| toyota-corolla-2015-2022-batman-… | 3199 | 3,199 | Yes |
| honda-civic-x-…-gear-shift-panel… | 4299 | 4,299 | Yes |
| toyota-corolla-2015-door-handle-covers… | 1999 | 1,999 | Yes |
| toyota-corolla-x-shark-fin… | 5499 | 5,499 | Yes |
| honda-civic-11th-gen-rs-style-trunk-spoiler… | 4999 | 4,999 | Yes |
| toyota-mark-x-vertex-style-body-kit-2006-2009 | 16999 | 16,999 prepaid | Yes (body kit) |
| deal-5-complete-body-kit-… | 12999 | 12,999 prepaid | Yes |
| car-front-bumper-splitter-abs-plastic-4pcs | 3499 | 3,499 | Yes |
| toyota-corolla-e140-2009-2012-carbon-side-mirror-cover | 3199 | 3,199 | Yes |
| x-card-car-hanging-air-freshener-perfume | 149 | 149 | Yes |
| toyota-corolla-2012-2014-black-canadian-style-front-grille | 8500 | 8,500 | Yes |
| honda-civic-x-batman-style-side-mirror-cover | 3399 | 3,399 | Yes |
| car-dashboard-ambient-light-strip-premium-2pcs | 2499 | 2,499 | Yes |

## A — Exact values (user-provided)

| Path | NEW title (len) | NEW meta (len) |
|------|-----------------|----------------|
| `/honda-civic-reborn-2006-2012-multimedia-steering-wheel-audio-control-buttons` | Civic Reborn 2006–2012 Steering Audio Control Buttons (**53**) | Multimedia steering wheel audio control buttons for Honda Civic Reborn 2006–2012: volume, track and call controls. Rs. 7,500 in Pakistan, COD on eligible items. → **trimmed to 158:** `…call controls. Rs. 7,500 in Pakistan. COD on eligible items.` (**158**) |
| `/toyota-corolla-2015-2022-batman-style-side-mirror-cover` | Corolla 2015–2022 Batman Side Mirror Covers \| CrazzyCars (**56**) | Batman style side mirror covers for Toyota Corolla 2015–2022 in carbon fiber or gloss black ABS, snap-on fit. Rs. 3,199 in Pakistan, COD on eligible items. (**155**) |
| `/honda-civic-x-2016-2021-carbon-fiber-central-control-gear-shift-panel-trim-cover` | Civic X 2016–2021 Carbon Gear Shift Panel Cover \| CrazzyCars (**60**) | Carbon fiber central control gear shift panel trim cover for Honda Civic X 2016–2021, scratch-resistant ABS. Rs. 4,299 in Pakistan, COD on eligible items. (**154**) |
| `/toyota-corolla-2015-door-handle-covers-carbon-fiber-glossy-black` | Corolla 2015–2026 Door Handle Covers, Carbon or Gloss Black (**59**) | Door handle covers for Toyota Corolla 2015–2026 in carbon fiber or glossy black ABS, snap-on install. Rs. 1,999 in Pakistan, COD on eligible items. (**147**) |
| `/toyota-corolla-x-shark-fin-style-lower-panel-diffuser` | Corolla X Shark Fin Rear Lower Panel Diffuser \| CrazzyCars (**58**) | Shark fin style rear lower panel diffuser for Toyota Corolla X, gloss black ABS with tape and screw install. Rs. 5,499 in Pakistan, COD on eligible items. (**154**) |
| `/honda-civic-11th-gen-rs-style-trunk-spoiler-2022-present` | Honda Civic 11th Gen RS Trunk Spoiler Price in Pakistan (**55**) | RS style trunk spoiler for Honda Civic 11th Gen 2022 onward, lightweight ABS with a factory RS look. Rs. 4,999 in Pakistan, COD on eligible items. (**146**) |
| `/shop` *(code)* | Shop Car Accessories Online in Pakistan \| CrazzyCars.pk (**55**) | Shop car accessories online in Pakistan: body kits, spoilers, LED lights, interior trims and mats by model. COD on eligible items, nationwide delivery. (**151**) |
| `/cars` *(code)* | Car Accessories by Model in Pakistan \| CrazzyCars.pk (**52**) | Find car accessories by model in Pakistan: Toyota Corolla, Honda Civic and City, Suzuki Alto and Swift, Yaris, Aqua, Elantra and more. Fitment by year. (**151**) |

## B — Derived from live DB (same length rules)

| Path | NEW title (len) | NEW meta (len) |
|------|-----------------|----------------|
| `/toyota-mark-x-vertex-style-body-kit-2006-2009` | Mark X 2006–2009 Vertex Style Body Kit \| CrazzyCars.pk (**54**) | Vertex style complete body kit for Toyota Mark X 2006–2009 in fibreglass. Sale Rs. 16,999 in Pakistan; prepaid only (no COD). Nationwide delivery. (**146**) |
| `/deal-5-complete-body-kit-deal-front-splitter-side-skirts-back-bumper-lip` | Complete Body Kit Deal Splitter Skirts Rear Lip \| CC (**52**) | Complete body kit deal: front splitter, side skirts and rear bumper lip in one pack. Sale Rs. 12,999 in Pakistan; prepaid on body kits, nationwide delivery. (**156**) |
| `/car-front-bumper-splitter-abs-plastic-4pcs` | Front Bumper Splitter ABS 4PCS Universal \| CrazzyCars (**53**) | Universal 4-piece front bumper splitter in gloss black ABS with hardware. Sale Rs. 3,499 in Pakistan, COD on eligible items, nationwide delivery. (**145**) |
| `/toyota-corolla-e140-2009-2012-carbon-side-mirror-cover` | Corolla E140 2009–2012 Carbon Side Mirror Covers \| CC (**53**) | Carbon style side mirror covers (pair) for Toyota Corolla E140 2009–2012. Sale Rs. 3,199 in Pakistan, COD on eligible items, nationwide delivery. (**145**) |
| `/x-card-car-hanging-air-freshener-perfume` | X Card Hanging Car Air Freshener Perfume \| CrazzyCars (**53**) | X Card hanging rear-mirror car air freshener perfume card for the cabin. Sale Rs. 149 in Pakistan, COD on eligible items, nationwide delivery from Gujranwala. (**158**) |
| `/toyota-corolla-2012-2014-black-canadian-style-front-grille` | Corolla 2012–2014 Black Canadian Front Grille \| CC.pk (**53**) | Black Canadian style front grille for Toyota Corolla 2012–2014 (facelift look). Sale Rs. 8,500 in Pakistan, COD on eligible items, nationwide delivery. (**151**) |
| `/honda-civic-x-batman-style-side-mirror-cover` | Civic X 2016–2021 Batman Side Mirror Covers \| CrazzyCars (**56**) | Batman style side mirror covers for Honda Civic X 2016–2021 in ABS. Sale Rs. 3,399 in Pakistan, COD on eligible items, nationwide delivery from Gujranwala. (**155**) |
| `/car-dashboard-ambient-light-strip-premium-2pcs` | Car Dashboard Ambient Light Strip 2PCS \| CrazzyCars.pk (**54**) | Premium car dashboard ambient light strip set (2PCS) for cabin footwell glow. Sale Rs. 2,499 in Pakistan, COD on eligible items, nationwide delivery. (**149**) |
| `/categories/sos-flasher-led-lights` | SOS Flasher LED Lights Price in Pakistan \| CrazzyCars (**53**) | SOS strobe and grille flasher LED lights in red, blue and amber for high-visibility warning. COD on eligible items, nationwide at CrazzyCars.pk. (**144**) |
| `/categories/door-handle-covers` | Car Door Handle Covers Price in Pakistan \| CrazzyCars (**53**) | Carbon fiber and gloss door handle covers that protect against scratches while sharpening exterior detail. Fitment by model. COD on eligible items. (**147**) |

## Apply sketch (products)

```js
db.products.updateOne(
  { slug: "honda-civic-reborn-2006-2012-multimedia-steering-wheel-audio-control-buttons" },
  { $set: {
      metaTitle: "Civic Reborn 2006–2012 Steering Audio Control Buttons",
      "seo.metaTitle": "Civic Reborn 2006–2012 Steering Audio Control Buttons",
      metaDescription: "Multimedia steering wheel audio control buttons for Honda Civic Reborn 2006–2012: volume, track and call controls. Rs. 7,500 in Pakistan. COD on eligible items.",
      "seo.metaDescription": "Multimedia steering wheel audio control buttons for Honda Civic Reborn 2006–2012: volume, track and call controls. Rs. 7,500 in Pakistan. COD on eligible items.",
      updatedAt: new Date(),
  }}
);
// …same pattern for other product/category rows
```

`/shop` → `storecraft-store/app/shop/page.jsx`  
`/cars` → `storecraft-store/app/cars/page.jsx`

## Stop

Waiting for exact message: **GO L2**
