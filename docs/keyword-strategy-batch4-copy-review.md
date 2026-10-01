# Batch 4 — exact meta + FAQ copy for review (NO WRITES YET)

**Date:** 2026-10-02  
**Status:** **Approved and shipped 2026-10-02.** Cats all 6 · Products all 24. `CC-EXT-107` VC repaired (Civic X 2016–2021); not in FAQ set.  
**Source:** VPS Mongo `sialkot_motorsports` (live prices pulled 2026-10-02). Recompute prices at write-time.  
**Shared policy answers** = live `getFaqItems()` / `returnsFaqAnswer()` / `standardDeliveryFeeStatement()` — same COD/fees/ETA/returns/fitment as Batches 1–3/F. Fees via store-policy helpers at write-time, never hardcoded literals in code.

### Decisions locked this round

- **Categories:** include 6 · defer `rear-reflectors` + `sun-shades`.
- **Products:** 24 SKUs (original 25 minus **`CC-EXT-107`** — pulled entirely; see §D).
- **Parent dual-tag ≠ covered-leaf cannibalization:** `hanging-perfumes` / `air-press` sit 100% under excluded parents (`interior` / `exterior`) but **0%** overlap with already-covered leaves — include (same leaf-under-parent logic as Batches 1–3). Logged in backlog so this is not re-litigated.
- Zero-order cats (`utility`, `air-press`, `exhaust-systems-tips`, `car-care-cleaning`): factual catalog copy only — no “popular” / “bestselling” framing.
- **`CC-0004`** remains hard-excluded. No silent title/VC edits.

### Already covered (do not retouch)

**Categories (23 FAQ leaves):** Batches 1–3 set in `CATEGORY_FAQ_EXTRAS` (incl. `gadgets`).  
**Products (~78 FAQ SKUs):** Batches 1–3 + F.  
**Parents still excluded:** `exterior`, `interior`, `led-lighting`, `carbon-fiber` (+ `gadgets` already FAQ’d as its own leaf).

### After this batch ships (projected)

**29 FAQ-covered leaves / 30 active non-parent leaves with ≥1 SKU** (parents excluded). Remaining 2 = deferred `rear-reflectors` + `sun-shades`. **Category-level expansion is exhausted** — next SEO phase should not scope another leaf-category round unless new leaves/SKU density appear.

Prices below are **live at proposal time**.

---

## A. Categories — exact meta + FAQ (6)

Unless noted, every category FAQ = shared COD + fees + ETA + returns + fitment, then the price Q, then extras.

---

### 1. `emergency-safety` — 30d **2** · 90d **2** · 3 SKUs · Rs. 2,999–7,500

| Field | Exact text |
|-------|------------|
| metaTitle (base) | `Emergency & Safety Car Accessories Price in Pakistan` |
| Branded title | Check `buildBrandedAbsoluteTitle` at write (base alone is long; drop brand if >60) |
| metaDescription | `Car chargers, air compressors, and emergency kit gear from Rs. 2,999 to Rs. 7,500. Confirm listing details before ordering. COD on eligible items.` |
| shortDescription append | `Prices on this page currently run about Rs. 2,999–7,500 (live catalog).` |
| priceMode | `range` |

**In catalog now:** CC-0181 (45W charger), CC-UNI-142 / CC-UNI-143 (air compressors).

**FAQ extras:**

6. Q: What price range do Emergency & Safety accessories sell for on CrazzyCars?  
   A: On this category, live prices currently range from Rs. 2,999 to Rs. 7,500. Prices change with stock and deals — check the product card for the current price.

7. Q: What counts as “emergency & safety” here?  
   A: This leaf currently lists portable power (for example a multi-port fast car charger) and emergency inflation tools (air compressors). Open each product for what’s in the box.

8. Q: Why do some items also appear under Universal Accessories?  
   A: A few SKUs are dual-categorized. Use this page when you are browsing chargers and compressors; always confirm the product title and photos before ordering.

**Cannibalization:** 1/3 also in covered `universal-accessories` (dual-tag) — leaf still distinct. Include.

---

### 2. `hanging-perfumes` — 30d **1** · 90d **1** · 2 SKUs · Rs. 199–2,000 · thin

| Field | Exact text |
|-------|------------|
| metaTitle (base) | `Hanging Car Perfumes Price in Pakistan` |
| Branded | OK (~54 with brand) |
| metaDescription | `Hanging car fragrance cards and bottles from Rs. 199 to Rs. 2,000. Universal cabin use — not vehicle-specific. COD on eligible items.` |
| shortDescription append | `Prices on this page currently range from Rs. 199 to Rs. 2,000 (live catalog).` |
| priceMode | `range` |

**In catalog now:** CC-0229 (perfume card pack), CC-0230 (Lion Style Car Perfume).

**Parent dual-tag note (not a leaf-cannibalization block):** 100% of SKUs also sit under excluded parent `interior`. That is **not** the same as overlapping an already-covered leaf. Overlap with covered `air-freshener-decoration` = **0%**. Include — same leaf-under-parent pattern as Batches 1–3.

**FAQ extras:**

6. Q: What price range do hanging car perfumes sell for on CrazzyCars?  
   A: On this category, live prices currently range from Rs. 199 to Rs. 2,000. Prices change with stock and deals — check the product card for the current price.

7. Q: Are these vehicle-specific?  
   A: No. Hanging perfumes and fragrance cards here are universal cabin accessories unless a listing says otherwise.

8. Q: How is this different from Air Fresheners & Decor?  
   A: This leaf is hanging-only. Dashboard ornaments and other décor live under Air Fresheners & Decor — check the product type on each listing.

---

### 3. `utility` — 30d **0** · 90d **0** · 2 SKUs · Rs. 5,999–7,500 · thin / zero-order

| Field | Exact text |
|-------|------------|
| metaTitle (base) | `Car Utility Tools Price in Pakistan` |
| Branded | OK |
| metaDescription | `Portable air compressors listed under Utility from Rs. 5,999 to Rs. 7,500. Check kit contents on each listing. COD on eligible items.` |
| shortDescription append | `Prices on this page currently range from Rs. 5,999 to Rs. 7,500 (live catalog).` |
| priceMode | `range` |

**Honest shelf:** CC-UNI-142 + CC-UNI-143 only (same compressor SKUs also under Emergency & Safety). No demand framing.

**FAQ extras:**

6. Q: What price range do Utility tools sell for on CrazzyCars?  
   A: On this category, live prices currently range from Rs. 5,999 to Rs. 7,500. Prices change with stock and deals — check the product card for the current price.

7. Q: What is listed in Utility right now?  
   A: This category currently lists portable air-compressor kits for tyre inflation. Confirm voltage, hose, and whether a carry case is included on the product page.

---

### 4. `air-press` — 30d **0** · 90d **0** · 3 SKUs · Rs. 4,199–9,399 · zero-order

| Field | Exact text |
|-------|------------|
| metaTitle (base) | `Car Air Press / Window Visors Price in Pakistan` |
| Branded | Check length at write (may need shortened base) |
| metaDescription | `Vehicle-specific air press (window visor) kits from Rs. 4,199 to Rs. 9,399. Confirm make, model, and years on the product page before ordering.` |
| shortDescription append | `Prices on this page currently range from Rs. 4,199 to Rs. 9,399 (live catalog).` |
| priceMode | `range` |

**In catalog now:** CC-EXT-103 (Corolla), CC-EXT-104 (Civic X), CC-EXT-105 (City TXR).

**Parent dual-tag note:** 100% also under excluded parent `exterior`; **0%** overlap with covered leaves. Include.

**FAQ extras:**

6. Q: What price range do air press / window visors sell for on CrazzyCars?  
   A: On this category, live prices currently range from Rs. 4,199 to Rs. 9,399. Prices change with stock and deals — check the product card for the current price.

7. Q: Will this fit my car?  
   A: These are vehicle-specific. Open the product and check the vehicle compatibility table (make/model/years) before ordering — titles can be narrower or broader than the table.

8. Q: Do I need to drill?  
   A: Most air-press / visor kits are designed for OEM-style door-frame fit. Follow the listing install notes; WhatsApp us with your year if unsure.

---

### 5. `exhaust-systems-tips` — 30d **0** · 90d **0** · 2 SKUs · Rs. 1,549–17,500 · thin / skewed · **fromMin**

| Field | Exact text |
|-------|------------|
| metaTitle (base) | `Exhaust Tips & Systems Price in Pakistan` |
| Branded | OK |
| metaDescription | `Exhaust tips and related parts from Rs. 1,549 — full cut-off kits cost more (see each card). Confirm fitment and what’s included on the listing.` |
| shortDescription append | `Prices on this page start from Rs. 1,549 (live catalog); full cut-off kits are higher — check the product card.` |
| priceMode | `fromMin` |

**In catalog now:** CC-UNI-EXT-EXT-A1 (tip Rs. 1,549), CC-EXT-101 (cut-off kit Rs. 17,500). Do not present as a compact “typical” range.

**FAQ extras:**

6. Q: What do exhaust tips and systems cost on CrazzyCars?  
   A: Prices on this category currently start from Rs. 1,549. Full cut-off kits are higher — always check the product card for the live price. Prices change with stock and deals.

7. Q: Do tip-only upgrades change performance?  
   A: Tip-only accessories are mainly for look and sound character. They do not replace a full exhaust system — read the product description for what is included.

---

### 6. `car-care-cleaning` — 30d **0** · 90d **0** · 2 SKUs · Rs. 399–1,799 · thin / zero-order

| Field | Exact text |
|-------|------------|
| metaTitle (base) | `Car Care & Cleaning Products Price in Pakistan` |
| Branded | Check length at write |
| metaDescription | `Car care and cleaning products currently listed from Rs. 399 to Rs. 1,799. Check size and use notes on each listing. COD on eligible items.` |
| shortDescription append | `Prices on this page currently range from Rs. 399 to Rs. 1,799 (live catalog).` |
| priceMode | `range` |

**Honest shelf:** CC-0226 (microfiber towels) + CC-0021 (Alcantara-style steering wheel cover). Not a deep chemical/detailing aisle — copy must not invent one.

**FAQ extras:**

6. Q: What price range do Car Care & Cleaning products sell for on CrazzyCars?  
   A: On this category, live prices currently range from Rs. 399 to Rs. 1,799. Prices change with stock and deals — check the product card for the current price.

7. Q: What is listed here right now?  
   A: This category currently includes microfiber towels and a universal steering-wheel cover. Open each product for size, material, and use notes — the shelf is small and changes with stock.

8. Q: Are these vehicle-specific?  
   A: The products currently listed here are universal. Follow the label and install notes on the product page.

---

### Deferred (confirmed)

| Slug | Reason |
|------|--------|
| `rear-reflectors` | **100%** SKU overlap with covered `led-indicator-lights` |
| `sun-shades` | Single SKU; too thin for a money page this round |

---

## B. Products — exact FAQ copy (24)

Shared on every PDP FAQ JSON-LD: COD + returns (same Batch F filter), then **2 product-specific** Qs below. Material honesty for carbon-style ABS. Mismatches → FAQ “table is source of truth” + backlog (no silent title fixes). **`CC-EXT-107` excluded** (see §D).

| # | SKU | 30d/90d | Price | `/cars` |
|---|-----|--------:|------:|---------|
| 1 | `CC-0022` | 2/3 | 5,499 | Corolla 2014–2026 path if live · **disclose** short “2022 only” vs VC |
| 2 | `CC-0134` | 2/2 | 2,999 | Elantra Hybrid 2025–Present |
| 3 | `CC-0181` | 2/2 | 2,999 | universal — no `/cars` |
| 4 | `CC-0145` | 2/2 | 1,799 | Corolla 2014–2026 (title leans Grande E210) |
| 5 | `CC-0221` | 2/2 | 5,500 | Civic Reborn 2006–2011 |
| 6 | `CC-0034` | 2/2 | 5,499 | universal — no `/cars` |
| 7 | `CC-0121` | 2/2 | 3,999 | Civic Reborn 2006–2012 |
| 8 | `CC-SPO-MIR-BAT` | 1/2 | 5,299 | Sportage 2019–2024 |
| 9 | `CC-0098` | 1/2 | 799 | City Classic 2009–2020 · **disclose** |
| 10 | `CC-0196` | 1/2 | 1,999 | Corolla 2014–2026 · **disclose** |
| 11 | `CC-TCR-EXT-SMC-CF-15` | 1/2 | 3,199 | Corolla 2014–2026 · **disclose** |
| 12 | `CC-0129` | 1/2 | 4,999 | City 2021–2026 |
| 13 | `CC-TYR-EXT-SMC-CF` | 1/2 | 3,199 | Yaris 2020–2026 |
| 14 | `CC-COR-BBL-E120` | 1/2 | 4,500 | Corolla E120 2002–2008 |
| 15 | `CC-0211` | 1/1 | 2,499 | universal — no `/cars` |
| 16 | `CC-INT-155` | 1/1 | 7,799 | Corolla E140 2009–2014 · **disclose** |
| 17 | `CC-INT-102` | 1/1 | 1,799 | Corolla 2014–2026 |
| 18 | `CC-0159` | 1/1 | 3,999 | Corolla 2014–2026 · **disclose** |
| 19 | `CC-0175` | 1/1 | 2,299 | Civic Rebirth 2012–2016 · **disclose** |
| 20 | `CC-0176` | 1/1 | 3,999 | Civic Rebirth 2012–2016 · **disclose** |
| 21 | `CC-0120` | 1/1 | 3,999 | Civic Reborn 2006–2012 |
| 22 | `CC-0223` | 1/1 | 3,800 | City 2021–2026 |
| 23 | `CC-0040` | 1/1 | 4,499 | Corolla 2014–Present · **disclose** |
| 24 | `CC-LGT-203` | 1/1 | 8,500 | Honda Classic 2009–2020 · **disclose** |

---

### Exact product FAQ text

#### 1. `CC-0022` — Corolla X shark-fin lower diffuser · Rs. 5,499 · bulky · **disclose**
Slug: `toyota-corolla-x-shark-fin-style-lower-panel-diffuser`  
VC: Toyota Corolla **2014–2026** · Short copy says **Corolla X 2022 only**

1. Q: Which Corolla does this fit?  
   A: The vehicle compatibility table lists Toyota Corolla 2014–2026 (E170–E210). The short description mentions Corolla X 2022 only — use the table on this page as the fitment source of truth, and confirm against the product photos for your bumper.  
2. Q: Why might delivery be higher?  
   A: Body/diffuser pieces are often bulky. Bulky carts use the bulky delivery fee shown at checkout.

`/cars`: Corolla 2014–2026 path if live.

---

#### 2. `CC-0134` — Elantra Hybrid door handle covers · Rs. 2,999
Slug: `carbon-fiber-door-handle-covers-hyundai-elantra-hybrid-2025-present-4pcs`  
VC: Hyundai Elantra Hybrid **2025–Present**

1. Q: Which Elantra does this fit?  
   A: Hyundai Elantra Hybrid 2025–Present per the vehicle compatibility table on this page.  
2. Q: Is it real carbon fiber?  
   A: No. ABS with a carbon-style finish unless the description says otherwise.

`/cars`: Elantra Hybrid path if live.

---

#### 3. `CC-0181` — 4-in-1 45W fast car charger · Rs. 2,999 · universal
Slug: `4-in-1-45w-fast-car-charger-usb-type-c-built-in-ios-android-cable`

1. Q: Is this a universal fit?  
   A: Yes. It is a 12V car charger with USB/Type-C leads — not vehicle-specific. Confirm plug type and cable set on the listing.  
2. Q: Does it charge phones and tablets?  
   A: It is sold as a multi-port 45W fast car charger (see wattage and ports on the product page). Use the cable/port combo your device supports.

`/cars`: none.

---

#### 4. `CC-0145` — Corolla E210 Grande LED rear reflector · Rs. 1,799
Slug: `corolla-e210-grande-led-rear-reflector`  
VC: Toyota Corolla **2014–2026** (table); title/short emphasize Grande / Grande X E210

1. Q: Which Corolla does this fit?  
   A: The vehicle compatibility table lists Toyota Corolla 2014–2026 (E170–E210). The title highlights Grande / Grande X E210 styling — use the table plus the product photos as the fitment source of truth for your trim.  
2. Q: Is it plug-and-play?  
   A: Rear bumper reflector LEDs are typically OEM-style replacements. Follow the listing wiring notes; WhatsApp us with your year/trim if unsure.

`/cars`: Corolla 2014–2026 path if live.

---

#### 5. `CC-0221` — Civic Reborn carbon steering trim · Rs. 5,500
Slug: `honda-civic-reborn-2006-2011-carbon-fiber-steering-trim`  
VC: Honda Civic Reborn **2006–2011**

1. Q: Which Civic does this fit?  
   A: Honda Civic Reborn 2006–2011 per the vehicle compatibility table on this page.  
2. Q: Is it real carbon fiber?  
   A: No. Carbon-style ABS trim unless the description says otherwise.

`/cars`: Civic Reborn path if live.

---

#### 6. `CC-0034` — Universal 3-piece front splitter · Rs. 5,499 · bulky · universal
Slug: `universal-3-piece-front-bumper-splitter-ground-style-abs`

1. Q: Is this a universal fit?  
   A: Yes. It is a universal 3-piece ABS ground-style front splitter. Confirm look and install method against your bumper in the photos.  
2. Q: Why might delivery be higher?  
   A: Splitters are often bulky. Bulky carts use the bulky delivery fee shown at checkout.

`/cars`: none.

---

#### 7. `CC-0121` — Civic Reborn ABS roof spoiler · Rs. 3,999 · bulky
Slug: `honda-civic-reborn-2006-2012-abs-roof-spoiler`  
VC: Honda Civic Reborn **2006–2012**

1. Q: Which Civic does this fit?  
   A: Honda Civic Reborn 2006–2012 per the vehicle compatibility table on this page.  
2. Q: Why might delivery be higher?  
   A: Spoilers are often bulky / special-courier. The fee is shown at checkout.

`/cars`: Civic Reborn path if live.

---

#### 8. `CC-SPO-MIR-BAT` — Sportage Batman mirrors · Rs. 5,299
Slug: `kia-sportage-batman-style-side-mirror-covers`  
VC: KIA Sportage **2019–2024**

1. Q: Which Sportage does this fit?  
   A: KIA Sportage 2019–2024 per the vehicle compatibility table on this page.  
2. Q: How does it install?  
   A: Batman-style covers are typically clip-on ABS over the factory mirror housing. Follow the product photos; WhatsApp us if your mirror shape differs.

`/cars`: Sportage 2019–2024 path if live.

---

#### 9. `CC-0098` — City gear knob cover · Rs. 799 · **disclose**
Slug: `honda-city-2015-2020-carbon-fiber-gear-lever-knob-cover`  
VC: Honda City Classic **2009–2020** · Title **2015–2020**

1. Q: Which City does this fit?  
   A: The vehicle compatibility table lists Honda City 2009–2020. The product title lists 2015–2020 — use the table on this page as the fitment source of truth.  
2. Q: Is it real carbon fiber?  
   A: No. ABS with a carbon-style finish unless the description says otherwise.

`/cars`: City Classic path if live.

---

#### 10. `CC-0196` — Corolla door handle covers · Rs. 1,999 · **disclose**
Slug: `toyota-corolla-2015-door-handle-covers-carbon-fiber-glossy-black`  
VC: Corolla **2014–2026** · Title **2015–2026**

1. Q: Which Corolla does this fit?  
   A: The vehicle compatibility table lists Toyota Corolla 2014–2026 (E170–E210). The product title lists 2015–2026 — use the table on this page as the fitment source of truth.  
2. Q: Is it real carbon fiber?  
   A: No. ABS with a carbon-style / glossy black finish unless the description says otherwise.

`/cars`: Corolla 2014–2026 path if live.

---

#### 11. `CC-TCR-EXT-SMC-CF-15` — Corolla Batman mirrors · Rs. 3,199 · **disclose**
Slug: `toyota-corolla-2015-2022-batman-style-side-mirror-cover`  
VC: Corolla **2014–2026** · Title **2015–2022**

1. Q: Which Corolla does this fit?  
   A: The vehicle compatibility table lists Toyota Corolla 2014–2026 (E170–E210). The product title lists 2015–2022 — use the table on this page as the fitment source of truth.  
2. Q: How does it install?  
   A: Batman-style covers are typically clip-on ABS over the factory mirror housing. Follow the product photos.

`/cars`: Corolla 2014–2026 path if live.

---

#### 12. `CC-0129` — City RS trunk lip spoiler · Rs. 4,999 · bulky
Slug: `honda-city-new-model-trunk-lip-spoiler-2021-2026`  
VC: Honda City **2021–2026**

1. Q: Which City does this fit?  
   A: Honda City 2021–2026 (2021–Present) per the vehicle compatibility table on this page.  
2. Q: Why might delivery be higher?  
   A: Spoilers are often bulky. Bulky carts use the bulky delivery fee shown at checkout.

`/cars`: City 2021–Present path if live.

---

#### 13. `CC-TYR-EXT-SMC-CF` — Yaris Batman mirrors · Rs. 3,199
Slug: `batman-style-side-mirror-cover-toyota-yaris-2020-2026`  
VC: Toyota Yaris **2020–2026**

1. Q: Which Yaris does this fit?  
   A: Toyota Yaris 2020–2026 per the vehicle compatibility table on this page.  
2. Q: How does it install?  
   A: Batman-style covers are typically clip-on ABS over the factory mirror housing. Follow the product photos.

`/cars`: Yaris 2020–2026 path if live.

---

#### 14. `CC-COR-BBL-E120` — Corolla E120 RGB bumper light · Rs. 4,500
Slug: `toyota-corolla-e120-dynamic-back-bumper-light-rgb-2002-2008`  
VC: Toyota Corolla E120 **2002–2008**

1. Q: Which Corolla does this fit?  
   A: Toyota Corolla E120 2002–2008 per the vehicle compatibility table on this page.  
2. Q: Is install DIY?  
   A: Bumper LED kits usually need a power tap and mounting along the rear bumper. Follow the listing; use a trusted installer if you are not comfortable with wiring.

`/cars`: Corolla E120 path if live.

---

#### 15. `CC-0211` — Dashboard ambient strip 2PCS · Rs. 2,499 · universal
Slug: `car-dashboard-ambient-light-strip-premium-2pcs`

1. Q: Is this a universal fit?  
   A: Yes. It is a universal dashboard ambient LED strip set (2 pcs). Check length and adhesive notes on the listing.  
2. Q: Does install require removing trim?  
   A: Most strips need routing and sticking along the dash edge. Use a trusted installer if you are not comfortable with interior work.

`/cars`: none.

---

#### 16. `CC-INT-155` — Corolla TPE floor mats · Rs. 7,799 · bulky · **disclose**
Slug: `toyota-corolla-2008-2013-tpe-floor-mats-premium`  
VC: Toyota E140 **2009–2014** · Title **2008–2013**

1. Q: Which Corolla does this fit?  
   A: The vehicle compatibility table lists Toyota Corolla E140 2009–2014. The title lists 2008–2013 — use the table on this page as the fitment source of truth.  
2. Q: Why might delivery be higher?  
   A: Floor mats are often bulky. Bulky carts use the bulky delivery fee shown at checkout.

`/cars`: Corolla E140 path if live.

---

#### 17. `CC-INT-102` — Corolla velvet dashboard mat · Rs. 1,799
Slug: `toyota-corolla-2014-2026-velvet-dashboard-mat`  
VC: Toyota E170–E210 **2014–2026**

1. Q: Which Corolla does this fit?  
   A: Toyota Corolla 2014–2026 (E170–E210) per the vehicle compatibility table on this page.  
2. Q: Is it universal?  
   A: No. It is a vehicle-specific dashboard mat — confirm your year against the table before ordering.

`/cars`: Corolla 2014–2026 path if live.

---

#### 18. `CC-0159` — Corolla RS trunk spoiler · Rs. 3,999 · bulky · **disclose**
Slug: `toyota-corolla-2015-2026-rs-style-trunk-spoiler-abs`  
VC: Corolla **2014–2026** · Title **2015–2026**

1. Q: Which Corolla does this fit?  
   A: The vehicle compatibility table lists Toyota Corolla 2014–2026 (E170–E210). The title lists 2015–2026 — use the table as the source of truth.  
2. Q: Why might delivery be higher?  
   A: Spoilers are often bulky. Bulky carts use the bulky delivery fee shown at checkout.

`/cars`: Corolla 2014–2026 path if live.

---

#### 19. `CC-0175` — Civic Rebirth door handle covers · Rs. 2,299 · **disclose**
Slug: `honda-civic-rebirth-2012-2015-carbon-door-handle-cover-full-set`  
VC: Civic **2012–2016** · Title **2012–2015**

1. Q: Which Civic does this fit?  
   A: The vehicle compatibility table lists Honda Civic Rebirth 2012–2016. The product title lists 2012–2015 — use the table on this page as the fitment source of truth.  
2. Q: Is it real carbon fiber?  
   A: No. ABS with a carbon-style finish unless the description says otherwise.

`/cars`: Civic Rebirth path if live.

---

#### 20. `CC-0176` — Civic Rebirth side mirror covers · Rs. 3,999 · **disclose**
Slug: `honda-civic-rebirth-2012-2015-carbon-side-mirror-cover-pair`  
VC: Civic **2012–2016** · Title **2012–2015**

1. Q: Which Civic does this fit?  
   A: The vehicle compatibility table lists Honda Civic Rebirth 2012–2016. The product title lists 2012–2015 — use the table on this page as the fitment source of truth.  
2. Q: Is it real carbon fiber?  
   A: No. ABS with a carbon-style finish unless the description says otherwise.

`/cars`: Civic Rebirth path if live.

---

#### 21. `CC-0120` — Civic Reborn ABS roof spoiler · Rs. 3,999 · bulky
Slug: `honda-civic-reborn-2006-2012-abs-plastic-roof-spoiler`  
VC: Civic Reborn **2006–2012**

1. Q: Which Civic does this fit?  
   A: Honda Civic Reborn 2006–2012 per the vehicle compatibility table on this page.  
2. Q: Why might delivery be higher?  
   A: Spoilers are often bulky. The fee is shown at checkout.

`/cars`: Civic Reborn path if live.

---

#### 22. `CC-0223` — City carbon steering trim · Rs. 3,800
Slug: `honda-city-2021-2026-carbon-fiber-steering-trim`  
VC: Honda City **2021–2026**

1. Q: Which City does this fit?  
   A: Honda City 2021–2026 per the vehicle compatibility table on this page.  
2. Q: Is it real carbon fiber?  
   A: No. Carbon-style ABS trim unless the description says otherwise.

`/cars`: City 2021–Present path if live.

---

#### 23. `CC-0040` — Corolla spike splitter canard 3PCS · Rs. 4,499 · bulky · **disclose**
Slug: `toyota-corolla-2015-2024-front-spike-splitter-canard-3pcs`  
VC: Corolla **2014–Present** · Title **2015–2024**

1. Q: Which Corolla does this fit?  
   A: The vehicle compatibility table lists Toyota Corolla 2014–Present (E170–E210). The product title lists 2015–2024 — use the table on this page as the fitment source of truth.  
2. Q: Why might delivery be higher?  
   A: Splitters/canards are often bulky. Bulky carts use the bulky delivery fee shown at checkout.

`/cars`: Corolla 2014–2026 path if live.

---

#### 24. `CC-LGT-203` — City RGB side mirror indicator · Rs. 8,500 · **disclose**
Slug: `honda-city-rgb-side-mirror-indicator-led-dynamic-mirror-lights`  
Title: Honda City … · VC: **Honda Classic 2009–2020**

1. Q: Which City does this fit?  
   A: The vehicle compatibility table lists Honda Classic 2009–2020 (classic City generation). The product title says Honda City — use the table on this page as the fitment source of truth and confirm your mirror housing against the photos before ordering.  
2. Q: Is install DIY?  
   A: Mirror indicator LEDs usually need opening the mirror housing and a signal tap. Use a trusted installer if you are not comfortable with mirror wiring.

`/cars`: Classic City path if live (only if Vehicle slug matches Classic 2009–2020 — do not invent a 2021+ City link).

---

## C. Data-quality backlog adds (on write approval)

Standard **FAQ-disclosed only** (no silent title/VC fixes):

| SKU | Conflict |
|-----|----------|
| **CC-0022** | Short “Corolla X **2022 only**” vs VC Corolla **2014–2026** *(new this round)* |
| **CC-0098** | Title City **2015–2020** vs VC **2009–2020** |
| **CC-0196** | Title **2015–2026** vs VC **2014–2026** (promote from alternates → FAQ-disclosed) |
| **CC-TCR-EXT-SMC-CF-15** | Title **2015–2022** vs VC **2014–2026** |
| **CC-INT-155** | Title **2008–2013** vs VC E140 **2009–2014** |
| **CC-0159** | Title **2015–2026** vs VC **2014–2026** |
| **CC-0175** | Title Rebirth **2012–2015** vs VC **2012–2016** |
| **CC-0176** | Title Rebirth **2012–2015** vs VC **2012–2016** |
| **CC-0040** | Title **2015–2024** vs VC **2014–Present** |
| **CC-LGT-203** | Title Honda City vs VC **Honda Classic 2009–2020** |

**Not FAQ-disclosed this batch:** `CC-EXT-107` → §D urgent hold bucket.

---

## D. `CC-EXT-107` — separate flagged-urgent (NOT in this batch)

**Article:** `CC-EXT-107`  
**Slug:** `honda-civic-diamond-style-si-grille-2016-2021-glossy-black-abs`  
**Live title:** Honda Civic Diamond Style SI Grille 2016–2021 Glossy Black ABS · Rs. 9,999  
**Live VC:** Toyota Aqua **2012–2026** only  
**Shop-by-car on PDP:** links Aqua / Toyota Aqua (2012–Present)

### Photo check (2026-10-02)

Live gallery shows a **white 10th-gen Honda Civic** with a black diamond-pattern grille, plus a detached glossy-black grille + eyebrow set. **Title and photos agree (Civic).** The VC row (Aqua) does **not**.

That is **not** a trim/year wording drift. Cross-brand VC on a Civic-photographed listing usually means the wrong fitment row got attached (or a wrong listing merge) — FAQ-disclose-and-ship assumes the product itself is correctly listed. That assumption fails here.

### Treatment (locked)

- **Out of Batch 4** — no FAQ, no `/cars`, no SEO title touch, no disclose-and-ship.  
- Backlog as **flagged-urgent listing-integrity** (not FAQ-disclosed interim).  
- Consider same hold class as CC-0004 / CC-0168 / CC-0019 if you want it off-sale until VC is repaired — PDP currently steers shoppers to Aqua via Shop by car.  
- Do **not** invent Civic VC from the title alone; admin/supplier must verify and fix the row (or retire/merge the listing).

---

## E. What this round is *not*

- No parent hubs.  
- No `rear-reflectors` / `sun-shades`.  
- No `CC-EXT-107`.  
- No retouch of Batches 1–3/F.  
- No silent title or VC edits.

---

## Ask

Reply with sign-off, e.g.:

- `Cats: all 6` / drop any  
- `Products: all 24` / drop any / FAQ wording edits  
- `CC-EXT-107: leave live` or `put securityHold`  

**No production writes until that sign-off.**
