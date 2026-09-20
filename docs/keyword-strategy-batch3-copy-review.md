# Batch 3 — exact meta + FAQ copy for review (NO WRITES YET)

**Date:** 2026-09-21  
**Status:** Copy review only. Do not publish until you sign off per item.  
**Method:** Orders collection, same filters as Batch 1/2 (exclude cancelled/refunded/test orders). Ranked by **30d**, with **90d** used to break ties and fill the tier.  
**Shared policy answers** = live `getFaqItems()` / `returnsFaqAnswer()` / `standardDeliveryFeeStatement()` — same COD/fees/ETA/returns/fitment wording as Batches 1–2 (fees always via store-policy helpers at write-time, never hardcoded literals in code).

### Already covered (do not retouch)

**Categories (16):** `universal-accessories`, `carbon-fiber-accessories`, `led-indicator-lights`, `interior-lights`, `quarter-window-louvers`, `side-mirror-covers`, `led-headlights-bulbs`, `splitters-side-skirts`, `spoilers-diffusers`, `sos-flasher-led-lights`, `steering-wheel-covers`, `door-handle-covers`, `body-kits-extensions`, `backlights-tail-lamps`, `front-grilles`, `gadgets`

**Products (~29 FAQ SKUs):** Batch 1 + Batch 2 set including `CC-UNI-EXT-BCC-RD`, `CC-0194`, `CC-0156`, `CC-0157`, `CC-0174`, `CC-HON-INT-SMN-CF-1`, `CC-S05-MIR-BAT`, `CC-COR-MIRROR-3`, `CC-UNI-INT-GKN-TOY`, and all Batch 2 B1–B20. **`CC-0004` remains hard-excluded.**

### Selection notes

- **Hub categories** `exterior` / `interior` / `led-lighting` lead uncovered order volume but have **extreme price skew** (projector headlights / full interior kits). Same treatment as Batch 2 headlights: **“from Rs. {min}”**, not a compact range band.
- Thin catalogs (`carbon-fiber` = 1 SKU, `hanging-perfumes`) skipped in favour of denser shelves.
- Titles = **base only** in Mongo. Brand applied via `buildBrandedAbsoluteTitle` (max 60). Two bases below intentionally drop the brand suffix when branded length would exceed 60.

Prices below are **live at proposal time**; recompute at write-time.

---

## A. Categories — exact meta + FAQ (proposed 10)

### Shared extras pattern

Unless noted, every category FAQ = shared COD + fees + ETA + returns + fitment, then the price Q, then any category-specific extras.

---

### 1. `exterior` — 30d **20** orders · 90d **35** · 65 active SKUs · Rs. 1,390–57,999 (skewed)

| Field | Exact text |
|-------|------------|
| metaTitle (base) | `Exterior Accessories Price in Pakistan` |
| Branded title | `Exterior Accessories Price in Pakistan \| Crazzycars.pk` (54 chars) |
| metaDescription | `Car exterior accessories from Rs. 1,390 — full headlight and tail-lamp assemblies cost more (see each product card). Confirm fitment on the listing. COD on eligible items.` |
| shortDescription append | `Prices on this page start from Rs. 1,390 (live catalog); full lighting assemblies are higher — check the product card.` |

**FAQ extras:**

6. Q: What do exterior accessories cost on CrazzyCars?  
   A: Prices on this category currently start from Rs. 1,390. Full headlight and tail-lamp assemblies are higher — always check the product card for the live price. Prices change with stock and deals.

7. Q: Is everything on this page vehicle-specific?  
   A: No. This hub mixes universal and vehicle-specific exterior parts. Open each product and check the vehicle compatibility table (or “universal” note) before ordering.

---

### 2. `interior` — 30d **5** · 90d **7** · 76 SKUs · Rs. 199–38,999 (skewed)

| Field | Exact text |
|-------|------------|
| metaTitle | `Interior Accessories Price in Pakistan` |
| Branded | OK (54) |
| metaDescription | `Car interior accessories from Rs. 199 — complete carbon-style trim kits cost more (see each product card). Confirm fitment on the listing. COD on eligible items.` |
| shortDescription append | `Prices on this page start from Rs. 199 (live catalog); full interior trim kits are higher — check the product card.` |

**FAQ extras:**

6. Q: What do interior accessories cost on CrazzyCars?  
   A: Prices on this category currently start from Rs. 199. Complete interior trim kits are higher — always check the product card for the live price. Prices change with stock and deals.

7. Q: Are carbon-look interior parts real carbon fiber?  
   A: Most carbon-look interior trims on CrazzyCars are ABS plastic with a carbon-style finish (not fiber). Read the product description on each listing.

---

### 3. `led-lighting` — 30d **3** · 90d **6** · 14 SKUs · Rs. 499–18,500 (skewed)

| Field | Exact text |
|-------|------------|
| metaTitle | `LED & Lighting Price in Pakistan` |
| Branded | OK (48) |
| metaDescription | `LED and decorative car lighting from Rs. 499 — projector and multi-piece kits cost more (see each product card). Confirm fitment or bulb type on the listing. COD on eligible items.` |
| shortDescription append | `Prices on this page start from Rs. 499 (live catalog); projector kits are higher — check the product card.` |

**FAQ extras:**

6. Q: What does LED lighting cost on CrazzyCars?  
   A: Prices on this category currently start from Rs. 499. Projector and multi-piece lighting kits are higher — always check the product card for the live price.

7. Q: How is this different from LED Headlights & Bulbs?  
   A: This LED & Lighting shelf mixes decorative and specialty LED products. Dedicated headlight bulbs and projector headlight assemblies also appear under LED Headlights & Bulbs — use the product title and photos to pick the right page.

---

### 4. `key-covers-key-chains` — 30d **2** · 90d **2** · 38 SKUs · Rs. 1,399–1,699

| Field | Exact text |
|-------|------------|
| metaTitle | `Key Covers & Key Chains Price in Pakistan` |
| Branded | OK (57) |
| metaDescription | `Metal key covers and key chains from Rs. 1,399 to Rs. 1,699. Match your key/button layout on the product page. COD nationwide on eligible items.` |
| shortDescription append | `Prices on this page currently range from Rs. 1,399 to Rs. 1,699 (live catalog).` |

**FAQ extras:**

6. Q: What price range do Key Covers & Key Chains sell for on CrazzyCars?  
   A: On this category, live prices currently range from Rs. 1,399 to Rs. 1,699. Prices change with stock and deals — check the product card for the current price.

7. Q: How do I pick the right key cover?  
   A: Match your key’s brand and button layout to the product title and photos (for example 3-button vs 4-button Civic covers). If unsure, WhatsApp a clear photo of your key.

---

### 5. `floor-mats` — 30d **0** · 90d **1** · 25 SKUs · Rs. 4,599–11,199 *(included for catalog density + bulky fee relevance; low recent orders)*

| Field | Exact text |
|-------|------------|
| metaTitle | `Floor Mats Price in Pakistan` |
| Branded | OK (44) |
| metaDescription | `Car floor mats and trunk mats from Rs. 4,599 to Rs. 11,199. Delivery is Rs. 500 when the cart includes bulky items (floor mats count). Confirm vehicle years on the listing.` |
| shortDescription append | `Prices on this page currently range from Rs. 4,599 to Rs. 11,199 (live catalog).` |

**FAQ extras:**

6. Q: What price range do Floor Mats sell for on CrazzyCars?  
   A: On this category, live prices currently range from Rs. 4,599 to Rs. 11,199. Prices change with stock and deals — check the product card for the current price.

7. Q: Why is delivery often Rs. 500 for mats?  
   A: Floor mats are treated as bulky. Delivery is Rs. 500 when the cart includes bulky items, or Rs. 250 for regular-only carts. Shipping is paid in advance; the rest is Cash on Delivery where eligible.

---

### 6. `dashboard-mats` — 30d **1** · 90d **1** · 32 SKUs · **all Rs. 1,799**

| Field | Exact text |
|-------|------------|
| metaTitle | `Dashboard Mats Price in Pakistan` |
| Branded | OK (48) |
| metaDescription | `Vehicle-specific velvet dashboard mats currently Rs. 1,799. Confirm your make/model/years on the product page. COD nationwide on eligible items.` |
| shortDescription append | `Products on this page are currently Rs. 1,799 each (live catalog).` |

**FAQ extras:**

6. Q: What do dashboard mats cost on CrazzyCars?  
   A: On this category, live prices are currently Rs. 1,799 per mat. Prices change with stock and deals — check the product card for the current price.

7. Q: Are these universal?  
   A: No. These are vehicle-specific dashboard mats. Open the product page and confirm your car’s make, model, and years before ordering.

---

### 7. `fog-lamps-drl-covers` — 30d **0** · 90d **1** · 12 SKUs · Rs. 5,999–13,999

| Field | Exact text |
|-------|------------|
| metaTitle | `Fog Lamps & DRL Covers Price in Pakistan` |
| Branded | OK (56) |
| metaDescription | `Fog lamps and DRL covers from Rs. 5,999 to Rs. 13,999. Confirm chassis years and lamp type on each product page. COD on eligible items.` |
| shortDescription append | `Prices on this page currently range from Rs. 5,999 to Rs. 13,999 (live catalog).` |

**FAQ extras:**

6. Q: What price range do Fog Lamps & DRL Covers sell for on CrazzyCars?  
   A: On this category, live prices currently range from Rs. 5,999 to Rs. 13,999. Prices change with stock and deals — check the product card for the current price.

---

### 8. `multimedia-steering-controls` — 30d **1** · 90d **3** · 6 SKUs · Rs. 7,500–7,999

| Field | Exact text |
|-------|------------|
| metaTitle | `Multimedia Steering Controls Price in Pakistan` |
| Branded | **base only** (branded would be 62 > 60) |
| metaDescription | `Steering multimedia control kits from Rs. 7,500 to Rs. 7,999. Confirm vehicle fitment and cable type on the product page. COD on eligible items.` |
| shortDescription append | `Prices on this page currently range from Rs. 7,500 to Rs. 7,999 (live catalog).` |

**FAQ extras:**

6. Q: What price range do Multimedia Steering Controls sell for on CrazzyCars?  
   A: On this category, live prices currently range from Rs. 7,500 to Rs. 7,999. Prices change with stock and deals — check the product card for the current price.

7. Q: Do these need professional install?  
   A: Many kits include a spiral/clock-spring cable and wire into the steering column. Follow the listing notes; if you are unsure about wiring, use a trusted installer or WhatsApp us with your car year and model.

---

### 9. `air-freshener-decoration` — 30d **1** · 90d **4** · 4 SKUs · Rs. 149–1,599

| Field | Exact text |
|-------|------------|
| metaTitle | `Air Fresheners & Decor Price in Pakistan` |
| Branded | OK (55) — shortened vs category display name so brand fits ≤60 |
| metaDescription | `Cabin air fresheners and light décor from Rs. 149 to Rs. 1,599. Universal fit unless a listing says otherwise. COD nationwide on eligible items.` |
| shortDescription append | `Prices on this page currently range from Rs. 149 to Rs. 1,599 (live catalog).` |

**FAQ extras:**

6. Q: What price range do air fresheners and décor sell for on CrazzyCars?  
   A: On this category, live prices currently range from Rs. 149 to Rs. 1,599. Prices change with stock and deals — check the product card for the current price.

---

### 10. `fender-light` — 30d **2** · 90d **3** · 2 SKUs · Rs. 6,499–6,500

| Field | Exact text |
|-------|------------|
| metaTitle | `Fender Light Price in Pakistan` |
| Branded | OK (46) |
| metaDescription | `Fender / side-marker style lights from Rs. 6,499 to Rs. 6,500. Confirm Civic or other listed years on the product page. COD on eligible items.` |
| shortDescription append | `Prices on this page currently range from Rs. 6,499 to Rs. 6,500 (live catalog).` |

**FAQ extras:**

6. Q: What do fender lights cost on CrazzyCars?  
   A: On this category, live prices currently range from Rs. 6,499 to Rs. 6,500. Prices change with stock and deals — check the product card for the current price.

---

**Optional swap (not in the 10):** `emergency-safety` (3 SKUs, Rs. 2,999–7,500) if you prefer safety kits over the thin `fender-light` shelf.

---

## B. Products — FAQ + `/cars` links (proposed 20)

Shared on every PDP FAQ: **COD** + **returns** (same as Batches 1–2), then product-specific Qs.  
`/cars/...` links only where a real VC / vehicles row exists (via existing `resolveProductCarLinks`). Universals: no false car links.

New title-vs-VC mismatches found here are **FAQ-disclosed only** and listed for the backlog — **no silent title fixes**, no new `securityHold` unless fitment risk is real.

---

### 1. `CC-0207` — SOS Police Strip Light · Rs. 999 · 30d **3**  
Slug: `sos-police-strip-light-red-blue` · VC: none (universal)

1. Q: Is this a universal fit?  
   A: Yes. It is listed as a universal SOS / police-style red-blue LED strip strobe. Check mount style and power notes on this page before ordering.

2. Q: Is it the same as the grill 4×4 police light?  
   A: No. This is a strip-style strobe. The grill 4×4 police light is a different product — compare photos and titles before checkout.

---

### 2. `CC-0095` — Civic Reborn hand brake cover · Rs. 1,999 · 30d **3**  
Slug: `honda-civic-reborn-2007-2012-forged-carbon-hand-brake-cover`  
VC: Honda Civic Reborn **2006–2012** · Title years **2007–2012** → **disclose**

1. Q: Which Civic does this fit?  
   A: The vehicle compatibility table on this page lists Honda Civic Reborn 2006–2012. The product title lists 2007–2012 — use the table on this page as the fitment source of truth.

2. Q: Is it real carbon fiber?  
   A: No. It is a forged carbon-texture ABS overlay for the hand brake, per the product description. Snap-on; no tools required.

`/cars`: `honda-civic-reborn-2006-2012`

---

### 3. `CC-0144` — Universal HUD · Rs. 3,499 · 30d **3**  
Slug: `car-heads-up-display-hud` · VC: none

1. Q: Is this a universal fit?  
   A: Yes. It is listed as a universal heads-up display that projects speed and driving data. Check the listing for power/OBD notes before ordering.

2. Q: Does it need professional install?  
   A: Most HUDs are DIY plug-in devices. Follow the product instructions; WhatsApp us if your car’s power setup is unclear.

---

### 4. `CC-0202` — Civic X Batman side mirrors · Rs. 3,399 · 30d **3**  
Slug: `honda-civic-x-batman-style-side-mirror-cover`  
VC: Honda Civic X **2016–2021** (aligned)

1. Q: Which Civic does this fit?  
   A: Honda Civic X 2016–2021 per the vehicle compatibility table on this page.

2. Q: How does it install?  
   A: The listing describes clip-on ABS Batman-style covers with no tools or body modifications. Follow the product photos and notes.

`/cars`: `honda-civic-x-2016-2021`

---

### 5. `CC-UNI-LGT-IND-W40` — Bright LED indicator bulbs 2PCS · Rs. 1,199 · 30d **3**  
Slug: `bright-led-indicator-bulbs-2-pcs` · VC: none (universal)

1. Q: Is this a universal fit?  
   A: Yes. These are listed as universal bright LED indicator bulbs (2 pcs). Confirm the bulb base/socket on your car against the listing before ordering.

2. Q: Will they work as a drop-in halogen replacement?  
   A: They are sold as brighter, faster LED turn-signal bulbs versus halogen. Socket compatibility still depends on your car — check the product notes or WhatsApp a bulb photo.

---

### 6. `CC-UNI-AMB-DYN-10` — Dynamic ambient interior lights · Rs. 6,500 · 30d **2**  
Slug: `premium-dynamic-ambient-interior-lights` · VC: none

1. Q: Is this a universal fit?  
   A: Yes. It is listed as a multi-point dynamic ambient interior light kit for cars. Check the listing for included points and controller notes.

2. Q: Does install require removing trim?  
   A: Ambient kits usually need routing wires and placing strips behind or along trim. Follow the product guide; use a trusted installer if you are not comfortable with interior trim work.

---

### 7. `CC-0206` — Universal rear bumper lip · Rs. 1,199 · 30d **2**  
Slug: `car-rear-bumper-splitter-simple-universal` · VC: none

1. Q: Is this a universal fit?  
   A: Yes. It is a simple universal rear bumper lip in gloss black ABS — a single rear lip, not a full body kit, per the product description.

2. Q: Why might delivery be higher?  
   A: Splitters and lips are often flagged bulky. Delivery follows the store bulky fee when the cart includes bulky items; the exact fee is shown at checkout.

---

### 8. `CC-0178` — Civic Reborn door handle covers · Rs. 2,199 · 30d **2**  
Slug: `honda-civic-reborn-2006-2012-carbon-door-handle-cover-set`  
VC: Civic Reborn **2006–2012** (aligned with title)

1. Q: Which Civic does this fit?  
   A: Honda Civic Reborn 2006–2012 per the vehicle compatibility table on this page.

2. Q: Is it real carbon fiber?  
   A: No. It is ABS plastic with a carbon-style texture, per the product description. OEM-style fit without modification.

`/cars`: `honda-civic-reborn-2006-2012`

---

### 9. `CC-0007` — Corolla power window trims 4PCS · Rs. 4,999 · 30d **2**  
Slug: `toyota-corolla-2015-2023-power-window-carbon-fiber-trims-4pcs`  
VC: Corolla E170 **2014–2026** · Title **2015–2023** → **disclose**

1. Q: Which Corolla does this fit?  
   A: The vehicle compatibility table on this page lists Toyota Corolla 2014–2026 (E170 generation). The product title lists 2015–2023 — use the table on this page as the fitment source of truth.

2. Q: Is it real carbon fiber?  
   A: No. It is a 4-piece carbon-style ABS power-window switch trim set with peel-and-stick install, per the product description.

`/cars`: `toyota-corolla-e170-2014-2026`

---

### 10. `CC-0147` — Corolla E140 rear reflector LEDs · Rs. 1,799 · 30d **2**  
Slug: `corolla-e140-led-rear-reflector`  
VC: E140 **2009–2014** · Title **2008–2013** → **disclose**

1. Q: Which Corolla does this fit?  
   A: The vehicle compatibility table on this page lists Toyota Corolla E140 2009–2014. The product title lists 2008–2013 — use the table on this page as the fitment source of truth before ordering.

2. Q: What functions are included?  
   A: The listing is a 3-in-1 LED rear bumper reflector set: brake + DRL + turn signal, described as plug-and-play OEM-style replacement.

`/cars`: `toyota-corolla-e140-2009-2014`

---

### 11. `CC-OX7-MIR-BAT` — Oshan X7 Batman mirrors · Rs. 6,499 · 30d **2** / 90d **3**  
Slug: `changan-oshan-x7-batman-style-side-mirror-covers`  
VC: Changan Oshan X7 **2022–present** (title has no years — OK)

1. Q: Which Oshan X7 does this fit?  
   A: Changan Oshan X7 from 2022–present per the vehicle compatibility table on this page.

2. Q: What finishes are available?  
   A: The listing offers carbon-style or gloss black Batman-style covers. Confirm the finish option on this page before ordering.

`/cars`: `changan-oshanx7-2022-present`

---

### 12. `CC-0169` — Civic 11th Gen roof spoiler · Rs. 5,999 · 30d **2** / 90d **3**  
Slug: `honda-civic-11th-gen-2022-present-roof-spoiler`  
VC: Civic 11th Gen **2022–present** (aligned)

1. Q: Which Civic does this fit?  
   A: Honda Civic 11th Gen 2022–present per the vehicle compatibility table on this page.

2. Q: Is delivery different for spoilers?  
   A: Roof or trunk spoilers often use a special courier fee shown at checkout, and bulky carts use the bulky delivery rate. Check the fee at checkout before paying.

`/cars`: `honda-civic-11th-gen-2022-present`

---

### 13. `CC-0108` — Civic X door panel trims 4PCS · Rs. 4,999 · 30d **2**  
Slug: `honda-civic-x-2016-2021-carbon-fiber-interior-door-panel-trims-4pcs`  
VC: Civic X **2016–2021** (aligned)

1. Q: Which Civic does this fit?  
   A: Honda Civic X 2016–2021 per the vehicle compatibility table on this page.

2. Q: Is it real carbon fiber?  
   A: No. It is a 4-piece carbon-texture ABS interior door-panel trim set with adhesive backing, per the product description.

`/cars`: `honda-civic-x-2016-2021`

---

### 14. `CC-0209` — RGB underglow kit · Rs. 5,490 · 30d **2**  
Slug: `dynamic-car-underglow-lights` · VC: none

1. Q: Is this a universal fit?  
   A: Yes. It is listed as a universal dynamic RGB LED underbody kit with remote control (color, breathing, strobe, and static modes).

2. Q: Is it waterproof?  
   A: The listing describes waterproof strips for underbody use. Follow the product install notes for cable routing and ground clearance.

---

### 15. `CC-0118` — Yaris trunk lip spoiler · Rs. 4,999 · 30d **2**  
Slug: `toyota-yaris-2020-2026-trunk-lip-spoiler-abs-plastic`  
VC: Toyota **Yaris** 2020–present **and** Toyota **Yaris Cross** 2020–present · Title says **Yaris 2020–2026** only → **disclose** (possible false Cross row)

1. Q: Which Toyota does this fit?  
   A: The vehicle compatibility table on this page lists Toyota Yaris 2020–present and also Toyota Yaris Cross 2020–present. The product title is written for Yaris 2020–2026 — use the table (and product photos) as the fitment source of truth; WhatsApp us if you drive a Yaris Cross and need confirmation.

2. Q: Is this a full body kit?  
   A: No. It is a single ABS trunk lip spoiler, not a full body kit, per the product description.

`/cars`: both linked vehicles from the table (existing linker behaviour); disclosure above is required.

---

### 16. `CC-0146` — Corolla E170 rear reflector LEDs · Rs. 1,799 · 30d **2**  
Slug: `corolla-e170-led-rear-reflector`  
VC: E170 **2014–2026** · Title **2014–2020** → **disclose**

1. Q: Which Corolla does this fit?  
   A: The vehicle compatibility table on this page lists Toyota Corolla E170 2014–2026. The product title lists 2014–2020 — use the table on this page as the fitment source of truth.

2. Q: What functions are included?  
   A: The listing is a 3-in-1 LED rear bumper reflector set: brake + DRL + turn signal, described as plug-and-play stock reflector replacement.

`/cars`: `toyota-corolla-e170-2014-2026`

---

### 17. `CC-0088` — City Modulo-style body kit · Rs. 13,999 · 30d **2** / 90d **3**  
Slug: `honda-city-2021-2025-modulo-style-body-kit-fibreglass`  
VC: City **2021–present** · Title **2021–2025** → **disclose** · **body kit → no COD**

1. Q: Can I use Cash on Delivery on this body kit?  
   A: No. This is a body kit, so Cash on Delivery is not available. Pay the full order with JazzCash, Meezan, or bank transfer at checkout, then send your payment screenshot on WhatsApp. See our Cash on Delivery page for details.

2. Q: Which City years does this fit?  
   A: The vehicle compatibility table on this page lists Honda City 2021–present. The product title lists 2021–2025 — use the table on this page as the fitment source of truth.

3. Q: What material is it?  
   A: Unpainted fibreglass Modulo-style kit (front, side skirts, and rear) — paint to match your City, per the product description.

`/cars`: `honda-city-2021-present`

---

### 18. `CC-0155` — City door handle covers · Rs. 2,299 · 90d **3**  
Slug: `honda-city-2020-2026-carbon-door-handle-cover-abs`  
VC: City **2021–present** · Title **2020–2026** → **disclose** (same pattern as CC-0154)

1. Q: Which City years does this fit?  
   A: The vehicle compatibility table on this page lists Honda City 2021–present. The product title lists 2020–2026 — use the table on this page as the fitment source of truth.

2. Q: Is it real carbon fiber?  
   A: No. It is ABS plastic with a carbon-style texture for all four handles, snap-on with no drilling, per the product description.

`/cars`: `honda-city-2021-present`

---

### 19. `CC-0127` — Corolla E140 top AC panel · Rs. 7,999 · 90d **4** (top uncovered by 90d)  
Slug: `toyota-corolla-2012-top-ac-panel`  
VC: E140 **2009–2014** · Title mixes **2012** / **2008–2013** → **disclose**

1. Q: Which Corolla does this fit?  
   A: The vehicle compatibility table on this page lists Toyota Corolla E140 2009–2014. The product title mentions 2012 / 2008–2013 — use the table on this page as the fitment source of truth.

2. Q: What does it cover?  
   A: It is a top AC / center dashboard vent-and-button panel overlay for worn factory plastic, per the product description.

`/cars`: `toyota-corolla-e140-2009-2014`

---

### 20. `CC-0009` — Alto multimedia steering controls · Rs. 7,500 · 90d **3**  
Slug: `suzuki-alto-multimedia-steering-control-buttons-with-spiral-cable-glossy-black`  
VC: Suzuki Alto **2020–present** (title has no years — OK)

1. Q: Which Alto does this fit?  
   A: Suzuki Alto 2020–present per the vehicle compatibility table on this page.

2. Q: What is included?  
   A: Multimedia steering control buttons with spiral cable in glossy black for volume, media, calls, and navigation from the wheel, per the product description.

`/cars`: `suzuki-alto-2020-present`

---

### Strong alternates (not in the 20 — say if you want swaps)

| SKU | Why alternate |
|-----|----------------|
| `CC-0121` | Reborn roof spoiler (aligned VC); spoiler fee FAQ |
| `CC-0150` | Universal Angel Wings LED |
| `CC-TYR-EXT-SMC-CF` | Yaris Batman mirrors (aligned) |
| `CC-UNI-EXT-FBL-4PC-BK` | Universal 4PCS front splitter |
| `CC-0096` | Reborn gear knob; title 2007–2011 vs VC 2006–2012 |
| `CC-0196` | Corolla door handles; title 2015–2026 vs VC 2014–2026 |
| `CC-0192` | Lion dashboard perfume (air-freshener category) |
| `CC-EXT-139` | Civic fender markers 2016–2021 but **VC empty** — needs supplier row before confident `/cars` links |
| `CC-0130` | Civic X full interior kit (Rs. 37,999) — high ticket, low order count |

---

## C. New data-quality items discovered in Batch 3 scoping

Add to `docs/data-quality-title-vc-mismatches.md` **only after write approval** (proposal lists them now):

| articleNo | Issue | Proposed interim |
|-----------|--------|------------------|
| **CC-0007** | Title 2015–2023 vs VC E170 2014–2026 | FAQ table = source of truth |
| **CC-0147** | Title E140 2008–2013 vs VC 2009–2014 | FAQ disclosure |
| **CC-0146** | Title E170 2014–2020 vs VC 2014–2026 | FAQ disclosure |
| **CC-0088** | Title City 2021–2025 vs VC 2021–present | FAQ disclosure |
| **CC-0155** | Title City 2020–2026 vs VC 2021–present | FAQ disclosure (same pattern as CC-0154) |
| **CC-0095** | Title Reborn 2007–2012 vs VC 2006–2012 | FAQ disclosure |
| **CC-0127** | Title 2012 / 2008–2013 vs VC E140 2009–2014 | FAQ disclosure |
| **CC-0118** | Title Yaris-only; VC also includes **Yaris Cross** | FAQ disclosure + supplier confirm whether Cross row is valid |
| **CC-EXT-139** *(alternate)* | Title years 2016–2021; **VC empty** | Do not invent `/cars` links until VC row exists |

---

## D. Consolidated backlog status (read-only — no changes)

One place for the **6 title/VC FAQ-disclosed trackers** + **3 original held products**.

| SKU | Issue | Current state | Blocking a real fix |
|-----|--------|---------------|---------------------|
| **CC-0157** | Title Corolla **2015–2026** vs VC E170 **2014–2026** | **FAQ-disclosed only** (live); not on hold | Title/meta year rewrite **or** supplier confirms 2015+ only |
| **CC-UNI-INT-GKN-TOY** | Title says **universal**; VC has specific Honda/Toyota rows | **FAQ-disclosed only** (live) | Retitle to match VC **or** clear VC if truly universal — supplier call |
| **CC-0154** | Title City **2020–2026** vs VC **2021–present** | **FAQ-disclosed only** (live) | Align title years with VC **or** supplier confirms 2020 start |
| **CC-0024** | Short copy Grande **2017–2021**; VC Corolla **2014–2026** | **FAQ-disclosed only** (live) | Align shortDescription/title **or** Grande-specific VC row — supplier |
| **CC-0008** | Title **2015–2024** vs VC **2014–2026** | **FAQ-disclosed only** (live; Batch 2) | Align title years with VC **or** supplier confirms narrower band |
| **CC-RAI-MIR-BAT** | Title **2025** vs VC Raize **2019–present** | **FAQ-disclosed only** (live; Batch 2) | Align title to 2019–present **or** supplier confirms 2025-only |
| **CC-0168** | City side mirror cover; title **2012–2016** vs VC classic City **2009–2020**; currently **draft** | **`securityHold: true`** + draft (not selling) | Supplier fitment confirmation; then clear hold, set active, align title/VC |
| **CC-0004** | Neon side mirror; title/meta year mess; VC empty on held doc; replacement SKU `CC-COR-MIRROR-3` already live | **`securityHold: true`**; old slug **308 →** `CC-COR-MIRROR-3`; **hard-excluded** from keyword FAQ builders | Supplier WhatsApp fitment; then clear hold + align title/VC/meta — **do not reactivate via SEO batches** |
| **CC-0019** | Grande paddle shifters; title **2014–2018** vs VC E170 Corolla **2014–2026**; **draft** | **`securityHold: true`** + draft (not selling) | Supplier confirms Grande-only years vs full E170; then clear hold, set active, align title/VC |

*(CC-0008 and CC-RAI-MIR-BAT are the other two of the “6” title/VC trackers alongside CC-0157 / CC-UNI-INT-GKN-TOY / CC-0154 / CC-0024.)*

---

## Sign-off checklist (for you)

1. Approve / edit **A1–A10** category metas (especially hub `from Rs.` treatment on exterior / interior / LED & Lighting).  
2. Approve / edit **B1–B20** product FAQs (watch B9, B10, B15–B19 disclosures; B17 body-kit COD).  
3. Confirm new mismatch SKUs may be appended to the backlog doc at write-time.  
4. Optional swaps from the alternate table.  

**No Mongo or code writes until you reply with Batch 3 approval.**
