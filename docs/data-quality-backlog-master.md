# Data-quality backlog — master list (canonical)

**Opened:** 2026-09-21  
**Last updated:** 2026-10-02 (Batch 4 write live — +10 FAQ-disclose; CC-EXT-107 VC fixed & cleared)  
**Purpose:** Single reference for every title / VC / hold mismatch found during the keyword/AEO rounds. Prefer this file over scattered notes in batch review docs.

**Rules (unchanged):**
- FAQ “table is source of truth” disclosures are **interim**, not permanent fixes.
- Do **not** put FAQ-disclosed items on `securityHold` unless fitment risk is confirmed.
- Do **not** clear `securityHold` or reactivate held SKUs until supplier answers are applied and live-verified.
- Do **not** silently rewrite titles/years in SEO batches without explicit approval.

### Category cannibalization — parent dual-tag ≠ covered-leaf overlap (do not re-litigate)

Parents (`exterior`, `interior`, `led-lighting`, `carbon-fiber`) were excluded because of cannibalization **between leaves under them** / hub skew — **not** because every leaf under a parent is radioactive.  
**“100% of SKUs also tagged under an excluded parent” is not grounds to defer a leaf** when overlap with **already-covered leaves** is 0%. Batches 1–3 already shipped leaves under those same parents on that rule. Batch 4 confirmed the same for `hanging-perfumes` (under `interior`) and `air-press` (under `exterior`).

**Category expansion closed after Batch 4:** **29 FAQ-covered leaves / 30** active non-parent leaves with SKUs (deferred only: `rear-reflectors`, `sun-shades`). No further leaf-category SEO rounds unless new leaves/SKU density appear.

**Ops note (2026-10-02):** Traefik `empty-category-merges-redirect.yaml` had been 301’ing `/categories/hanging-perfumes` → `air-freshener-decoration` (empty-shelf merge from 2026-08). That middleware/router was **removed** so Batch 4’s hanging-perfumes money page can resolve. Other fragrance/mat merges left intact.

**Related:** WhatsApp copy for the 3 held SKUs → `docs/supplier-whatsapp-held-products.md`  
**Legacy tracker (superseded by this file):** `docs/data-quality-title-vc-mismatches.md`  
**Batch 4 copy (shipped):** `docs/keyword-strategy-batch4-copy-review.md`

---

## Counts

| Bucket | Count |
|--------|------:|
| Held (`securityHold`) — awaiting supplier | **3** |
| FAQ-disclosed only (live interim) | **32** |
| Noted but not yet FAQ-wired | **1** (`CC-EXT-139`) |
| Related live SKU (not a mismatch; decision dependency) | **1** (`CC-COR-MIRROR-3`) |
| Closed / fixed (see §Closed) | **CC-EXT-107**, CC-INT-102/108 meta |
| **Total open tracked rows below (A+B+C+D)** | **37** |

---

## A. Held products — awaiting supplier WhatsApp

Messages drafted in `docs/supplier-whatsapp-held-products.md`. Store owner sends them outside the codebase; answers may be **pending** or **already sent** — treat both as “awaiting reply” until pasted back into chat.

| SKU | Product name | Conflict | Current state | Resolves with |
|-----|--------------|----------|---------------|---------------|
| **CC-0168** | Honda City 2012-2016 Carbon Fiber Side Mirror Cover | Title/short **2012–2016** vs VC classic City **2009–2020** | `securityHold: true` + **draft** (not selling) | Supplier years → align title/VC → clear hold + set active |
| **CC-0004** | Toyota Corolla 2015-2026 LED Side Mirror Neon Indicator Pair | Name **2015–2026**; top-level meta **2017–2020**; `seo.metaTitle` **2015–2026**; VC model **E170–E210**; old slug **308 → CC-COR-MIRROR-3** | `securityHold: true` (active in DB but excluded from storefront/FAQ builders) | Supplier years + same-vs-replacement vs **CC-COR-MIRROR-3** → fix **or retire/merge**; never reactivate via SEO alone |
| **CC-0019** | Toyota Corolla Grande 2014-2018 Carbon Fiber Steering Wheel Paddle Shifters Pair | Title/short **Grande 2014–2018** vs VC Corolla E170 **2014–2026**; stale top-level meta still **2014–2026** | `securityHold: true` + **draft** | Supplier: Grande-only years vs all Corolla trims → align title/VC → clear hold + set active |

---

## B. FAQ-disclosed only (live interim)

These have honest FAQ copy live (Batches 1–3 / F / **4**). Titles/VC not silently patched. Short description left as-is where noted.

| SKU | Product name | Conflict | Current state | Resolves with |
|-----|--------------|----------|---------------|---------------|
| **CC-0157** | Toyota Corolla 2015–2026 Carbon Steering Trim | Title **2015–2026** vs VC E170 **2014–2026** | FAQ-disclosed | Title/meta rewrite **or** supplier confirms 2015+ only |
| **CC-UNI-INT-GKN-TOY** | Universal Crystal LED Gear Knob | Title says **universal**; VC has specific Honda/Toyota rows | FAQ-disclosed | Retitle to match VC **or** clear VC if truly universal — supplier |
| **CC-0154** | Honda City 2020-2026 Carbon Window Quarter Covers | Title **2020–2026** vs VC **2021–present** | FAQ-disclosed | Align title **or** supplier confirms 2020 start |
| **CC-0024** | Toyota Corolla Grande multimedia steering trim | Short copy Grande **2017–2021**; VC Corolla **2014–2026** | FAQ-disclosed | Align shortDescription/title **or** Grande-specific VC row — supplier |
| **CC-0008** | Toyota Corolla 2015-2024 Carbon Fiber Gear Shifter Trim | Title **2015–2024** vs VC **2014–2026** | FAQ-disclosed | Align title **or** supplier confirms narrower band |
| **CC-RAI-MIR-BAT** | Toyota Raize 2025 Batman Style Side Mirror Cover | Title **2025** vs VC Raize **2019–present** | FAQ-disclosed | Align title to 2019–present **or** supplier confirms 2025-only |
| **CC-0095** | Honda Civic Reborn 2007-2012 Carbon Hand Brake Cover | Title **2007–2012** vs VC **2006–2012** | FAQ-disclosed | Align start year **or** supplier confirms 2007+ |
| **CC-0007** | Toyota Corolla 2015-2023 Power Window Carbon Fiber Trims 4PCS | Title **2015–2023** vs VC E170 **2014–2026** | FAQ-disclosed | Align title **or** supplier confirms narrower band |
| **CC-0147** | Toyota Corolla E140 2008–2013 LED Rear Bumper Reflector | Title **2008–2013** vs VC **2009–2014** | FAQ-disclosed | Align title years with VC |
| **CC-0118** | Toyota Yaris 2020-2026 Trunk Lip Spoiler | Title **Yaris** only; VC also **Yaris Cross** | FAQ-disclosed | Supplier confirm Cross row; remove if invalid |
| **CC-0146** | Toyota Corolla E170 2014–2020 LED Rear Bumper Reflector | Title **2014–2020** vs VC **2014–2026** | FAQ-disclosed | Align title end year with VC |
| **CC-0088** | Honda City 2021-2025 Modulo Style Body Kit Fibreglass | Title **2021–2025** vs VC **2021–present** | FAQ-disclosed | Align title **or** supplier confirms 2025 end |
| **CC-0155** | Honda City 2020-2026 Carbon Door Handle Cover Set | Title **2020–2026** vs VC **2021–present** | FAQ-disclosed | Align title (same pattern as CC-0154) |
| **CC-0127** | Toyota Corolla 2012 Top AC Panel … 2008-2013 | Title mixes **2012** / **2008–2013** vs VC E140 **2009–2014** | FAQ-disclosed | Clean title years to match VC |
| **CC-INT-108** | Toyota Corolla 2008-2013 Velvet Dashboard Mat | Title/name **2008–2013** vs VC E140 **2009–2014** | FAQ not required for this; **meta title now distinct** from CC-INT-102 (2026-09-21 fix) | Align title years with VC **or** confirm 2008 start with supplier |
| **CC-0096** | Honda Civic Reborn 2007-2011 Forged Carbon Gear Knob Cover | Title **2007–2011** vs VC Reborn **2006–2012** | FAQ-disclosed (Batch F) | Align title **or** supplier |
| **CC-0143** | Honda Civic Reborn Front Quarter Louver 2007-2012 | Title **2007–2012** vs VC Reborn **2006–2012** | FAQ-disclosed (Batch F); close years — table is SoT | Align start year **or** supplier confirms 2007+ |
| **CC-0164** | Toyota Corolla E140 Carbon Door Handle Cover | Title **2009–2012** vs VC E140 **2009–2014** | FAQ-disclosed (Batch F) | Align title end year with VC |
| **CC-0158** | Toyota Corolla 2015-2026 Roof Spoiler | Title **2015–2026** vs VC E170–E210 **2014–2026** | FAQ-disclosed (Batch F) | Align title start year with VC |
| **CC-0138** | Carbon Gear Shift Console Trim Corolla 2014-2018 E170 | Title **2014–2018** vs VC Corolla **2014–2026** | FAQ-disclosed (Batch F) | Align title **or** supplier confirms narrower band |
| **CC-INT-153** | Honda Civic 2007-2011 TPE Floor Mats Premium | Title **2007–2011** vs VC Reborn **2006–2012** | FAQ-disclosed (Batch F) | Align title years with VC |
| **CC-SWF-DHC-CF** | Suzuki Swift 2022-2025 Carbon Fiber Door Handles Cover | Title **2022–2025** vs VC Swift **2018–2024** and **2025–Present** | FAQ-disclosed (Batch F) | Align title to VC generations **or** supplier confirms narrower band |
| **CC-0022** | Toyota Corolla X Shark Fin Style Lower Panel Diffuser | Short “Corolla X **2022 only**” vs VC Corolla **2014–2026** | FAQ-disclosed (Batch 4); short left as-is | Align shortDescription **or** supplier confirms 2022-only |
| **CC-0098** | Honda City 2015-2020 Carbon Fiber Gear Lever Knob Cover | Title **2015–2020** vs VC City Classic **2009–2020** | FAQ-disclosed (Batch 4) | Align title **or** supplier |
| **CC-0196** | Toyota Corolla 2015–2026 Door Handle Covers | Title **2015–2026** vs VC E170 **2014–2026** | FAQ-disclosed (Batch 4; promoted from alternates) | Align title **or** supplier |
| **CC-TCR-EXT-SMC-CF-15** | Toyota Corolla 2015–2022 Batman Style Side Mirror Cover | Title **2015–2022** vs VC **2014–2026** | FAQ-disclosed (Batch 4) | Align title **or** supplier |
| **CC-INT-155** | Toyota Corolla 2008-2013 TPE Floor Mats Premium | Title **2008–2013** vs VC E140 **2009–2014** | FAQ-disclosed (Batch 4) | Align title years with VC |
| **CC-0159** | Toyota Corolla 2015–2026 RS Style Trunk Spoiler | Title **2015–2026** vs VC **2014–2026** | FAQ-disclosed (Batch 4) | Align title start year with VC |
| **CC-0175** | Honda Civic Rebirth 2012-2015 Carbon Door Handle Cover | Title **2012–2015** vs VC Rebirth **2012–2016** | FAQ-disclosed (Batch 4) | Align title end year with VC |
| **CC-0176** | Honda Civic Rebirth 2012–2015 Carbon Style Side Mirror Cover | Title **2012–2015** vs VC Rebirth **2012–2016** | FAQ-disclosed (Batch 4) | Align title end year with VC |
| **CC-0040** | Toyota Corolla 2015-2024 Front Spike Splitter Canard 3PCS | Title **2015–2024** vs VC **2014–Present** | FAQ-disclosed (Batch 4) | Align title **or** supplier |
| **CC-LGT-203** | Honda City RGB Side Mirror Indicator | Title Honda City vs VC **Honda Classic 2009–2020** | FAQ-disclosed (Batch 4) | Align title to Classic generation **or** supplier |

---

## C. Noted but not yet FAQ-wired

| SKU | Product name | Conflict | Current state | Resolves with |
|-----|--------------|----------|---------------|---------------|
| **CC-EXT-139** | Honda Civic Side Markers Fender Indicator Lights 2016-2021 | Title years **2016–2021**; **VC empty** | Active; no safe `/cars` links | Supplier VC row before inventing fitment links |

---

## D. Related live SKU (decision dependency, not a mismatch)

| SKU | Product name | Role | Notes |
|-----|--------------|------|-------|
| **CC-COR-MIRROR-3** | Toyota Corolla 2014-2026 Side Mirror Neon Style Indicator | Live landing page for old CC-0004 URL (308) | Decide with supplier whether this **replaces** CC-0004 or is a **different** part before reactivating CC-0004 |

---

## Closed / fixed

| Item | Resolution |
|------|------------|
| Duplicate meta title **CC-INT-102** / **CC-INT-108** | Fixed 2026-09-21: distinct year-based `metaTitle` / `seo.metaTitle` bases; metaDescription left unchanged |
| **CC-EXT-107** Civic SI grille vs Aqua VC | **2026-10-02:** briefly `securityHold` (misleading Aqua Shop-by-car); removed Toyota Aqua from `vehicleCompatibility` **and** `compatibleCars` / `compatibleVehicles`; set Honda Civic X **2016–2021**; hold cleared. Live Shop-by-car → `/cars/honda-civic-x-2016-2021`. **No Batch 4 FAQ/SEO.** |

---

## Source map (where items were first logged)

| Source | SKUs |
|--------|------|
| Phase 3 / Batch 1 | CC-0004, CC-0157, CC-UNI-INT-GKN-TOY |
| Batch 2 | CC-0008, CC-RAI-MIR-BAT, CC-0154, CC-0024 |
| Batch 3 | CC-0095, CC-0007, CC-0147, CC-0118, CC-0146, CC-0088, CC-0155, CC-0127; alternate remaining CC-EXT-139 |
| Held-product pack | CC-0168, CC-0019 (+ CC-0004) |
| Meta-title fix | CC-INT-108 (year vs VC); CC-INT-102 duplicate-title issue **closed** |
| Batch F (2026-10-02) | CC-0096 (moved from alternates), CC-0143, CC-0164, CC-0158, CC-0138, CC-INT-153, CC-SWF-DHC-CF |
| Batch 4 (2026-10-02) | FAQ-disclose: CC-0022, CC-0098, CC-0196, CC-TCR-EXT-SMC-CF-15, CC-INT-155, CC-0159, CC-0175, CC-0176, CC-0040, CC-LGT-203; **CC-EXT-107** → closed (VC repaired) |
