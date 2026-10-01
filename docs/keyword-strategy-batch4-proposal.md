# SEO expansion — next tier (Batch 4) proposal

**Date:** 2026-10-02  
**Status:** **Shipped 2026-10-02** — see `docs/keyword-strategy-batch4-copy-review.md`. Category expansion closed (29/30).  
**Source:** VPS Mongo `sialkot_motorsports` (orders excl. cancelled/refunded/demo; ranked by **30d** then **90d**).  
**Already covered (do not retouch):** 23 leaf categories in `keywordStrategyFaqs.js` CATEGORY_FAQ_EXTRAS; **78** product FAQ SKUs (Batches 1–3 + F). **`CC-0004` hard-excluded.**

**Shared FAQ policy answers** (at write-time) = live `getFaqItems()` / `returnsFaqAnswer()` / `standardDeliveryFeeStatement()` — same as Batches 1–3/F. Prices below are **live at proposal time**; recompute at write.

---

## Executive finding — categories

Order volume among **uncovered non-parent** leaves is almost gone:

| Uncovered leaf with any 30d/90d orders | 30d | 90d | Active SKUs |
|----------------------------------------|----:|----:|------------:|
| `emergency-safety` | 2 | 2 | 3 |
| `hanging-perfumes` | 1 | 1 | 2 |

All higher-volume leaves are **already covered**. Parent hubs remain high-volume but **stay excluded** (same cannibalization rule):

| Parent / alias | 30d | 90d |
|----------------|----:|----:|
| `exterior` | 18 | 38 |
| `interior` | 8 | 11 |
| `led-lighting` | 5 | 9 |
| `gadgets` (already FAQ-covered + alias) | 4 | 6 |
| `carbon-fiber` (thin parent) | 2 | 5 |

Only **8** remaining non-parent, non-covered categories have any active SKUs at all. This round cannot honestly fill “8–10 strong order-ranked leaves” without reopening parents. Proposal below takes every remaining leaf that passes (or is flagged through) the cannibalization check — **6 include / 2 defer**.

---

## A. Categories — proposed (6 include)

### Cannibalization summary

| Slug | Verdict | Why |
|------|---------|-----|
| `emergency-safety` | **Include** | Best uncovered order signal. 1/3 SKUs also in `universal-accessories` (33%) — dual-tag only; leaf still distinct (chargers + compressors). |
| `hanging-perfumes` | **Include (thin)** | 0% SKU overlap with covered `air-freshener-decoration`. 100% also tagged under parent `interior` (excluded hub) — same pattern as other leaf-under-parent pages. |
| `utility` | **Include (thin)** | 2 compressor SKUs; 0% overlap with covered leaves. |
| `air-press` | **Include** | 3 vehicle-specific air-press kits; **0%** overlap with covered leaves; **100%** dual-tagged under excluded parent `exterior` — leaf page still justified (mirrors how `door-handle-covers` sat under exterior historically). |
| `exhaust-systems-tips` | **Include (thin)** | 2 SKUs; 50% also under `exterior`; no covered-leaf overlap. |
| `car-care-cleaning` | **Include (thin)** | 2 SKUs; 50% also under `interior`; no covered-leaf overlap. |
| `rear-reflectors` | **Defer** | **100%** SKU overlap with already-covered `led-indicator-lights` (+ parent `led-lighting`). Pure cannibalization. |
| `sun-shades` | **Defer** | Single SKU; **100%** under parent `interior`; too thin for a “Price in Pakistan” money page this round. |

---

### 1. `emergency-safety` — 30d **2** · 90d **2** · 3 SKUs · Rs. 2,999–7,500

| Field | Proposed |
|-------|----------|
| metaTitle (base) | `Emergency & Safety Car Accessories Price in Pakistan` |
| Branded (≤60) | Drop brand if needed → check at write (`buildBrandedAbsoluteTitle`) |
| metaDescription | `Car chargers, air compressors, and emergency kit gear from Rs. 2,999. Confirm listing details before ordering. COD on eligible items.` |
| shortDescription append | `Prices on this page currently run about Rs. 2,999–7,500 (live catalog).` |

**FAQ extras (after shared COD/fees/ETA/returns/fitment + price Q):**

6. Q: What counts as “emergency & safety” here?  
   A: This leaf mixes portable power (for example fast car chargers) and emergency inflation tools (air compressors). Open each product for what’s in the box.

7. Q: Why do some items also appear under Universal Accessories?  
   A: A few SKUs are dual-categorized. Use this page when you are browsing emergency/power tools; always confirm the product title and photos before ordering.

---

### 2. `hanging-perfumes` — 30d **1** · 90d **1** · 2 SKUs · Rs. 199–2,000 · **thin**

| Field | Proposed |
|-------|----------|
| metaTitle (base) | `Hanging Car Perfumes Price in Pakistan` |
| metaDescription | `Hanging car fragrance cards and bottles from Rs. 199. Universal cabin use — not vehicle-specific. COD on eligible items.` |

**FAQ extras:**

6. Q: Are these vehicle-specific?  
   A: No. Hanging perfumes/cards are universal cabin accessories unless a listing says otherwise.

7. Q: How is this different from Air Fresheners & Decor?  
   A: This leaf is hanging-only. Dashboard ornaments and other décor live under Air Fresheners & Decor — check the product type on each listing.

---

### 3. `utility` — 30d **0** · 90d **0** · 2 SKUs · Rs. 5,999–7,500 · **thin / catalog fill**

| Field | Proposed |
|-------|----------|
| metaTitle (base) | `Car Utility Tools Price in Pakistan` |
| metaDescription | `Portable air compressors and utility tools from Rs. 5,999. Check kit contents on each listing. COD on eligible items.` |

**FAQ extras:**

6. Q: What is sold in Utility?  
   A: Currently portable air-compressor kits for tyre inflation. Confirm voltage, hose, and whether a carry case is included on the product page.

---

### 4. `air-press` — 30d **0** · 90d **0** · 3 SKUs · Rs. 4,199–9,399

| Field | Proposed |
|-------|----------|
| metaTitle (base) | `Car Air Press / Window Visors Price in Pakistan` |
| metaDescription | `Vehicle-specific air press (window visor) kits from Rs. 4,199. Confirm make, model, and years on the product page before ordering.` |

**Cannibalization note:** 100% also under excluded parent `exterior`; **0%** overlap with covered leaves — include as the dedicated leaf.

**FAQ extras:**

6. Q: Will this fit my car?  
   A: These are vehicle-specific. Open the product and check the vehicle compatibility table (make/model/years) before ordering.

7. Q: Do I need to drill?  
   A: Most air-press / visor kits are designed for OEM-style door-frame fit. Follow the listing install notes; WhatsApp us with your year if unsure.

---

### 5. `exhaust-systems-tips` — 30d **0** · 90d **0** · 2 SKUs · Rs. 1,549–17,500 · **thin / skewed**

| Field | Proposed |
|-------|----------|
| metaTitle (base) | `Exhaust Tips & Systems Price in Pakistan` |
| priceMode | `fromMin` (skewed high end) |
| metaDescription | `Exhaust tips and related parts from Rs. 1,549 — full systems cost more (see each card). Confirm fitment on the listing.` |

**FAQ extras:**

6. Q: Do tip-only upgrades change performance?  
   A: Tip-only accessories are mainly for look and sound character. They do not replace a full exhaust system — read the product description for what is included.

---

### 6. `car-care-cleaning` — 30d **0** · 90d **0** · 2 SKUs · Rs. 399–1,799 · **thin**

| Field | Proposed |
|-------|----------|
| metaTitle (base) | `Car Care & Cleaning Products Price in Pakistan` |
| metaDescription | `Car care and cleaning products from Rs. 399. Check size and use notes on each listing. COD on eligible items.` |

**FAQ extras:**

6. Q: Are these vehicle-specific?  
   A: Most car-care products are universal. Follow the label/instructions on the product page.

---

## B. Products — next 25 by order count (FAQ + `/cars` where VC exists)

Exclude already-FAQ’d SKUs and `CC-0004`. Ranked live 2026-10-02.

Shared on every PDP FAQ JSON-LD: COD + returns (same Batch F filter), then **2 product-specific** Qs below. Material honesty for carbon-style ABS. Mismatches → FAQ “table is source of truth” + backlog (no silent title fixes).

| # | SKU | 30d/90d | Price | Notes |
|---|-----|--------:|------:|-------|
| 1 | `CC-0022` | 2/3 | 5,499 | Corolla lower diffuser · bulky · VC Corolla 2014–2026 |
| 2 | `CC-0134` | 2/2 | 2,999 | Elantra Hybrid door handles · VC 2025–Present |
| 3 | `CC-0181` | 2/2 | 2,999 | Universal 45W charger |
| 4 | `CC-0145` | 2/2 | 1,799 | Corolla E210 Grande rear reflector · VC Corolla 2014–2026 |
| 5 | `CC-0221` | 2/2 | 5,500 | Civic Reborn steering trim · VC 2006–2011 |
| 6 | `CC-0034` | 2/2 | 5,499 | Universal 3-pc splitter · bulky |
| 7 | `CC-0121` | 2/2 | 3,999 | Civic Reborn roof spoiler · bulky · VC 2006–2012 |
| 8 | `CC-SPO-MIR-BAT` | 1/2 | 5,299 | Sportage Batman mirrors · VC 2019–2024 |
| 9 | `CC-0098` | 1/2 | 799 | City gear knob · **mismatch** title 2015–2020 vs VC City **2009–2020** |
| 10 | `CC-0196` | 1/2 | 1,999 | Corolla door handles · **mismatch** title 2015–2026 vs VC **2014–2026** (already backlog alternate) |
| 11 | `CC-TCR-EXT-SMC-CF-15` | 1/2 | 3,199 | Corolla Batman mirrors · **mismatch** title 2015–2022 vs VC **2014–2026** |
| 12 | `CC-0129` | 1/2 | 4,999 | City trunk lip · bulky · VC 2021–2026 |
| 13 | `CC-TYR-EXT-SMC-CF` | 1/2 | 3,199 | Yaris Batman mirrors · VC 2020–2026 |
| 14 | `CC-COR-BBL-E120` | 1/2 | 4,500 | Corolla E120 bumper light · VC 2002–2008 |
| 15 | `CC-0211` | 1/1 | 2,499 | Universal ambient strip 2PCS |
| 16 | `CC-INT-155` | 1/1 | 7,799 | Corolla mats · bulky · **mismatch** title 2008–2013 vs VC E140 **2009–2014** |
| 17 | `CC-INT-102` | 1/1 | 1,799 | Corolla dash mat · VC 2014–2026 |
| 18 | `CC-EXT-107` | 1/1 | 9,999 | **Severe data bug:** title Civic SI grille 2016–2021 vs VC **Toyota Aqua 2012–2026** — FAQ disclose + backlog; no `/cars` until VC fixed |
| 19 | `CC-0159` | 1/1 | 3,999 | Corolla trunk spoiler · bulky · **mismatch** title 2015–2026 vs VC **2014–2026** |
| 20 | `CC-0175` | 1/1 | 2,299 | Civic Rebirth door handles · **mismatch** title 2012–2015 vs VC **2012–2016** |
| 21 | `CC-0176` | 1/1 | 3,999 | Civic Rebirth mirror covers · **mismatch** title 2012–2015 vs VC **2012–2016** |
| 22 | `CC-0120` | 1/1 | 3,999 | Civic Reborn roof spoiler · bulky · VC 2006–2012 |
| 23 | `CC-0223` | 1/1 | 3,800 | City steering trim · VC 2021–2026 |
| 24 | `CC-0040` | 1/1 | 4,499 | Corolla spike splitter · bulky · **mismatch** title 2015–2024 vs VC **2014–Present** |
| 25 | `CC-LGT-203` | 1/1 | 8,500 | City RGB mirror indicator · **mismatch** title Honda City vs VC **Honda Classic 2009–2020** |

*(Swap #25 for `CC-0017` / `CC-0116` / `CC-0179` / `CC-0229` if you prefer denser carbon-trim continuity over the City indicator mismatch — all also 1/1.)*

---

### Exact product FAQ copy (proposed)

#### 1. `CC-0022` — Corolla X shark-fin lower diffuser · Rs. 5,499 · bulky  
Slug: `toyota-corolla-x-shark-fin-style-lower-panel-diffuser`  
VC: Toyota Corolla **2014–2026**

1. Q: Which Corolla does this fit?  
   A: Toyota Corolla 2014–2026 (E170–E210) per the vehicle compatibility table on this page.  
2. Q: Why might delivery be higher?  
   A: Body/diffuser pieces are often bulky. Bulky carts use the bulky delivery fee shown at checkout.

`/cars`: Corolla 2014–2026 path if live.

#### 2. `CC-0134` — Elantra Hybrid door handle covers · Rs. 2,999  
Slug: `carbon-fiber-door-handle-covers-hyundai-elantra-hybrid-2025-present-4pcs`  
VC: Hyundai Elantra Hybrid **2025–Present**

1. Q: Which Elantra does this fit?  
   A: Hyundai Elantra Hybrid 2025–Present per the vehicle compatibility table on this page.  
2. Q: Is it real carbon fiber?  
   A: No. ABS with a carbon-style finish unless the description says otherwise.

#### 3. `CC-0181` — 4-in-1 45W fast car charger · Rs. 2,999 · universal  
Slug: `4-in-1-45w-fast-car-charger-usb-type-c-built-in-ios-android-cable`

1. Q: Is this a universal fit?  
   A: Yes. It is a 12V car charger with USB/Type-C leads — not vehicle-specific. Confirm plug type and cable set on the listing.  
2. Q: Does it charge phones and tablets?  
   A: It is sold as a multi-port fast car charger (see wattage and ports on the product page). Use the cable/port combo your device supports.

#### 4. `CC-0145` — Corolla E210 Grande LED rear reflector · Rs. 1,799  
Slug: `corolla-e210-grande-led-rear-reflector`  
VC: Toyota Corolla **2014–2026** (table); title emphasizes Grande / Grande X E210

1. Q: Which Corolla does this fit?  
   A: The vehicle compatibility table lists Toyota Corolla 2014–2026 (E170–E210). The title highlights Grande / Grande X E210 styling — use the table plus the product photos as the fitment source of truth for your trim.  
2. Q: Is it plug-and-play?  
   A: Rear bumper reflector LEDs are typically OEM-style replacements. Follow the listing wiring notes; WhatsApp us with your year/trim if unsure.

#### 5. `CC-0221` — Civic Reborn carbon steering trim · Rs. 5,500  
Slug: `honda-civic-reborn-2006-2011-carbon-fiber-steering-trim`  
VC: Honda Civic **2006–2011** (Reborn notes)

1. Q: Which Civic does this fit?  
   A: Honda Civic Reborn 2006–2011 per the vehicle compatibility table on this page.  
2. Q: Is it real carbon fiber?  
   A: No. Carbon-style ABS trim unless the description says otherwise.

#### 6. `CC-0034` — Universal 3-piece front splitter · Rs. 5,499 · bulky · universal  
Slug: `universal-3-piece-front-bumper-splitter-ground-style-abs`

1. Q: Is this a universal fit?  
   A: Yes. It is a universal 3-piece ABS ground-style front splitter. Confirm look and install method against your bumper in the photos.  
2. Q: Why might delivery be higher?  
   A: Splitters are often bulky. Bulky carts use the bulky delivery fee shown at checkout.

#### 7. `CC-0121` — Civic Reborn ABS roof spoiler · Rs. 3,999 · bulky  
Slug: `honda-civic-reborn-2006-2012-abs-roof-spoiler`  
VC: Honda Civic Reborn **2006–2012**

1. Q: Which Civic does this fit?  
   A: Honda Civic Reborn 2006–2012 per the vehicle compatibility table on this page.  
2. Q: Why might delivery be higher?  
   A: Spoilers are often bulky / special-courier. The fee is shown at checkout.

#### 8. `CC-SPO-MIR-BAT` — Sportage Batman mirrors · Rs. 5,299  
Slug: `kia-sportage-batman-style-side-mirror-covers`  
VC: KIA Sportage **2019–2024**

1. Q: Which Sportage does this fit?  
   A: KIA Sportage 2019–2024 per the vehicle compatibility table on this page.  
2. Q: How does it install?  
   A: Batman-style covers are typically clip-on ABS over the factory mirror housing. Follow the product photos; WhatsApp us if your mirror shape differs.

#### 9. `CC-0098` — City gear knob cover · Rs. 799 · **disclose**  
Slug: `honda-city-2015-2020-carbon-fiber-gear-lever-knob-cover`  
VC: Honda City Classic **2009–2020** · Title **2015–2020**

1. Q: Which City does this fit?  
   A: The vehicle compatibility table lists Honda City 2009–2020. The product title lists 2015–2020 — use the table on this page as the fitment source of truth.  
2. Q: Is it real carbon fiber?  
   A: No. ABS with a carbon-style finish unless the description says otherwise.

#### 10. `CC-0196` — Corolla door handle covers · Rs. 1,999 · **disclose**  
Slug: `toyota-corolla-2015-door-handle-covers-carbon-fiber-glossy-black`  
VC: Corolla **2014–2026** · Title **2015–2026**

1. Q: Which Corolla does this fit?  
   A: The vehicle compatibility table lists Toyota Corolla 2014–2026 (E170–E210). The product title lists 2015–2026 — use the table on this page as the fitment source of truth.  
2. Q: Is it real carbon fiber?  
   A: No. ABS with a carbon-style / glossy black finish unless the description says otherwise.

#### 11. `CC-TCR-EXT-SMC-CF-15` — Corolla Batman mirrors · Rs. 3,199 · **disclose**  
Slug: `toyota-corolla-2015-2022-batman-style-side-mirror-cover`  
VC: Corolla **2014–2026** · Title **2015–2022**

1. Q: Which Corolla does this fit?  
   A: The vehicle compatibility table lists Toyota Corolla 2014–2026 (E170–E210). The product title lists 2015–2022 — use the table on this page as the fitment source of truth.  
2. Q: How does it install?  
   A: Batman-style covers are typically clip-on ABS over the factory mirror housing. Follow the product photos.

#### 12. `CC-0129` — City RS trunk lip spoiler · Rs. 4,999 · bulky  
Slug: `honda-city-new-model-trunk-lip-spoiler-2021-2026`  
VC: Honda City **2021–2026**

1. Q: Which City does this fit?  
   A: Honda City 2021–2026 (2021–Present) per the vehicle compatibility table on this page.  
2. Q: Why might delivery be higher?  
   A: Spoilers are often bulky. Bulky carts use the bulky delivery fee shown at checkout.

#### 13. `CC-TYR-EXT-SMC-CF` — Yaris Batman mirrors · Rs. 3,199  
Slug: `batman-style-side-mirror-cover-toyota-yaris-2020-2026`  
VC: Toyota Yaris **2020–2026**

1. Q: Which Yaris does this fit?  
   A: Toyota Yaris 2020–2026 per the vehicle compatibility table on this page.  
2. Q: How does it install?  
   A: Batman-style covers are typically clip-on ABS over the factory mirror housing. Follow the product photos.

#### 14. `CC-COR-BBL-E120` — Corolla E120 RGB bumper light · Rs. 4,500  
Slug: `toyota-corolla-e120-dynamic-back-bumper-light-rgb-2002-2008`  
VC: Toyota Corolla E120 **2002–2008**

1. Q: Which Corolla does this fit?  
   A: Toyota Corolla E120 2002–2008 per the vehicle compatibility table on this page.  
2. Q: Is install DIY?  
   A: Bumper LED kits usually need a power tap and mounting along the rear bumper. Follow the listing; use a trusted installer if you are not comfortable with wiring.

#### 15. `CC-0211` — Dashboard ambient strip 2PCS · Rs. 2,499 · universal  
Slug: `car-dashboard-ambient-light-strip-premium-2pcs`

1. Q: Is this a universal fit?  
   A: Yes. It is a universal dashboard ambient LED strip set (2 pcs). Check length and adhesive notes on the listing.  
2. Q: Does install require removing trim?  
   A: Most strips need routing and sticking along the dash edge. Use a trusted installer if you are not comfortable with interior work.

#### 16. `CC-INT-155` — Corolla TPE floor mats · Rs. 7,799 · bulky · **disclose**  
Slug: `toyota-corolla-2008-2013-tpe-floor-mats-premium`  
VC: Toyota E140 **2009–2014** · Title **2008–2013**

1. Q: Which Corolla does this fit?  
   A: The vehicle compatibility table lists Toyota Corolla E140 2009–2014. The title lists 2008–2013 — use the table on this page as the fitment source of truth.  
2. Q: Why might delivery be higher?  
   A: Floor mats are often bulky. Bulky carts use the bulky delivery fee shown at checkout.

#### 17. `CC-INT-102` — Corolla velvet dashboard mat · Rs. 1,799  
Slug: `toyota-corolla-2014-2026-velvet-dashboard-mat`  
VC: Toyota E170–E210 **2014–2026**

1. Q: Which Corolla does this fit?  
   A: Toyota Corolla 2014–2026 (E170–E210) per the vehicle compatibility table on this page.  
2. Q: Is it universal?  
   A: No. It is a vehicle-specific dashboard mat — confirm your year against the table before ordering.

#### 18. `CC-EXT-107` — Civic SI grille · Rs. 9,999 · **SEVERE mismatch — FAQ only, no silent VC/title fix**  
Slug: `honda-civic-diamond-style-si-grille-2016-2021-glossy-black-abs`  
Title: Honda Civic Diamond Style SI Grille **2016–2021**  
VC currently: **Toyota Aqua 2012–2026** (wrong — do not invent Civic VC)

1. Q: Which car does this fit?  
   A: The product title describes a Honda Civic SI-style grille for 2016–2021, but the vehicle compatibility table currently lists Toyota Aqua 2012–2026. Do not order from the table alone — WhatsApp us with your car year and a grille photo before purchasing. We are correcting the fitment data.  
2. Q: Is it ABS?  
   A: Yes. It is listed as glossy black ABS. Confirm finish and attach method on the product photos.

**Do not add `/cars` links until VC is corrected by supplier/admin.**

#### 19. `CC-0159` — Corolla RS trunk spoiler · Rs. 3,999 · bulky · **disclose**  
Slug: `toyota-corolla-2015-2026-rs-style-trunk-spoiler-abs`  
VC: Corolla **2014–2026** · Title **2015–2026**

1. Q: Which Corolla does this fit?  
   A: The vehicle compatibility table lists Toyota Corolla 2014–2026 (E170–E210). The title lists 2015–2026 — use the table as the source of truth.  
2. Q: Why might delivery be higher?  
   A: Spoilers are often bulky. Bulky carts use the bulky delivery fee shown at checkout.

#### 20. `CC-0175` — Civic Rebirth door handle covers · Rs. 2,299 · **disclose**  
Slug: `honda-civic-rebirth-2012-2015-carbon-door-handle-cover-full-set`  
VC: Civic **2012–2016** · Title **2012–2015**

1. Q: Which Civic does this fit?  
   A: The vehicle compatibility table lists Honda Civic Rebirth 2012–2016. The product title lists 2012–2015 — use the table on this page as the fitment source of truth.  
2. Q: Is it real carbon fiber?  
   A: No. ABS with a carbon-style finish unless the description says otherwise.

#### 21. `CC-0176` — Civic Rebirth side mirror covers · Rs. 3,999 · **disclose**  
Slug: `honda-civic-rebirth-2012-2015-carbon-side-mirror-cover-pair`  
VC: Civic **2012–2016** · Title **2012–2015**

1. Q: Which Civic does this fit?  
   A: The vehicle compatibility table lists Honda Civic Rebirth 2012–2016. The product title lists 2012–2015 — use the table on this page as the fitment source of truth.  
2. Q: Is it real carbon fiber?  
   A: No. ABS with a carbon-style finish unless the description says otherwise.

#### 22. `CC-0120` — Civic Reborn ABS roof spoiler · Rs. 3,999 · bulky  
Slug: `honda-civic-reborn-2006-2012-abs-plastic-roof-spoiler`  
VC: Civic Reborn **2006–2012**

1. Q: Which Civic does this fit?  
   A: Honda Civic Reborn 2006–2012 per the vehicle compatibility table on this page.  
2. Q: Why might delivery be higher?  
   A: Spoilers are often bulky. The fee is shown at checkout.

#### 23. `CC-0223` — City carbon steering trim · Rs. 3,800  
Slug: `honda-city-2021-2026-carbon-fiber-steering-trim`  
VC: Honda City **2021–2026**

1. Q: Which City does this fit?  
   A: Honda City 2021–2026 per the vehicle compatibility table on this page.  
2. Q: Is it real carbon fiber?  
   A: No. Carbon-style ABS trim unless the description says otherwise.

#### 24. `CC-0040` — Corolla spike splitter canard 3PCS · Rs. 4,499 · bulky · **disclose**  
Slug: `toyota-corolla-2015-2024-front-spike-splitter-canard-3pcs`  
VC: Corolla **2014–Present** · Title **2015–2024**

1. Q: Which Corolla does this fit?  
   A: The vehicle compatibility table lists Toyota Corolla 2014–Present (E170–E210). The product title lists 2015–2024 — use the table on this page as the fitment source of truth.  
2. Q: Why might delivery be higher?  
   A: Splitters/canards are often bulky. Bulky carts use the bulky delivery fee shown at checkout.

#### 25. `CC-LGT-203` — City RGB side mirror indicator · Rs. 8,500 · **disclose**  
Slug: `honda-city-rgb-side-mirror-indicator-led-dynamic-mirror-lights`  
Title: Honda City … · VC: **Honda Classic 2009–2020**

1. Q: Which City does this fit?  
   A: The vehicle compatibility table lists Honda Classic 2009–2020 (classic City generation). The product title says Honda City — use the table on this page as the fitment source of truth and confirm your mirror housing against the photos before ordering.  
2. Q: Is install DIY?  
   A: Mirror indicator LEDs usually need opening the mirror housing and a signal tap. Use a trusted installer if you are not comfortable with mirror wiring.

---

## C. Data-quality backlog adds (if this product batch is approved)

Add as **FAQ-disclosed only** (no silent title/VC fixes), same rule as prior rounds:

| SKU | Conflict |
|-----|----------|
| **CC-0098** | Title City **2015–2020** vs VC **2009–2020** |
| **CC-0196** | Title **2015–2026** vs VC **2014–2026** (promote from alternates → FAQ-disclosed) |
| **CC-TCR-EXT-SMC-CF-15** | Title **2015–2022** vs VC **2014–2026** |
| **CC-INT-155** | Title **2008–2013** vs VC E140 **2009–2014** |
| **CC-0159** | Title **2015–2026** vs VC **2014–2026** |
| **CC-0175** | Title Rebirth **2012–2015** vs VC **2012–2016** |
| **CC-0176** | Title Rebirth **2012–2015** vs VC **2012–2016** |
| **CC-0040** | Title **2015–2024** vs VC **2014–Present** |
| **CC-EXT-107** | Title Civic SI grille **2016–2021** vs VC **Toyota Aqua 2012–2026** — **severe; needs supplier/admin VC repair** |
| **CC-LGT-203** | Title Honda City vs VC **Honda Classic 2009–2020** |

After these, FAQ-disclosed ≈ **32** (22 + ~10), total tracked ≈ **37** (accounting for CC-0196 already listed under alternates).

---

## D. What this round is *not*

- No parent hubs (`exterior` / `interior` / `led-lighting` / `carbon-fiber`).  
- No `rear-reflectors` / `sun-shades` (cannibalization / too thin).  
- No retouch of Batches 1–3/F categories or FAQ SKUs.  
- No silent title or VC edits.

---

## Ask

Reply with which pieces to write, e.g.:

- `Cats: all 6` or `Cats: emergency-safety + air-press only`  
- `Products: all 25` or `Products: #1–15 only` or drop `CC-EXT-107` until VC is fixed  
- Any FAQ wording edits  

**No production writes until that sign-off.**
