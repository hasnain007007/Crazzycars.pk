# L0 — Missing SEO apply inventory (read-only, 2026-10-28)

**Sources:** live `https://crazzycars.pk` + prod Mongo FP `84143ac0cb2c3085` vs `backups/seo-2026-10-apply/`  
**Hold:** no writes until M4 restore plan is settled, then exact `GO L1` / `GO L2`.

## Summary

| Pack | Status on live |
|------|----------------|
| **Apply 1** (titles/metas/content, 10 Oct) | Largely **rolled back / overwritten**. Almost no product still matches the apply “after”. Several vehicle DB titles still equal backup **before**. Live HTML for Alto is still the pre-audit string from **code**. |
| **Apply 2** (fitment + category membership) | Vehicle `$pull`s **still present**. Category membership ops **partially missing** (4 products still wrong). |
| **Owner edit** (Corolla X door handle Set of 4 / Rs. 5,999) | **Missing** — live is Set of 2 / sale Rs. 4,490. |

## Apply 1 — pages where live ≈ backup “before” (or wire still shows old)

### Vehicles (DB `metaTitle` equals backup before)

| Path | Live DB title (= before) | Apply after (missing) |
|------|--------------------------|------------------------|
| `/cars/toyota-yaris-2020-present` | Toyota Yaris Accessories in Pakistan \| Body Kits & LED \| CrazzyCars.pk | Toyota Yaris 2020–2026 Accessories in Pakistan \| CrazzyCars.pk |
| `/cars/suzuki-swift-2025-present` | Suzuki Swift 2025+ Accessories in Pakistan \| CrazzyCars.pk | Suzuki Swift 2025–Present Accessories in Pakistan \| CrazzyCars.pk |
| `/cars/toyota-aqua-2012-present` | Toyota Aqua Accessories in Pakistan \| CrazzyCars.pk | Toyota Aqua Accessories & Body Kits in Pakistan \| CrazzyCars.pk |
| `/cars/honda-civic-x-2016-2021` | Honda Civic X 2016–2021 Accessories & Body Kits in Pakistan \| CrazzyCars.pk | Honda Civic X 2016–2021 Accessories & Carbon Interior Trims |

### Vehicles — wire still shows pre-audit title (code override)

| Path | Live HTML `<title>` | Source | Apply after (DB+code) |
|------|---------------------|--------|------------------------|
| `/cars/suzuki-alto-2020-present` | **Suzuki Alto Accessories Price in Pakistan 2019-Present** | `storecraft-store/lib/seo/carPageMeta2026-10.mjs` | Suzuki Alto 2019–2026 Accessories in Pakistan \| CrazzyCars.pk |

DB for Alto is already `Suzuki Alto 2020+…` (diverged); the **HTML** still serves the old `carPageMeta` string. L1 must update that code file as well as re-`$set` vehicle meta.

### Products — known examples (live HTML / DB ≠ apply after)

| Path | Live title (HTML) | Matches backup before? | Apply after |
|------|-------------------|------------------------|-------------|
| `/toyota-aqua-2012-2015-complete-body-kit` | Toyota Aqua 2012-2015 Complete Body Kit \| CrazzyCars.pk | ≈ before (+ brand suffix) | Toyota Aqua 2012–2015 Body Kit Price in Pakistan |
| `/toyota-corolla-grande-steering-wheel-trim-in-carbon-fiber-multimedia` | Corolla Grande Carbon Multimedia Steering Trim | No (diverged rewrite) | Corolla Grande Steering Wheel Trim (Carbon Look) |
| `/toyota-corolla-gli-xli-2009-2014-multimedia-steering-wheel-audio-control-buttons` | Toyota Corolla GLi XLi Steering Audio Buttons | No (diverged) | Corolla GLi/XLi 2009–2014 Steering Audio Control Buttons |
| `/car-heads-up-display-hud` | Universal Heads Up Display HUD Car Speed \| CrazzyCars.pk | ≈ before (+ suffix) | Car HUD Heads Up Display Price in Pakistan \| CrazzyCars.pk |
| `/deepal-s05-batman-style-side-mirror-covers` | Deepal S05 Batman Style Side Mirror Covers \| CrazzyCars.pk | ≈ before (+ suffix) | Deepal S05 Batman Side Mirror Covers Price in Pakistan |

### Products — all apply-1 targets still not at “after” (DB)

Every product in `seo-backup-2026-10.json` currently **diverges** from the apply-1 after values (partial later rewrites kept neither before nor after). L1 should re-`$set` from `PAGE_SEO_OVERRIDES` / apply script for any field where live ≠ after (skip only exact after matches — currently ~0 products).

Full product slug list (13):

1. `toyota-corolla-grande-steering-wheel-trim-in-carbon-fiber-multimedia`
2. `toyota-corolla-gli-xli-2009-2014-multimedia-steering-wheel-audio-control-buttons`
3. `funny-window-hand-gesture-led-light`
4. `toyota-corolla-2009-2026-carbon-steering-monogram-abs`
5. `car-front-bumper-splitter-abs-plastic-3pcs`
6. `toyota-aqua-2012-2015-complete-body-kit`
7. `toyota-corolla-2015-2026-rs-style-trunk-spoiler-abs`
8. `honda-city-new-model-trunk-lip-spoiler-2021-2026`
9. `deepal-s05-batman-style-side-mirror-covers`
10. `car-heads-up-display-hud`
11. `toyota-corolla-2012-top-ac-panel` (name / Butto fix / features)
12. `honda-city-2021-2026-carbon-fiber-gear-knob` (name → “…Gear Knob Cover…”)
13. `changan-oshan-x7-batman-style-side-mirror-covers` (shortDescription)

### Categories — DB titles ≠ apply after (and ≠ before)

All 6 apply-1 categories diverged (later SEO packs). Live wire titles for splitters / interior-lights were shortened in F5 code; DB `seo.metaTitle` still older short forms. L1 re-applies gscAudit after values only where live ≠ after.

## Apply 2 — fitment / membership

| Check | Live | Need L1? |
|-------|------|----------|
| Door handle panels: no E140 vehicle | OK (only E170) | No |
| Dashboard trim 3PCS: no E140 | OK | No |
| Rebirth ducktail: no Civic X / Reborn | OK | No |
| E140 ducktail: pull splitters, add spoilers | **FAIL** still in splitters, not spoilers | Yes |
| Corolla 2015–2026 carbon steering trim: pull splitters | **FAIL** still in splitters | Yes |
| Shark fin diffuser: pull splitters, add spoilers | **FAIL** | Yes |
| Civic X carbon steering trim: pull louvers | **FAIL** still in louvers | Yes |

Before snapshot: `backups/seo-2026-10-apply/fitment-membership-before-values-20261010T211824Z.json`  
Apply script: `scripts/seo/apply-fitment-membership-2026-10.mongosh.js`

## Owner edit — Corolla X door handle panels

| Field | Expected (owner / gscAudit) | Live |
|-------|-----------------------------|------|
| `name` | …**(Set of 4)** | …**(Set of 2)** |
| `metaTitle` / `seo.metaTitle` | Corolla X Door Handle Panels 2014–2026 Set of 4 \| CrazzyCars.pk | Toyota Corolla X Carbon Door Handle Panels 2014–2026 Price in Pakistan (70 chars) |
| `metaDescription` | …set of 4… **Rs. 5,999**… | …set of 2… **Rs. 4,490**… |
| Price | Sale **5,999** | Sale **4,490** / regular 5,490 |

**Price note for L1:** owner edit documentation says Rs. 5,999. Live catalog sale is 4,490. L1 dry-run will `$set` SEO/name to Set of 4 + meta copy using **live sale price** unless you explicitly say to change pricing (pricing is out of SEO `$set` allow-list anyway — only name/meta fields).

## Backup / mongodump reference

- Repo snapshot: `backups/seo-2026-10-apply/`
- Original mongodump path (VPS): `/data/crazzycars-mongo-backups/seo-apply-20261010T200917Z` (see `MONGODUMP-PATH.txt`)

## Next

- **L1 / M4b** dry-run: `seo-reports/migration/L1-dry-run-m4b-reapply-2026-10-28.md` → wait **`GO L1`**
- **L2** new low-CTR pack: `seo-reports/migration/L2-dry-run-low-ctr-titles-2026-10-28.md` → wait **`GO L2`**
- Do not apply either until M4 data restore plan is settled.
