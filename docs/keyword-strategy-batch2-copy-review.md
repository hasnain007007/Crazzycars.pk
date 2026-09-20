# Batch 2 — exact meta + FAQ copy for review (NO WRITES YET)

**Date:** 2026-09-21  
**Status:** Copy review only. Do not publish until you sign off per item.  
**Shared policy answers** (reused everywhere below) = live `getFaqItems()` / `returnsFaqAnswer()` — same Batch 1 wording.

### Shared (paste reference)

**COD**  
Q: Do you offer Cash on Delivery (COD) in Pakistan?  
A: Yes. Cash on Delivery is available nationwide. For COD orders, pay delivery charges in advance after placing your order and send the payment screenshot on WhatsApp. The product amount is collected when your order arrives.

**Delivery charges**  
Q: How much are delivery charges?  
A: Delivery is Rs. 250 for regular items, or Rs. 500 when the order includes bulky items (splitters, side skirts, spoilers, floor mats, etc.). Shipping is paid in advance; the rest is Cash on Delivery. There is no order-value waiver for delivery. Roof or trunk spoilers and Express (Daewoo) use a different courier rate shown at checkout.

**Delivery time**  
Q: How long does delivery take?  
A: Most orders ship within 1–2 business days after payment confirmation (or COD delivery-charge confirmation). Lahore: 2–3 business days (confirmed). Other cities: delivery time will be confirmed at checkout.

**Returns**  
Q: What is your return or exchange policy?  
A: Returns and refunds are accepted within 7 days for items that arrive defective or if the wrong item was shipped. In these cases, you'll receive a full refund. For change-of-mind returns, we offer an exchange for a different product or size — cash refunds are not available for change-of-mind requests. See our Returns Policy page to start a claim.

**Fitment**  
Q: How do I know if a part fits my car?  
A: Open the product page and check vehicle fitment (make/model/years). You can also shop by car under Shop by Vehicle. If you are unsure, message us on WhatsApp with your car year and model.

---

## A. Categories — exact meta + FAQ

Prices below are **live at proposal time**; recompute at write-time. Titles = **base only** (no brand in Mongo).

### Note on `led-headlights-bulbs` range

Live catalog in this category (8 active SKUs) spans **Rs. 2,999 → Rs. 59,900**. The high end is full projector headlight assemblies (e.g. Nike-style Corolla projectors ~Rs. 57,999–59,900). The low end includes non-headlight SKUs currently sitting in this category (e.g. Funny Hand Gesture LED at Rs. 2,999). A flat “Rs. 2,999–59,900” reads like typical pricing; it isn’t.

**Proposed treatment:** meta + FAQ use **“from Rs. {min}”** and say higher-priced projector assemblies are listed separately — not a compact range band.

---

### 1. `led-headlights-bulbs`

| Field | Exact text |
|-------|------------|
| metaTitle (base) | `LED Headlights & Bulbs Price in Pakistan` |
| metaDescription | `LED headlights, fog lights and related bulbs from Rs. 2,999 — full projector assemblies cost more (see each product card). Confirm fitment on the listing. COD on eligible items.` |
| shortDescription append | `Prices on this page start from Rs. 2,999 (live catalog); projector headlight kits are higher — check the product card.` |

**FAQ (shared COD + fees + ETA + returns + fitment, then):**

6. Q: What do LED headlights and bulbs cost on CrazzyCars?  
   A: Prices on this category currently start from Rs. 2,999. Full projector headlight assemblies are higher — always check the product card for the live price. Prices change with stock and deals.

---

### 2. `splitters-side-skirts`

| Field | Exact text |
|-------|------------|
| metaTitle | `Splitters & Side Skirts Price in Pakistan` |
| metaDescription | `Front splitters and side skirts from Rs. 999 to Rs. 13,500. Delivery is Rs. 500 when the cart includes bulky items, or Rs. 250 otherwise. COD on eligible items.` |
| shortDescription append | `Prices on this page currently range from Rs. 999 to Rs. 13,500 (live catalog).` |

**FAQ extras:**

6. Q: What price range do Splitters & Side Skirts sell for on CrazzyCars?  
   A: On this category, live prices currently range from Rs. 999 to Rs. 13,500. Prices change with stock and deals — check the product card for the current price.

7. Q: Why is delivery sometimes Rs. 500?  
   A: Delivery is Rs. 250 for regular items, or Rs. 500 when the order includes bulky items (splitters, side skirts, spoilers, floor mats, etc.). Shipping is paid in advance; the rest is Cash on Delivery where eligible.

---

### 3. `spoilers-diffusers`

| Field | Exact text |
|-------|------------|
| metaTitle | `Spoilers & Diffusers Price in Pakistan` |
| metaDescription | `Spoilers and rear diffusers from Rs. 3,199 to Rs. 12,999. Roof or trunk spoilers use a courier rate shown at checkout; bulky carts are Rs. 500. COD on eligible items.` |
| shortDescription append | `Prices on this page currently range from Rs. 3,199 to Rs. 12,999 (live catalog).` |

**FAQ extras:**

6. Q: What price range do Spoilers & Diffusers sell for on CrazzyCars?  
   A: On this category, live prices currently range from Rs. 3,199 to Rs. 12,999. Prices change with stock and deals — check the product card for the current price.

7. Q: Are spoiler delivery fees different?  
   A: Roof or trunk spoilers use a special courier fee shown at checkout. Carts that include bulky items (including many spoilers) are charged Rs. 500 delivery instead of Rs. 250.

---

### 4. `sos-flasher-led-lights`

| Field | Exact text |
|-------|------------|
| metaTitle | `SOS Flasher LED Lights Price in Pakistan` |
| metaDescription | `SOS and police-style flasher / strobe LEDs from Rs. 999 to Rs. 10,999. Check mount style on each product. COD nationwide on eligible items.` |
| shortDescription append | `Prices on this page currently range from Rs. 999 to Rs. 10,999 (live catalog).` |

**FAQ extras:**

6. Q: What price range do SOS Flasher LED Lights sell for on CrazzyCars?  
   A: On this category, live prices currently range from Rs. 999 to Rs. 10,999. Prices change with stock and deals — check the product card for the current price.

---

### 5. `steering-wheel-covers`

| Field | Exact text |
|-------|------------|
| metaTitle | `Steering Wheel Covers Price in Pakistan` |
| metaDescription | `Steering wheel covers from Rs. 799 to Rs. 1,199. Check size and material on the product page. COD on eligible items.` |
| shortDescription append | `Prices on this page currently range from Rs. 799 to Rs. 1,199 (live catalog).` |

**FAQ extras:**

6. Q: What price range do Steering Wheel Covers sell for on CrazzyCars?  
   A: On this category, live prices currently range from Rs. 799 to Rs. 1,199. Prices change with stock and deals — check the product card for the current price.

---

### 6. `door-handle-covers`

| Field | Exact text |
|-------|------------|
| metaTitle | `Door Handle Covers Price in Pakistan` |
| metaDescription | `Door handle covers and carbon-style interior handle trims from Rs. 1,999 to Rs. 3,499. Confirm vehicle years on the product page. COD on eligible items.` |
| shortDescription append | `Prices on this page currently range from Rs. 1,999 to Rs. 3,499 (live catalog).` |

**FAQ extras:**

6. Q: What price range do Door Handle Covers sell for on CrazzyCars?  
   A: On this category, live prices currently range from Rs. 1,999 to Rs. 3,499. Prices change with stock and deals — check the product card for the current price.

---

### 7. `body-kits-extensions`

| Field | Exact text |
|-------|------------|
| metaTitle | `Body Kits & Extensions Price in Pakistan` |
| metaDescription | `Body kits and aero extensions from Rs. 5,499 to Rs. 37,999. Body kits cannot use COD — pay with JazzCash, Meezan, or bank transfer. Delivery fees shown at checkout.` |
| shortDescription append | `Prices on this page currently range from Rs. 5,499 to Rs. 37,999 (live catalog). Body kits cannot use Cash on Delivery.` |

**FAQ extras:**

6. Q: What price range do Body Kits & Extensions sell for on CrazzyCars?  
   A: On this category, live prices currently range from Rs. 5,499 to Rs. 37,999. Prices change with stock and deals — check the product card for the current price.

7. Q: Can I use Cash on Delivery on a body kit?  
   A: No. Products whose name or URL identify them as a body kit cannot use Cash on Delivery. Pay the full order with JazzCash, Meezan, or bank transfer, then send your payment screenshot on WhatsApp. LED underbody light kits are not treated as body kits.

---

### 8. `backlights-tail-lamps`

| Field | Exact text |
|-------|------------|
| metaTitle | `Backlights & Tail Lamps Price in Pakistan` |
| metaDescription | `Tail lamps and backlight upgrades from Rs. 3,999 to Rs. 55,000. Match your car year on the product page. COD on eligible items.` |
| shortDescription append | `Prices on this page currently range from Rs. 3,999 to Rs. 55,000 (live catalog).` |

**FAQ extras:**

6. Q: What price range do Backlights & Tail Lamps sell for on CrazzyCars?  
   A: On this category, live prices currently range from Rs. 3,999 to Rs. 55,000. Full assemblies sit at the high end — always check the product card for the live price.

---

### 9. `front-grilles`

| Field | Exact text |
|-------|------------|
| metaTitle | `Front Grilles Price in Pakistan` |
| metaDescription | `Front grilles and mesh-style upgrades from Rs. 5,500 to Rs. 14,999. Confirm fitment on each listing. COD on eligible items.` |
| shortDescription append | `Prices on this page currently range from Rs. 5,500 to Rs. 14,999 (live catalog).` |

**FAQ extras:**

6. Q: What price range do Front Grilles sell for on CrazzyCars?  
   A: On this category, live prices currently range from Rs. 5,500 to Rs. 14,999. Prices change with stock and deals — check the product card for the current price.

---

### 10. `gadgets`

| Field | Exact text |
|-------|------------|
| metaTitle | `Car Gadgets Price in Pakistan` |
| metaDescription | `Car gadgets and cabin add-ons from Rs. 499 to Rs. 2,299. Universal and vehicle-specific options. COD on eligible items.` |
| shortDescription append | `Prices on this page currently range from Rs. 499 to Rs. 2,299 (live catalog).` |

**FAQ extras:**

6. Q: What price range do Car Gadgets sell for on CrazzyCars?  
   A: On this category, live prices currently range from Rs. 499 to Rs. 2,299. Prices change with stock and deals — check the product card for the current price.

---

## B. Products — exact FAQ sets (20)

Every PDP below also gets **COD** + **Returns** (shared text above).  
`/cars` links listed for implementation (not FAQ text).  
Live prices in “current price” answers = proposal-time; use live PDP price at write-time.

### 1. `CC-0104` — Universal door lock cover  
**Cars:** none (universal) → category link only  

3. Q: Is this a universal fit?  
   A: Yes. It is listed as a universal anti-rust door lock cover compatible with most cars. Check the product photos for the lock-pin style before ordering.

4. Q: What does it protect against?  
   A: Per the product description, the covers help cap lock pins against rust, dust, and damage and keep the lock area cleaner longer.

---

### 2. `CC-0003` — Corolla carbon gear knob cover  
**Cars:** `/cars/toyota-corolla-e170-2014-2026`

3. Q: Which Corolla years does this fit?  
   A: Toyota Corolla 2014–2026 per the vehicle compatibility table on this page (E170–E210 notes). Confirm your year on that table before ordering.

4. Q: Is it real carbon fiber?  
   A: No. It is a carbon-style ABS gear knob cover that peels and sticks over the factory knob, per the product description.

---

### 3. `CC-0001` — Corolla interior door handle trims 4PCS  
**Cars:** `/cars/toyota-corolla-e170-2014-2026`

3. Q: Which Corolla years does this fit?  
   A: Toyota Corolla 2014–2026 per the vehicle compatibility table on this page. Confirm your year on that table before ordering.

4. Q: How many pieces are included?  
   A: This is a 4-piece set for interior door pull handles, per the product title and description.

---

### 4. `CC-UNI-LGT-POL-4X4R` — Grill police LED strobe  
**Cars:** none (universal)

3. Q: Where does it mount?  
   A: It mounts on the front grill. Configurations such as 3x4, 4x4, and 6x4 are listed when available — check the options on this page.

4. Q: What colors and patterns does it have?  
   A: It is a red and blue emergency strobe with multiple flash patterns, per the product description.

---

### 5. `CC-RAI-MIR-BAT` — Raize Batman side mirror covers  
**Cars:** `/cars/toyota-raize-2019-present`  
**Data-quality:** title says 2025; VC is 2019–present — tracked, no silent title fix.

3. Q: Which Raize years does this fit?  
   A: The vehicle compatibility table on this page lists Toyota Raize from 2019. The product title mentions 2025 — use the table on this page as the fitment source of truth before ordering.

4. Q: What style is this?  
   A: Batman-style side mirror covers designed as an exterior upgrade for Raize, per the product description.

---

### 6. `CC-UNI-LGT-RGB-APP` — RGB footwell 4 PCS  
**Cars:** none (universal)

3. Q: How many pieces are in the kit?  
   A: It is a 4-piece RGB footwell atmosphere LED kit, per the product title and description.

4. Q: How do I control the colors?  
   A: The listing describes app or remote control, full color spectrum, and a music sync mode — see the product description for details.

---

### 7. `CC-0008` — Corolla gear shifter trim  
**Cars:** `/cars/toyota-corolla-e170-2014-2026`  
**Data-quality:** title 2015–2024 vs VC 2014–2026 — tracked.

3. Q: Which Corolla years does this fit?  
   A: The vehicle compatibility table on this page lists Toyota Corolla 2014–2026. The product title lists 2015–2024 — use the table on this page as the fitment source of truth.

4. Q: Is it real carbon fiber?  
   A: No. It is a carbon-style ABS gear shifter trim that sticks on without drilling, per the product description.

---

### 8. `CC-0097` — Civic Reborn gear shift panel  
**Cars:** `/cars/honda-civic-reborn-2006-2012`

3. Q: Which Civic does this fit?  
   A: Honda Civic Reborn 2006–2012 per the vehicle compatibility table on this page (title also notes 2006–2011). Confirm your year on the table before ordering.

4. Q: How does it install?  
   A: It is described as a peel-and-stick ABS carbon-texture center console gear shift panel cover.

---

### 9. `CC-0177` — Civic Reborn quarter covers  
**Cars:** `/cars/honda-civic-reborn-2006-2012`

3. Q: Which Civic does this fit?  
   A: Honda Civic Reborn 2006–2012 per the vehicle compatibility table on this page.

4. Q: Do I need to modify the body?  
   A: The product description states an OEM-style fit that installs without modification. Follow the listing notes; WhatsApp us if your year is unclear.

---

### 10. `CC-0203` — Batman front bumper splitter 3PCS  
**Cars:** none (universal) → also category `/categories/splitters-side-skirts`

3. Q: Is this a universal fit?  
   A: Yes. It is listed as a universal 3-piece Batman-style front bumper splitter (front lip kit only — not side skirts or a rear diffuser).

4. Q: Why might delivery be Rs. 500?  
   A: This item is flagged bulky. Delivery is Rs. 500 when the cart includes bulky items (splitters, side skirts, spoilers, floor mats, etc.), or Rs. 250 for regular-only carts.

---

### 11. `CC-0204` — Rear bumper splitter lip  
**Cars:** none (universal) → splitters category

3. Q: Is this a universal fit?  
   A: Yes. It is a universal cut-style rear bumper splitter / rear lip in ABS, per the product description.

4. Q: Why might delivery be Rs. 500?  
   A: This item is flagged bulky. Delivery is Rs. 500 when the cart includes bulky items, or Rs. 250 for regular-only carts.

---

### 12. `CC-0112` — Civic X gear shift trim 3PC  
**Cars:** `/cars/honda-civic-x-2016-2021`

3. Q: Which Civic does this fit?  
   A: Honda Civic X 2016–2021 per the vehicle compatibility table on this page.

4. Q: How many pieces are included?  
   A: This is a 3-piece carbon-texture gear shift lever/knob trim set, per the product title and description.

---

### 13. `CC-0171` — Civic 11th Gen quarter covers  
**Cars:** `/cars/honda-civic-11th-gen-2022-present`

3. Q: Which Civic does this fit?  
   A: Honda Civic 11th Gen 2022–present per the vehicle compatibility table on this page.

4. Q: What material is it?  
   A: Carbon-style covers with an OEM-style fit for the rear quarters, per the product description (not woven carbon fiber unless a listing says otherwise).

---

### 14. `CC-0113` — Civic X gear knob cover  
**Cars:** `/cars/honda-civic-x-2016-2021`

3. Q: Which Civic does this fit?  
   A: Honda Civic X 2016–2021 per the vehicle compatibility table on this page.

4. Q: How does it install?  
   A: The listing describes an ABS carbon-texture cover that snaps over the existing knob without tools.

---

### 15. `CC-0165` — Corolla E140 side mirror covers  
**Cars:** `/cars/toyota-corolla-e140-2009-2014`

3. Q: Which Corolla does this fit?  
   A: Toyota Corolla E140 2009–2014 per the vehicle compatibility table on this page (not the later E170 generation). Confirm your chassis on that table before ordering.

4. Q: Is it a pair?  
   A: Yes. The listing is a pair of carbon-style side mirror covers, per the product title.

---

### 16. `CC-UNI-EXT-BKT-BTM-GB-BTM` — Complete body kit  
**Cars:** none → `/categories/body-kits-extensions`  
**Payment callout (required):** JazzCash / Meezan / bank — not COD.

3. Q: Can I use Cash on Delivery on this body kit?  
   A: No. This is a body kit, so Cash on Delivery is not available. Pay the full order with **JazzCash, Meezan, or bank transfer** at checkout, then send your payment screenshot on WhatsApp. See our Cash on Delivery page for details.

4. Q: What is included in the kit?  
   A: The listing includes a front splitter, side skirts (pair), and back bumper lip — these three pieces only, per the product description.

5. Q: Why might delivery be Rs. 500?  
   A: Body kit / splitter packages are bulky. Delivery is Rs. 500 when the cart includes bulky items; the exact fee is shown at checkout.

*(Also keeps shared Returns FAQ. COD shared FAQ is still included so “Do you offer COD?” is answered honestly, with Q3 clarifying this SKU is excluded.)*

---

### 17. `CC-0154` — Honda City carbon quarter covers  
**Cars:** `/cars/honda-city-2021-present`  
**Note:** title says 2020–2026; VC is 2021–2026 — FAQ uses table as source of truth (track lightly; not on hold list unless you want it added).

3. Q: Which City years does this fit?  
   A: The vehicle compatibility table on this page lists Honda City 2021–present. The product title lists 2020–2026 — use the table on this page as the fitment source of truth.

4. Q: Is it real carbon fiber?  
   A: No. It is ABS plastic with a carbon-style finish (not fiber), per the product description.

---

### 18. `CC-0020` — Alcantara / carbon steering wheel cover  
**Cars:** none (universal)

3. Q: Is this a universal fit?  
   A: Yes. It is listed as a universal hand-stitched steering wheel cover for most wheels. Check the product photos for the stitch/cover style before ordering.

4. Q: What materials are used?  
   A: The listing describes glossy carbon-style sections with Alcantara/suede grip areas, hand-sewn, per the product description.

---

### 19. `CC-EXT-201` — Eyes spoiler with running brake LEDs 3Pcs  
**Cars:** none (universal) → spoilers category

3. Q: Is this a universal fit?  
   A: Yes. It is listed as a universal eyes-style spoiler kit with integrated running and brake LED lights (3 pieces), per the product title and description.

4. Q: Why might delivery be higher?  
   A: Spoilers often use a special courier fee shown at checkout, and bulky carts are charged Rs. 500 delivery. Check the fee at checkout before paying.

---

### 20. `CC-0024` — Corolla Grande multimedia steering trim  
**Cars:** `/cars/toyota-corolla-e170-2014-2026`  
**Note:** short copy mentions Grande 2017–2021; VC is Corolla 2014–2026 — FAQ uses table as source of truth.

3. Q: Which Corolla does this fit?  
   A: The vehicle compatibility table on this page lists Toyota Corolla 2014–2026. The short description mentions Corolla Grande multimedia years — confirm your year and trim against the table (and product photos) before ordering.

4. Q: Is it real carbon fiber?  
   A: No. It is a carbon-style multimedia steering wheel trim, per the product description.

---

## C. Sign-off checklist

Please mark **Approve / Change / Defer** on:

1. Category meta + FAQ for items A1–A10 (especially A1 headlights “from Rs.” wording)  
2. Product FAQ sets B1–B20 (especially B5 Raize, B7 CC-0008, B16 body-kit payment callout)  
3. Optional: add CC-0154 / CC-0024 year-copy mismatches to the formal data-quality backlog (already disclosed in FAQ)

**No Batch 2 Mongo/code writes until you reply.**
