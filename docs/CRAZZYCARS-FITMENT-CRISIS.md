# crazzycars.pk — Systemic Fitment Crisis

**Date:** 2026-08-21  
**Scope:** Live Mongo catalog (`sialkot_motorsports` / CrazzyCars.pk) + storefront vehicle-page query  
**Mode:** Investigation only — **no auto-fixes applied**  
**Supersedes:** Earlier title-vs-fitment mismatch counting (incomplete; structurally blind to page-level bleed)

**Raw scan artifact:** `data/fitment-crisis-scan.json`

---

## Executive verdict

The business owner’s report is **confirmed on the live site**. Browsing a new-generation vehicle page (e.g. Toyota Corolla E170–E210 2014–2026, Honda Civic 11th Gen 2022+) shows large numbers of **older-generation parts**.

This is **not** primarily a mass “wrong ObjectId stamped at import” problem (Gujranwala Swift-style). It is primarily a **storefront query bug**:

> `/cars/[slug]` loads products via `loadProductsForVehicle()` which matches `compatibleCars` / `vehicleCompatibility` by **make + model name only**, and **ignores `yearFrom` / `yearTo`** even though **100% of `compatibleCars` rows already carry years**.

Correctly filed E140 / Reborn / Civic X products therefore **bleed onto every other Corolla / Civic generation page** (and vice versa). Shopify collection → ObjectId linking is mostly generation-correct; the page layer undoes that.

| Signal | Count |
|--------|------:|
| Active products | 393 |
| Vehicle records | 63 |
| Vehicle pages with ≥1 wrong appearance | **22** |
| Wrong product appearances across pages (double-counts multi-page bleed) | **577** |
| Unique products involved in ≥1 wrong page appearance | **218** |
| Of those, caused by make/model bleed (not ObjectId misfile) | **~218** |
| True ObjectId links whose title years sit outside the linked Vehicle span | **3** (all Honda Vezel 2013–2018 → `honda-vezel-2020-2026`) |

Customer impact on high-traffic multi-gen models is **severe** (Civic newest page ~73% wrong; Corolla newest ~40% wrong). This warrants treating multi-generation vehicle pages as **emergency UX**, not a leisurely cleanup — preferably a **query fix deploy first**, then light data hygiene.

---

## PHASE F0 — Reproduce the exact report

### Corolla generations in Mongo

| Slug | Generation | Years | Created |
|------|------------|-------|---------|
| `toyota-corolla-e120-2002-2008` | E120 | 2002–2008 | 2026-07-20 |
| `toyota-corolla-e140-2009-2014` | E140 | 2009–2014 | 2026-07-19 |
| `toyota-corolla-e170-2014-2026` | E170–E210 | 2014–present | 2026-07-19 |
| `toyota-axio-2014-2022` | (Axio) | 2014–2022 | 2026-07-20 |
| `toyota-corolla-cross-2020-present` | Cross | 2020–present | 2026-07-20 |

Newest “mainline” Corolla for PK shoppers: **`toyota-corolla-e170-2014-2026`**.

### Live reproduction (HTTPS, 2026-08-21)

On https://crazzycars.pk/cars/toyota-corolla-e170-2014-2026 the JSON-LD product list includes, among others:

- `Toyota Corolla E140 2009–2013 Ducktail Trunk Spoiler`
- `Toyota Corolla 2012-2014 Black Canadian Style Front Grille`
- `Toyota Corolla E120 Dynamic Back Bumper Light RGB 2002-2008`

On https://crazzycars.pk/cars/honda-civic-11th-gen-2022-present:

- `Honda Civic X 2016-2021 Batman Style Side Mirror Cover`
- `Honda Civic Reborn 2006-2012 Carbon Window Quarter Covers`
- `Honda Civic X 2016–2021 RS Style Trunk Spoiler`
- …plus dozens more Reborn / Rebirth / Civic X titles

### Newest Corolla (E170) — page inventory

**How the page is built:** `app/cars/[slug]/page.jsx` → `loadProductsForVehicle()` in `lib/vehiclePageData.js`:

1. `compatibleVehicles` contains this Vehicle ObjectId, **OR**
2. `compatibleCars` elemMatch `{ make, model }` using **model-name aliases only** (no year filter), **OR**
3. `vehicleCompatibility.vehicles` same make/model match

| Metric | Value |
|--------|------:|
| Products shown (simulated live query) | **80** |
| ObjectId-linked to E170 only | 45 |
| **Wrong on this page** (exclusive ObjectId on another Corolla-family gen, but still shown) | **32 (40%)** |
| OK / intended | ~48 |
| Unclear | small |

**Every wrong item on E170 in this scan is a bleed**, not an ObjectId pointing at E170. Examples (title → actually ObjectId-linked gen):

| Product title (evidence) | Linked generation | Why it appears on E170 |
|--------------------------|-------------------|------------------------|
| Toyota Corolla E140 2009–2013 Ducktail Trunk Spoiler | E140 | `compatibleCars` make=Toyota model=Corolla (years 2009–2014 ignored) |
| Toyota Corolla 2009-2011 Body Kit D1 / D2 / D4 | E140 | same |
| Toyota Corolla 2012-2014 Black Canadian Style Front Grille | E140 | same |
| Toyota Corolla E120 Dynamic Back Bumper Light RGB 2002-2008 | E120 | same |
| Toyota Corolla Cross 2020-2026 Velvet Dashboard Mat | Cross | substring model match: `/Corolla/` matches `Corolla Cross` |
| Toyota Axio 2014-22 Velvet Dashboard Mat | Axio | family bleed via Corolla naming |

ObjectId-only check for E170 (title years vs linked Vehicle): **no** mass mis-stamping of E140 parts *onto* the E170 Vehicle record. The ObjectIds are largely right; the **page query is wrong**.

### Honda Civic 11th Gen — same method

Civic generations present: ES 2001–2005, Reborn 2006–2012, Rebirth 2012–2016, Civic X 2016–2021, **11th Gen 2022–present**.

| Metric | Value |
|--------|------:|
| Products on 11th Gen page | **101** |
| Wrong | **74 (73%)** |
| Pattern | Reborn / Rebirth / Civic X / ES parts with correct other-gen ObjectIds bleed in via `make=Honda model=Civic` |

Examples:

- Honda Civic Reborn 2006-2012 Multimedia Steering Wheel Audio Control Buttons → ObjectId Reborn, shows on 11th Gen  
- Honda Civic X 2016-2021 Sports Body Kit Complete → ObjectId Civic X, shows on 11th Gen  
- Honda Civic Rebirth Chrome Front Grille 2012-2015 → ObjectId Rebirth, shows on 11th Gen  

### Suzuki Alto newest (`suzuki-alto-2020-present`)

Only **two** Alto Vehicle records (Old 2000–2012, 2020–present). Bleed surface is smaller.

| Metric | Value |
|--------|------:|
| Products on page | 12 |
| Wrong | **1 (8%)** — `Suzuki Alto Old Velvet Dashboard Mat` (ObjectId on old Alto) |

Alto alone would **not** look like a catalog-wide crisis; **Corolla + Civic** do.

### F0 conclusion

Owner report is **catalog-wide for multi-generation models** (especially Civic and Corolla), **not Corolla-only**, and **not explained by the old title-vs-fitment field comparison**. Page-level make/model matching is the ground-truth mechanism.

---

## PHASE F1 — Full-catalog systemic scan

### Method (broader than title-year parsing)

For every active non-universal product and every Vehicle:

1. Simulate the **live** `loadProductsForVehicle` matcher (ObjectId **or** make/model on `compatibleCars` / `vehicleCompatibility`).
2. Flag **WRONG** when the product appears on a Vehicle page but its `compatibleVehicles` ObjectIds are **exclusively** other same-model-family generation(s) — i.e. the page is showing another gen’s catalog via bleed.
3. Also flag when matched `compatibleCars` years **do not overlap** the page Vehicle’s year span (data already has years; query ignores them).
4. Cross-check Shopify `crazzycars-products/data/collection_memberships.json` as the original collection source.

### Results by make/model (wrong *appearances*, not unique SKUs)

| Make / model | Wrong page appearances |
|--------------|----------------------:|
| Honda Civic | **383** |
| Toyota Corolla | **141** |
| Honda City | 20 |
| Toyota Mark X | 9 |
| Honda Vezel | 7 |
| Toyota Prius | 6 |
| Suzuki Swift | 5 |
| Hyundai Elantra (+ Hybrid) | 4 |
| Suzuki Alto | 1 |
| Audi A5 | 1 |
| **Total appearances** | **577** |
| **Unique products** | **218** |

Expectation that the problem is “significantly larger than a dozen title mismatches”: **confirmed**. Unique products involved: **218 / 393 active (~55%)** appear on at least one wrong vehicle page under the live query.

### High-volume vehicle pages — correct vs wrong

| Vehicle page | Shown | Wrong | Wrong % |
|--------------|------:|------:|--------:|
| Honda Civic 11th Gen 2022+ | 101 | 74 | **73%** |
| Honda Civic Reborn | 100 | 79 | **79%** |
| Honda Civic Rebirth | 100 | 84 | **84%** |
| Honda Civic X | 99 | 49 | **50%** |
| Honda Civic ES 2001–2005 | 98 | 97 | **99%** |
| Toyota Corolla E170 2014+ | 80 | 32 | **40%** |
| Toyota Corolla E140 | 79 | 40 | **51%** |
| Toyota Corolla E120 | 72 | 69 | **96%** |
| Honda City 2021+ | 26 | 12 | **46%** |
| Honda City classic | 26 | 8 | **31%** |
| Suzuki Alto 2020+ | 12 | 1 | 8% |
| Toyota Yaris 2020+ | 11 | 0 | 0% |

Single-generation / well-isolated models (Yaris, Aqua, etc.) look fine. **Any model with multiple Vehicle generations shares one `compatibleCars.model` string and is currently unusable as a generation browser.**

### Collection memberships cross-check

Shopify collections were largely generation-split correctly:

| Collection | Products |
|------------|--------:|
| `toyota-corolla-2009-2014-accessories` | 27 |
| `toyota-corolla-e170-2014-2020-accessories` | 34 |
| Overlap both Corolla collections | **2** |
| Civic gen collections | 15–32 each |
| Civic collection overlaps | small (1–7), not “everything in one pile” |

`transform.py` maps those handles to the correct Vehicle slugs (`VEH_MAP`). Import labeling is **not** the main failure mode here. Downstream live Mongo ObjectIds generally honor that mapping; the **storefront ignores generation/years when assembling the page**.

---

## PHASE F2 — Root cause

### Mechanism (primary)

**File:** `storecraft-store/lib/vehiclePageData.js` — `loadProductsForVehicle`

```js
compatibleCars: { $elemMatch: { make: makeRx, model: modelRx } }
// no yearFrom / yearTo / generation constraint
```

Observed live data shape for a typical E140 part:

```json
{
  "make": "Toyota",
  "model": "Corolla",
  "generation": "Toyota Corolla E140 (2009–2014)",
  "yearFrom": 2009,
  "yearTo": 2014
}
```

- **341 / 393** active products have `compatibleCars`
- **374 / 374** car rows include year fields (**100%**)
- Query never uses them → every `model: "Corolla"` row matches **every** Corolla Vehicle page

Secondary aggravators:

1. **Substring model regex** (no `^$` anchors): alias `Corolla` matches `Corolla Cross`, `Corolla Axio`, etc.
2. **`modelNameAliases` includes `generation`**, so nickname rows can also widen matches.
3. Mark X special-case title OR (legacy) can add further noise on that family.

### Import / timing (Gujranwala Swift pattern) — largely **not** the CrazzyCars story

| Check | Finding |
|-------|---------|
| E140 vs E170 Vehicle creation | Both created **2026-07-19 ~13:42**, ~1s apart — **before** product import wave (~19:15 same day) |
| E120 / Cross | Added next day (2026-07-20) — late gens, but E140↔E170 bleed does not depend on that |
| ObjectId title-outside-span | **3** products (Vezel 2013–2018 → 2020 Vehicle) |
| E170-titled products ObjectId-only on E140 | **0** |
| 11th-gen-titled products missing 11th ObjectId | **0** |

`transform.py` **does** have a dangerous fallback (`INFER`: bare `corolla` → E170; bare `alto` → 2020 Alto; bare `swift` → 2025 Swift), and Civic/City patterns that can misfire — but live ObjectIds for the high-volume Corolla/Civic sets are **mostly generation-correct**. Fixing import alone would **not** stop the owner-visible bleed while the page query ignores years.

### Fix-strategy implication

This is **systemic and code-dominated**, not “random per-product noise.”  

- **Bulk rematch of ObjectIds is the wrong first move** for the majority of the 218.  
- **Correct the vehicle-page (and any shared) query to respect years / ObjectIds** and most wrong *appearances* disappear immediately without touching product documents.  
- Then clean the small true ObjectId errors (Vezel ×3, any INFER leftovers) and review year-less / multi-fit edge cases.

---

## PHASE F3 — Customer impact

### What customers see on top pages

Using product-count as the traffic proxy (no separate analytics in this pass):

| Rank by catalog size | Page | Fraction wrong |
|----------------------|------|----------------|
| 1 | Civic 11th Gen | **~73%** |
| 2–4 | Other Civic gens | **~50–99%** |
| 5–7 | Corolla E170 / E140 / E120 | **~40–96%** |
| 8–9 | City gens | **~31–46%** |
| 10 | Alto 2020 | ~8% |

Browsing **any Civic or Corolla generation page is fundamentally unreliable today**.

### Wrong parts vs missing correct parts

| Direction | Severity |
|-----------|----------|
| **Wrong parts on new-gen pages** | **Dominant.** Old-gen SKUs flood new-gen pages via bleed. |
| **Correct new-gen parts missing because misfiled on old ObjectIds** | **Low for Corolla/Civic.** Scan found **0** clear “E170 title stuck only on E140 ObjectId” and **0** “11th Gen title missing 11th ObjectId.” New-gen parts are present; they are drowned out by wrong siblings. |
| **Bidirectional pollution** | Old pages also show new-gen parts (E140 page ~51% wrong includes many 2015–2026 titles). |

### Severity call

**Emergency for multi-gen vehicle browse UX** — not because the catalog ObjectIds are 50% corrupt, but because the **UI path customers use to shop by car** concatenates all generations.

Recommended posture:

1. **Do not** take the whole site down.  
2. **Do** prioritize a **query fix deploy** (hours of eng work) so `/cars/*` for Corolla/Civic/City stops bleeding.  
3. Optionally hide or soft-disable the worst pages (Civic ES is ~99% wrong) until that ships.  
4. Treat remaining ObjectId/data cleanup as a **follow-on** measured in days, not the blocker.

---

## Proposed fix strategy (not executed)

### Tier A — Stop the bleed (primary, high leverage)

**Change `loadProductsForVehicle` (and any shared helpers used by fitment APIs / filters) to:**

1. Prefer **`compatibleVehicles` ObjectId** as the source of truth for generation pages, **or**
2. When falling back to `compatibleCars` / `vehicleCompatibility`, require **year-range overlap** with the Vehicle’s `yearFrom`/`yearTo` (and/or exact generation match), and  
3. Use **anchored** model matching (or exact equality) so `Corolla` ≠ `Corolla Cross`.

**Effort:** small code change + QA on Corolla / Civic / City / Alto / Swift pages.  
**Expected effect:** removes the vast majority of the **577** wrong appearances without editing hundreds of products.

### Tier B — True data errors (small)

- Fix **3 Vezel** ObjectId mislinks (2013–2018 titles → 2020 Vehicle).  
- Spot-check `transform.py` `INFER` fallbacks for any remaining bare-model stamps.  
- Review ~year-less titles that only appear via vague `compatibleCars` rows.

**Effort:** handful of products + scripted verification.

### Tier C — Do **not** lead with

- Mass “bulk rematch from titles” à la Gujranwala’s 8 cases as the *main* fix — wrong mechanism here.  
- Per-product manual review of all 218 before shipping Tier A — wasteful; most are correctly filed already.

### Rough plan for next session

1. Implement Tier A behind a quick local check that E170 page product count drops from ~80 → ~45–50 and loses all E140/E120 titles.  
2. Redeploy store Coolify.  
3. Re-run scan script → expect wrong appearances near the ObjectId-error floor (~3+edge).  
4. Only then run targeted ObjectId rematches for residual true misfiles.

---

## Why earlier “dozen mismatch” work missed this

Title-vs-`compatibleCars` / title-vs-ObjectId comparison only catches documents where **fields disagree with the title**. Here, for the owner-visible bug:

- Title says E140  
- ObjectId says E140  
- `compatibleCars` years say 2009–2014  

**All three agree** — and the product still appears on the E170 page because the **page query never reads the years**. That class of failure is invisible to field-comparison audits and is exactly what this investigation was designed to catch.
