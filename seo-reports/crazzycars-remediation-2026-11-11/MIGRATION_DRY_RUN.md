# MIGRATION DRY-RUN — Fitment & category data corrections

**Status:** READY FOR OWNER REVIEW — **NOT APPLIED**  
**Target DB (when approved):** must fingerprint `187aad8c44fe3a84` / `crazzycars_motorsports` only  
**Refuse:** Atlas `317ae4de8eb24f84`, legacy `84143ac0cb2c3085`

## Safety

- Dry-run only in this package.
- Backup: `mongodump` filtered by product `_id` / slug before apply.
- Rollback: restore previous `categories` / `vehicleCompatibility` / `compatibleVehicles` from backup JSON.
- No price, inventory, image, or order fields touched.

## Proposed operations (high confidence)

### 1. Alto fender — remove Swift fitment (CC-P0-001)

| Field | Value |
| --- | --- |
| Slug | `2-pcs-set-alto-660cc-audi-style-side-fender-indicator-in-smoke-color` |
| Evidence | Title = Alto 660cc; VC currently has Alto 2020–2026 **and** Swift 2025–2026 |
| `$pull` | `vehicleCompatibility.vehicles` where `model` ~ `/^Swift$/i` |
| Also | Remove any `compatibleVehicles` ObjectId for Swift 2025–present Vehicle doc |
| Keep | Alto VC row |
| After | Must not appear on `/cars/suzuki-swift-2025-present` even without code filter |

### 2. Steering trim — remove Splitters category (CC-P0-002a)

| Slug | `toyota-corolla-2015-2026-carbon-steering-trim` |
| --- | --- |
| Remove category | `splitters-side-skirts` |
| Keep | `carbon-fiber-accessories` (and any interior carbon category if present) |
| Suggested primary | carbon / interior trim — **not** splitters |

### 3. Ducktail spoiler — reclassify (CC-P0-002b)

| Slug | `toyota-corolla-e140-2009-2013-ducktail-trunk-spoiler` |
| --- | --- |
| Remove | `splitters-side-skirts` |
| Add (if exists) | `spoilers-diffusers` (verify Category slug active before apply) |
| Evidence | Title = ducktail trunk spoiler |

## Medium confidence (hold unless owner confirms)

### 4. Swift RS body kit title vs VC years (CC-P1-003)

- Title: 2022–2024  
- VC: 2025–2026 only  
- Options: (A) move VC to 2018–2024 / 2022–2024 Swift hub; (B) retitle if part truly fits 2025; (C) leave + document  
- **Default hold:** no auto-write

### 5. Multi-gen Swift mats / door handles (CC-P1-004)

- VC lists both prior and 2025 gens — may be correct physical fitment  
- **Default:** UNIVERSAL/multi-gen review — no auto-write

## Apply gate checklist

1. Owner approval on this file  
2. Confirm live FP `187aad8c44fe3a84`  
3. Write before-values JSON  
4. Apply with `--dry-run` then `--apply`  
5. Re-crawl Swift + Splitters pages  
6. Record POST_DEPLOY_VERIFICATION.md  

**Script status:** not yet generated as executable apply script — create only after owner selects rows 1–3 vs 4–5.

## Additional high-confidence rows from live catalogue audit (399 products)

### 5. Corolla steering monogram — remove Aqua / Vitz / Yaris VC rows

| Slug | `toyota-corolla-2009-2026-carbon-steering-monogram-abs` |
| --- | --- |
| Evidence | Title is Corolla; VC incorrectly lists Aqua, Vitz, Yaris |
| Action | `$pull` those vehicleCompatibility rows (+ compatibleVehicles ObjectIds) |
| Keep | Corolla fitment rows only |

### 6. Confirm Alto→Swift removal (already §1)

Audit reconfirmed `title_names_alto_on_swift_hub`.

Catalogue audit summary: 13 fitment flags (mix high/medium), 2 category VERIFIED_INCORRECT (steering trim, ducktail). See FITMENT_AUDIT.csv / CATEGORY_AUDIT.csv.
