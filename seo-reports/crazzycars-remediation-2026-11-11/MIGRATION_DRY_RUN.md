# MIGRATION_DRY_RUN — Stage 2 (post-deploy `c98e0ad`)

**Status:** READ-ONLY COMPLETE — **NOT APPLIED**  
**Captured:** 2026-11-11 via `docker exec crazzycars-store`  
**Artifact:** `dry-run-2026-11-11/before-m1-m4.json`

## Identity

| Item | Value |
| --- | --- |
| Host | `sialkot-mongo` |
| DB | `crazzycars_motorsports` |
| Products | 430 |
| Store URI FP | `aef1004e2d04d2fc` |
| Canonical short URI FP | `187aad8c44fe3a84` |

## Proposed ops summary

| ID | Product | Change | Expected matchedCount |
| --- | --- | --- | --- |
| M1 | CC-0023 Alto fender | Pull Swift VC + Swift vehicle id | 1 |
| M2 | CC-0157 Steering trim | Pull Splitters category | 1 |
| M3 | CC-0162 Ducktail | Splitters → Spoilers | 1 |
| M4 | CC-0156 Monogram | Pull Aqua/Vitz/Yaris VC + 3 vehicle ids | 1 |

Total documents touched: **4**. No prices, stock, images, or orders.

## Field-level after projections (expected)

### M1 after

```json
{
  "vehicleCompatibility.vehicles": [{ "make": "Suzuki", "model": "Alto", "yearFrom": 2020, "yearTo": 2026 }],
  "compatibleVehicles": ["6a5cd43eeb06d36eb2ac1ce6"]
}
```

### M2 after

```json
{
  "categories": ["6a5ccf35eb06d36eb2ac1afc"]
}
```

### M3 after

```json
{
  "categories": ["6a5ccf34eb06d36eb2ac1af1"]
}
```

### M4 after

```json
{
  "vehicleCompatibility.vehicles": [
    { "make": "Toyota", "model": "Corolla", "yearFrom": 2009, "yearTo": 2014 },
    { "make": "Toyota", "model": "Corolla", "yearFrom": 2014, "yearTo": 2026 }
  ],
  "compatibleVehicles": [
    "6a5cd43ceb06d36eb2ac1cd7",
    "6a5ea45789c0c8d16c696450",
    "6a5cd43deb06d36eb2ac1cd8",
    "6a71072b3261f3cfd4c7551c"
  ]
}
```

(Yaris Cross retained as **ambiguous hold**.)

## Backup procedure (before any apply)

On VPS, read-only dump of the four docs + categories referenced:

```bash
# Example — run only on owner GO, before writes
STAMP=$(date -u +%Y%m%dT%H%M%SZ)
OUT=/data/crazzycars/mongo/m1-m4-backup-$STAMP
mkdir -p "$OUT"
docker exec crazzycars-store node -e '
  // export the four product docs + referenced categories/vehicles to stdout JSON
' > "$OUT/before.json"
# Optional mongodump query (auth via store URI inside container networking):
# mongodump --uri="$MONGODB_URI" --db=crazzycars_motorsports \
#   --collection=products --query='"{\"_id\":{\"$in\":[…]}}"' --out="$OUT/dump"
chmod -R go-rwx "$OUT"
```

Independent copy: also keep `seo-reports/.../dry-run-2026-11-11/before-m1-m4.json` in git.

## Rollback procedure (independent of git)

1. Load `$OUT/before.json` (or mongodump restore of the four `_id`s only).  
2. For each product, `$set` prior `vehicleCompatibility`, `compatibleVehicles`, `categories`.  
3. Do **not** restore unrelated collections.  
4. Revalidate Swift hub, Splitters shelf, Aqua/Yaris hubs, Spoilers PDP membership.  
5. Frontend filters still hide misfits even if rollback restores bad edges.

## Apply abort conditions

- Store URI FP ≠ `aef1004e2d04d2fc` (or recomputed store env at apply time)  
- DB name ≠ `crazzycars_motorsports`  
- Any precondition `matchedCount !== 1`  
- Spoilers category missing/inactive (M3)  
- Corolla VC rows missing on monogram (M4)

## Frontend coexistence

Post-`c98e0ad` filters already exclude these listings. Data corrections align Mongo/API/admin/feeds; filters stay.

## Ambiguous (unchanged)

- Yaris Cross on monogram `compatibleVehicles`  
- Swift body-kit year title vs VC  
- Multi-gen Swift mats / handles  
