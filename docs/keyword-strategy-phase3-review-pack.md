# Phase 3 review pack — answers before Phase 4

**Date:** 2026-09-21  
**Status:** Still proposal-only. No code/data writes.  
**Purpose:** Resolve your review decisions with exact FAQ text, exact `llms.txt` diff, full §10 checklist, and CC-0004 clarification.

---

## A. Item 1 — “Price in Pakistan” titles vs `buildBrandedAbsoluteTitle`

**Approved.** Implementation rule for Phase 4:

Store in Mongo / category `seo.metaTitle` the **base string without a brand suffix**, e.g.:

`Universal Car Accessories Price in Pakistan`

Then category page metadata must pass it through [`buildBrandedAbsoluteTitle`](storecraft-store/lib/seo/brandedTitle.js), which:

1. Strips any trailing `| CrazzyCars(.pk)` via `stripTrailingBrand`
2. Appends `| {brand}` once
3. If `base | brand` > 60 chars, returns **base only** (never double-brand; never mid-word truncate)

**Do not** store `… | CrazzyCars` / `… | CrazzyCars.pk` in Mongo for these rewrites — that is what reintroduced double-branding historically (`1940b49` class of bug). Phase 3 draft titles that already included `| CrazzyCars` were **preview strings for SERP length**, not the DB write value.

Proposed **DB values** (base only). Category pages already call `buildBrandedAbsoluteTitle(..., { brand: BRAND })` where `BRAND` defaults to `Crazzycars.pk`. Verified lengths with brand `CrazzyCars.pk` (same char count as `Crazzycars.pk`):

| Category | Store in `seo.metaTitle` (base only — no brand) | Base | Absolute (≤60) |
|----------|--------------------------------------------------|------|----------------|
| universal-accessories | `Universal Car Accessories Price in Pakistan` | 43 | 59 — fits |
| carbon-fiber-accessories | `Carbon Fiber Accessories Price in Pakistan` | 42 | 58 — fits |
| led-indicator-lights | `LED Indicator Lights Price in Pakistan` | 38 | 54 — fits |
| side-mirror-covers | `Side Mirror Covers Price in Pakistan` | 36 | 52 — fits |
| quarter-window-louvers | `Quarter Window Louvers Price in Pakistan` | 40 | 56 — fits |
| interior-lights | `Interior Lights Price in Pakistan` | 33 | 49 — fits |

Phase 3 preview strings that included `| CrazzyCars` were SERP previews only. If those were written to Mongo, `stripTrailingBrand` would strip them before re-appending once — still no double-brand — but **write base only** so we never depend on that.

Phase 4 will: write **base only** → existing helper on category pages → Googlebot-verify no doubled brand.

---

## B. Item 2 — CC-0004 clarification (HOLD)

### Same product?

**Yes — same SKU `CC-0004`**, `_id` `6a5d224689c0c8d16c691f9f`, slug `toyota-corolla-2015-2026-led-side-mirror-neon-indicator-pair`.

### Live data right now (2026-09-21)

| Field | Value |
|-------|--------|
| `securityHold` | **`true`** (still on hold) |
| `name` | Toyota Corolla **2015-2026** LED Side Mirror Neon Indicator Pair |
| Top-level `metaTitle` | Toyota Corolla **2017-2020** LED Side Mirror \| CrazzyCars.pk ← **stale / conflicting** |
| `seo.metaTitle` | Corolla **2015–2026** Neon Side Mirror Indicator \| CrazzyCars ← already corrected in seo blob |
| `seo.metaDescription` | 2015–2026 neon (not sequential)… |
| Top-level `metaDescription` | still says **2017-2020** |
| VC model | **`E170–E210`** (not “Corolla”) |
| VC years | **2014–2026** |
| Product title years | **2015–2026** |

So there are **two separate issues**:

1. **Cosmetic / field drift:** top-level `metaTitle` / `metaDescription` still say 2017–2020 while `name` + `seo.*` say 2015–2026. Phase 3’s “2017→2015” note was about this **stale top-level meta**, not a claim that supplier fitment was resolved.
2. **Hold / fitment truth (unresolved):** model field is chassis code `E170–E210`, years **2014–2026** vs title **2015–2026** — same held-products audit issue; **supplier WhatsApp confirmation still not recorded as resolved** in our session history.

### Redirect note

Requesting the CC-0004 slug currently **308s** to `/toyota-corolla-2014-2026-side-mirror-neon-style-indicator` (`CC-COR-MIRROR-3`). Live Googlebot title on that destination is the **other** neon SKU. Treat CC-0004 SEO edits as edits to **this product document only**, and do not assume the redirect target’s SERP is CC-0004.

### Phase 4 rule (locked)

- **Do not clear `securityHold` on CC-0004.**
- **Do not bundle any CC-0004 meta/year/model edits** with category / linking / FAQ / llms / COD batches.
- Optional later (separate commit, still without clearing hold): cosmetic sync of top-level meta → `seo.*` **only if you explicitly approve cosmetic-only**, knowing fitment (Corolla vs E170–E210, 2014 vs 2015) remains supplier-pending.
- Prefer **excluding CC-0004 from FAQ/JSON-LD and PDP→cars link batches** until hold is lifted, so we do not amplify unresolved fitment into AI-quotable structured data.

---

## C. Item 3 — Exact FAQ question/answer text (for your read-through)

Sources: [`storePolicyCopy.js`](storecraft-store/lib/storePolicyCopy.js) `getFaqItems()`, `returnsFaqAnswer()`, `standardDeliveryFeeStatement()`, `deliveryEtaSummary()`, `STORE_POLICY` in [`store-policy.js`](storecraft-store/config/store-policy.js) (7-day returns; Rs. 250 / Rs. 500; Lahore 2–3 days). Price ranges = live Mongo at proposal time — **recompute at write-time**.

### C.1 Shared policy answers (reused)

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

**Fitment (generic)**  
Q: How do I know if a part fits my car?  
A: Open the product page and check vehicle fitment (make/model/years). You can also shop by car under Shop by Vehicle. If you are unsure, message us on WhatsApp with your car year and model.

---

### C.2 Category FAQ sets

Each category gets: shared COD + Delivery charges + Delivery time + Returns + Fitment + **one price-range Q** (and category-specific extras below).

#### `universal-accessories`

6. Q: What price range do Universal Accessories sell for on CrazzyCars?  
   A: On this category, live prices currently range from Rs. 149 to Rs. 14,999. Prices change with stock and deals — check the product card for the current price.

*(Plus shared 1–5.)*

#### `carbon-fiber-accessories`

6. Q: What price range do Carbon Fiber Accessories sell for on CrazzyCars?  
   A: On this category, live prices currently range from Rs. 799 to Rs. 38,999. Prices change with stock and deals — check the product card for the current price.

7. Q: Are these real carbon fiber parts?  
   A: Most items in this category are ABS plastic with a carbon-fiber-style texture, not woven carbon fiber. Product titles and descriptions state the material — check the product page before ordering.

#### `led-indicator-lights`

6. Q: What price range do LED Indicator Lights sell for on CrazzyCars?  
   A: On this category, live prices currently range from Rs. 599 to Rs. 18,500. Prices change with stock and deals — check the product card for the current price.

#### `interior-lights`

6. Q: What price range do Interior Lights sell for on CrazzyCars?  
   A: On this category, live prices currently range from Rs. 499 to Rs. 14,999. Prices change with stock and deals — check the product card for the current price.

#### `quarter-window-louvers`

6. Q: What price range do Quarter Window Louvers sell for on CrazzyCars?  
   A: On this category, live prices currently range from Rs. 899 to Rs. 17,999. Prices change with stock and deals — check the product card for the current price.

7. Q: Do I need to drill to install quarter window covers?  
   A: Many covers in this category are designed for OEM-style fit without body modification. Always follow the install notes on the specific product page; if you are unsure, WhatsApp us with your car year and model.

#### `side-mirror-covers`

6. Q: What price range do Side Mirror Covers sell for on CrazzyCars?  
   A: On this category, live prices currently range from Rs. 899 to Rs. 6,499. Prices change with stock and deals — check the product card for the current price.

7. Q: Do you have covers for newer Chinese-brand models like Deepal S05?  
   A: Yes — for example Deepal S05 Batman-style side mirror covers are listed when in stock. Open the product page for finish options and confirm fitment on the vehicle table, or browse Shop by Car for Deepal S05.

---

### C.3 Product FAQ sets (top sellers — **excluding CC-0004 while on securityHold**)

Shared on every PDP below: **COD** + **Returns** (exact text from C.1).

#### Brembo Style Brake Caliper Covers (`CC-UNI-EXT-BCC-RD`)

3. Q: Is this a universal fit?  
   A: Yes. This product is listed as universal fit for cars with exposed brake calipers. Confirm wheel and caliper clearance on your car before installing.

4. Q: What is the current price?  
   A: The current sale price is shown on this page (Rs. 1,299 at proposal time — always use the live price on the product page).

#### Funny Window Hand Gesture LED (`CC-0194`)

3. Q: How is it powered and mounted?  
   A: It is USB-powered with multiple gesture modes and mounts on the rear windshield with a suction-cup mount, per the product description.

4. Q: Will it fit my car model?  
   A: This is a universal rear-window accessory, not tied to a specific make/model. Check the product photos and description for mount style.

#### Toyota Corolla Carbon Steering Monogram (`CC-0156`)

3. Q: Which cars does this fit?  
   A: Fitment is listed on this page for Toyota Corolla (2009–2014 and 2014–2026 rows), and also for Toyota Aqua, Vitz, and Yaris year rows shown in the vehicle compatibility table. Confirm your year against that table before ordering.

4. Q: Is it real carbon fiber?  
   A: No. It is an ABS texture emblem with a carbon-style finish that peels and sticks over the factory steering logo, per the product description.

#### Toyota Corolla Carbon Steering Trim (`CC-0157`)

3. Q: Which Corolla years does this fit?  
   A: Fitment on this page is Toyota Corolla 2014–2026 (see the vehicle compatibility table). The product title lists 2015–2026 — use the table on this page as the fitment source of truth.

4. Q: Is it real carbon fiber?  
   A: No. It is a carbon-style ABS steering trim (not real fiber), per the product description.

#### Honda Civic Rebirth Quarter Covers (`CC-0174`)

3. Q: Which Civic does this fit?  
   A: Honda Civic Rebirth / Civic 2012–2016 per the vehicle compatibility table on this page (often searched as Civic Rebirth).

4. Q: Do I need to modify the body?  
   A: The product description states OEM-style fit without body modification. Follow the listing notes; WhatsApp us if your year is unclear.

5. Q: Where can I see more Civic Rebirth parts?  
   A: Browse Shop by Car for Honda Civic Rebirth 2012–2016 accessories on this site.

#### Honda Carbon Steering Monogram (`CC-HON-INT-SMN-CF-1`)

3. Q: Which Honda models does this fit?  
   A: Fitment rows on this page include Honda City (2009–2020 and 2021–2026) and Honda Civic generations from 2006 through 2026 as listed in the vehicle compatibility table. Confirm your exact year on that table.

4. Q: How does it install?  
   A: It is a steering-center monogram emblem with a durable finish intended to cover the factory steering-wheel center logo (see product description).

#### Deepal S05 Batman Style Side Mirror Covers (`CC-S05-MIR-BAT`)

3. Q: Which Deepal does this fit?  
   A: Deepal S05 (2024–present) per the vehicle compatibility table on this page.

4. Q: What finishes are available?  
   A: Carbon Fiber or Gloss Black options are listed on this product when available — select the option on the product page.

5. Q: Where can I see more Deepal S05 parts?  
   A: Browse Shop by Car for Deepal S05 (2024–present) on this site.

#### Corolla neon `CC-COR-MIRROR-3` (2014–2026 neon style — not on hold)

3. Q: Which Corolla years does this fit?  
   A: Toyota Corolla E170–E210 style fitment is listed as 2014–2026 on the vehicle compatibility table on this page. Confirm your year against that table.

4. Q: Is installation plug-and-play?  
   A: The product description states plug-and-play for this pair. If your mirror wiring differs, WhatsApp us with your year and trim before ordering.

#### Crystal LED Gear Knob (`CC-UNI-INT-GKN-TOY`)

3. Q: Is this truly universal?  
   A: The title says universal, but this listing also includes specific Honda and Toyota fitment rows in the vehicle compatibility table. Use that table as the source of truth for your car before ordering.

4. Q: How does the light activate?  
   A: It is described as a touch-activated crystal LED gear knob / shifter style upgrade — see the product description and images for the exact behavior.

#### Explicitly **omitted from this FAQ batch**

- **CC-0004** — `securityHold: true`; do not publish FAQPage until hold lifted and supplier fitment confirmed.

---

## D. Item 5 — Exact `llms.txt` addition (diff)

Append after existing COD/shipping mentions (do not remove current catalog blocks):

```text
## Returns & exchanges

- Returns window: 7 days from delivery.
- Full refund: item arrived defective, or we shipped the wrong item.
- Change of mind: exchange for a different product or size only — not a cash refund.
- Vehicle-specific parts ordered against the fitment listed on the product page are not returnable for “does not fit” unless we listed the wrong vehicle.
- Start a claim: WhatsApp 03284010007 or email info@crazzycars.pk — see https://crazzycars.pk/returns-policy

## Shipping fees (summary)

- Standard delivery: Rs. 250. Bulky carts (splitters, side skirts, spoilers, floor mats, etc.): Rs. 500.
- Delivery charges are paid in advance; remaining product amount may be Cash on Delivery where eligible.
- There is no free-delivery threshold by order value.
- Lahore ETA: 2–3 business days. Other cities: confirmed at checkout.
```

**Do not** add the Cash on Delivery page link until that URL exists (outline-only this pass).

---

## E. Full §10 checklist (verbatim from Phase 3 proposal)

Please mark each **Approve / Change / Defer**:

1. Category “Price in Pakistan” titles for the 6 categories in §1  
2. CC-0004 year correction in meta (2015–2026)  
3. Product FAQ JSON-LD on top sellers (§3.2)  
4. Category FAQ JSON-LD on the 6 categories (§3.1)  
5. PDP→`/cars` link rendering (§7)  
6. `llms.txt` returns + shipping appendix (§5)  
7. New `/cash-on-delivery` page outline → build in Phase 4 (§4)  
8. Feed: leave GTIN empty unless real EAN (§8)  
9. Defer bulky-heavy category storytelling (§1.7)

### Mapped to your decisions (current)

| # | Your decision | Status for Phase 4 |
|---|---------------|--------------------|
| 1 | Approved (with branded-title discipline) | Ready after final sign-off |
| 2 | Hold / clarify | **HOLD** — no batch; do not clear `securityHold` |
| 3 | Approved in principle — need Q&A text | Text above (§C) — awaiting your read-through |
| 4 | Approved | Ready after final sign-off |
| 5 | Approved in principle — need exact text | Text above (§D) — awaiting your read-through |
| 6 | Outline only — no page build this pass | Outline already in Phase 3 doc; **no content write** |
| 7 | Approved | Ready |
| 8 | (implied approve with 7) | Ready |
| 9 | Aligns with your bulky guidance | Ready (continue deferring) |

---

## F. Suggested first Phase 4 wave (after you sign FAQ + llms.txt)

Per your order: **1, 4, 7, 8** (and **9** as non-action) first — then **3** and **5** after text approval — **never 2** in the same commit.

1. Batch A: 6 category base metaTitles + metaDescriptions (live min/max at write-time)  
2. Batch C: PDP→`/cars` links for non-held top sellers (include Deepal + Civic Rebirth + Corolla monogram/trim; **exclude CC-0004**)  
3. Batch: feed GTIN policy = no invent (no-op unless code comment/docs only)  
4. Later: FAQ JSON-LD + `llms.txt` after you OK §C and §D  
5. COD page: outline only until separate content review  

Discipline: timestamped backup → before/after diff → write → Googlebot/Bingbot curl → next batch.
