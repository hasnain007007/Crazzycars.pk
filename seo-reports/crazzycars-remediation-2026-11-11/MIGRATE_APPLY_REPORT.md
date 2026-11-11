# MIGRATE_APPLY_REPORT — M1–M4

**Final status: SUCCESS**  
**Authorisation:** `GO migrate M1-M4`  
**Applied:** 2026-11-11 ~00:35–00:36 UTC  
**Code deploy unchanged:** `c98e0ad` (no redeploy)

## Database identity

| Item | Value |
| --- | --- |
| Host | `sialkot-mongo` |
| DB | `crazzycars_motorsports` |
| Credentialed URI FP | **`aef1004e2d04d2fc`** (matched gate) |
| Product count | 430 (unchanged) |

## Backup

**Path:** `/data/crazzycars/mongo/m1-m4-backup-20261111T003552Z/`  

| File | Purpose |
| --- | --- |
| `before.json` | Full four documents (53 753 bytes) — rollback source |
| `before-summary.json` | Compact before |
| `after.json` / `after-summary.json` | Post-write snapshots |
| `results.json` | Ack counts for M3/M4 (M1/M2 noted below) |

Backup verified readable with 4 complete documents before continuing.

## Acknowledged update results

| Migration | matchedCount | modifiedCount | acknowledged | Notes |
| --- | --- | --- | --- | --- |
| **M1** Alto − Swift | **1** | **1** | true | Applied first batch; confirmed by before→after |
| **M2** Trim − Splitters | **1** | **1** | true | Applied first batch; confirmed by before→after |
| **M3a** Ducktail − Splitters pull | **1** | **1** | true | Split from add (Mongo path conflict) |
| **M3b** Ducktail + Spoilers | **1** | **1** | true | Sequential `$addToSet` |
| **M4** Monogram − Aqua/Vitz/Yaris | **1** | **1** | true | Yaris Cross retained |

**Execution note:** First combined M3 `$pull`+`$addToSet` on `categories` aborted with Mongo conflict after M1/M2 success. M3 completed as two preconditioned updates; M4 followed. No unrelated rollbacks.

## Before → after

### M1 CC-0023
- VC: Alto+Swift → **Alto only**
- compatibleVehicles: Alto+Swift → **Alto only**

### M2 CC-0157
- Categories: carbon + splitters → **carbon only**
- Corolla VC + Axio/E170 vehicles: **unchanged**

### M3 CC-0162
- Categories: splitters → **spoilers-diffusers**
- Corolla E140 VC/vehicle: **unchanged**

### M4 CC-0156
- VC: Aqua+Corolla×2+Vitz+Yaris → **Corolla×2 only**
- compatibleVehicles: removed Aqua/Vitz/Yaris; **kept** E140, E170, Axio, **Yaris Cross**

## Live API verification

All four product APIs match after state (Swift gone, Splitters gone from trim, ducktail on spoilers, monogram Corolla-only VC).

## Live website verification

| Check | Result |
| --- | --- |
| Swift hub no Alto | **PASS** |
| Splitters no trim/ducktail | **PASS** |
| Spoilers lists ducktail | **PASS** |
| Aqua no monogram | **PASS** |
| Corolla hub has monogram | **PASS** |
| PDPs accessible; no fake toast | **PASS** |
| Frontend filters still effective | **PASS** |
| Health 430 products | **PASS** |

## Unchanged / isolation

| Check | Result |
| --- | --- |
| Product count still 430 | **PASS** |
| Control SKU CC-0001 present | **PASS** |
| Yaris Cross not removed | **PASS** |
| OPA / sialkot / gujranwala / mongo / proxy | **healthy / up** |
| No code deploy / service restart for migration | **PASS** |

## Rollback readiness

Restore the four `_id`s from  
`/data/crazzycars/mongo/m1-m4-backup-20261111T003552Z/before.json`  
via field-level `$set` of `vehicleCompatibility`, `compatibleVehicles`, `categories` only. Frontend filters would still hide misfits if rolled back.
