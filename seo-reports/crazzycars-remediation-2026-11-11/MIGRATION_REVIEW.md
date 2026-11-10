# MIGRATION_REVIEW — dry-run only (DO NOT APPLY)

**Status:** READY FOR OWNER REVIEW  
**Target precondition:** Mongo URI fingerprint **must** equal `187aad8c44fe3a84` and DB name `crazzycars_motorsports` at apply time.  
**Refuse:** Atlas `317ae4de8eb24f84`, legacy `84143ac0cb2c3085`, any other FP.  
**Evidence source:** Live public API `GET /api/products/:slug` reconfirmed 2026-11-11 (read-only).  
**Dry-run result this session:** **DOCUMENTED / READY** — selectors and preconditions verified against live API payloads. **Not executed** against Mongo (local FP ≠ live; no owner GO).  
**Agent note:** Local `.env.local` is Atlas — refuse writes. Apply only on a session that prints FP `187aad8c44fe3a84` + db `crazzycars_motorsports`.

Category ObjectIds (from API):

| Slug | `_id` |
| --- | --- |
| `splitters-side-skirts` | `6a5ccf34eb06d36eb2ac1af0` |
| `spoilers-diffusers` | `6a5ccf34eb06d36eb2ac1af1` |
| `carbon-fiber-accessories` | `6a5ccf35eb06d36eb2ac1afc` |

---

## M1 — Alto fender: remove Swift VC (P0)

| Field | Value |
| --- | --- |
| Collection | `products` |
| Document ID | `6a5d226489c0c8d16c691fb8` |
| Slug | `2-pcs-set-alto-660cc-audi-style-side-fender-indicator-in-smoke-color` |
| SKU | `CC-0023` |
| Confidence | **high** |
| Evidence | Title = Alto 660cc; VC currently includes Alto **and** Swift 2025–2026 |
| Affected count | **1** document; **1** VC row remove (+ optional `compatibleVehicles` pull) |

### Current values (API)

```json
"vehicleCompatibility.vehicles": [
  { "make": "Suzuki", "model": "Alto", "yearFrom": 2020, "yearTo": 2026 },
  { "make": "Suzuki", "model": "Swift", "yearFrom": 2025, "yearTo": 2026 }
]
```

### Proposed

- `$pull` from `vehicleCompatibility.vehicles` where `make`~`/^Suzuki$/i` and `model`~`/^Swift$/i`
- `$pull` from `compatibleVehicles` any ObjectId whose Vehicle.slug is `suzuki-swift-2025-present` (resolve ID at apply time)
- **Keep** Alto row

### Precondition (abort if changed)

```js
{
  _id: ObjectId("6a5d226489c0c8d16c691fb8"),
  slug: "2-pcs-set-alto-660cc-audi-style-side-fender-indicator-in-smoke-color",
  "vehicleCompatibility.vehicles": {
    $elemMatch: { make: /^Suzuki$/i, model: /^Swift$/i, yearFrom: 2025 }
  }
}
```

### Rollback

Re-insert the Swift VC row exactly as current snapshot (backup JSON before apply).

---

## M2 — Steering trim: remove Splitters category (P0)

| Field | Value |
| --- | --- |
| Collection | `products` |
| Document ID | `6a5d227089c0c8d16c692045` |
| Slug | `toyota-corolla-2015-2026-carbon-steering-trim` |
| SKU | `CC-0157` |
| Confidence | **high** |
| Evidence | Title = steering trim; category includes Splitters |
| Affected count | **1** |

### Current categories

- `carbon-fiber-accessories` `6a5ccf35eb06d36eb2ac1afc` — **keep**
- `splitters-side-skirts` `6a5ccf34eb06d36eb2ac1af0` — **remove**

### Proposed

```js
{ $pull: { categories: ObjectId("6a5ccf34eb06d36eb2ac1af0") } }
```

### Precondition

```js
{
  _id: ObjectId("6a5d227089c0c8d16c692045"),
  slug: "toyota-corolla-2015-2026-carbon-steering-trim",
  categories: ObjectId("6a5ccf34eb06d36eb2ac1af0")
}
```

### Rollback

`$addToSet: { categories: ObjectId("6a5ccf34eb06d36eb2ac1af0") }`

---

## M3 — Ducktail spoiler: reclassify Splitters → Spoilers (P0)

| Field | Value |
| --- | --- |
| Collection | `products` |
| Document ID | `6a5d227089c0c8d16c69204a` |
| Slug | `toyota-corolla-e140-2009-2013-ducktail-trunk-spoiler` |
| SKU | `CC-0162` |
| Confidence | **high** |
| Evidence | Title = ducktail trunk spoiler; only category today is Splitters |
| Affected count | **1** |

### Current

- categories: `[splitters-side-skirts 6a5ccf34eb06d36eb2ac1af0]`

### Proposed

```js
{
  $pull: { categories: ObjectId("6a5ccf34eb06d36eb2ac1af0") },
  $addToSet: { categories: ObjectId("6a5ccf34eb06d36eb2ac1af1") } // spoilers-diffusers
}
```

Optional: set `primaryCategorySlug: "spoilers-diffusers"` if field used in admin.

### Precondition

```js
{
  _id: ObjectId("6a5d227089c0c8d16c69204a"),
  slug: "toyota-corolla-e140-2009-2013-ducktail-trunk-spoiler",
  categories: ObjectId("6a5ccf34eb06d36eb2ac1af0")
}
```

### Rollback

Reverse pull/addToSet using backup.

---

## M4 — Corolla monogram: remove Aqua / Vitz / Yaris VC (P0)

| Field | Value |
| --- | --- |
| Collection | `products` |
| Document ID | `6a5d227089c0c8d16c692044` |
| Slug | `toyota-corolla-2009-2026-carbon-steering-monogram-abs` |
| SKU | `CC-0156` |
| Confidence | **high** (title + Corolla year span; Aqua/Vitz/Yaris are cross-model) |
| Evidence | Name is Corolla monogram; VC lists Aqua, Corolla×2, Vitz, Yaris |
| Affected count | **1** document; **3** VC rows remove |

### Current VC models

- Aqua 2012–2026 — **remove**
- Corolla 2009–2014 — **keep**
- Corolla 2014–2026 — **keep**
- Vitz 2012–2026 — **remove**
- Yaris 2020–2026 — **remove**

### Proposed

`$pull` vehicles where `model` ∈ `/^(Aqua|Vitz|Yaris)$/i` (make Toyota).  
Also `$pull` matching `compatibleVehicles` ObjectIds for those Vehicle docs (resolve at apply).

### Precondition

```js
{
  _id: ObjectId("6a5d227089c0c8d16c692044"),
  slug: "toyota-corolla-2009-2026-carbon-steering-monogram-abs",
  $and: [
    { "vehicleCompatibility.vehicles": { $elemMatch: { model: /^Aqua$/i } } },
    { "vehicleCompatibility.vehicles": { $elemMatch: { model: /^Corolla$/i } } }
  ]
}
```

Abort if Corolla rows missing (would orphan product fitment).

### Rollback

Restore three removed VC rows from backup JSON.

---

## Explicitly NOT in this migration pack

| Item | Reason |
| --- | --- |
| Swift multi-gen mats / door handles | AMBIGUOUS physical fitment |
| Swift RS body kit title 2022–2024 vs VC 2025–2026 | AMBIGUOUS — needs owner choice |
| Prices / inventory / images | Forbidden |
| Bulk catalogue rewrite | Out of scope |

---

## Dry-run procedure (when owner provides live FP session)

1. Confirm FP `187aad8c44fe3a84` + db `crazzycars_motorsports`.
2. `find` each `_id` with precondition projection → write `before-*.json`.
3. Run updates inside a transaction / sequential with precondition `matchedCount === 1` else abort.
4. Re-`find` → `after-*.json`.
5. Do **not** `--apply` without separate written GO naming M1–M4.
