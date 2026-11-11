# MIGRATION_REVIEW — Stage 2 dry-run (DO NOT APPLY)

**Status:** READY FOR OWNER APPROVAL  
**Code deploy:** `c98e0ad` live — frontend filters already hide these misfits  
**Mongo writes:** **none yet**  
**Fresh evidence:** VPS read-only via `crazzycars-store` → `crazzycars_motorsports` + public API (2026-11-11)

## Target gate (apply-time abort if any fail)

| Gate | Required |
| --- | --- |
| Host | `sialkot-mongo` |
| DB name | `crazzycars_motorsports` |
| Live store URI FP | **`aef1004e2d04d2fc`** (recompute from store env; must match) |
| Canonical short-URI FP (docs) | `187aad8c44fe3a84` = path identity only |
| Refuse | Atlas `317ae4de…`, legacy twin `84143ac0…`, any other merchant DB |
| Matched count | Each update `matchedCount === 1` else **abort** |

Snapshot: `dry-run-2026-11-11/before-m1-m4.json`

---

## M1 — Alto fender: remove Swift fitment

| Field | Value |
| --- | --- |
| Collection | `products` |
| Document ID | `6a5d226489c0c8d16c691fb8` |
| Slug / SKU | `2-pcs-set-alto-660cc-audi-style-side-fender-indicator-in-smoke-color` / **CC-0023** |
| Confidence | **high** |
| Affected | **1** doc |

### Before → after

| Field | Before | After |
| --- | --- | --- |
| VC | Alto 2020–2026 **+** Swift 2025–2026 | **Alto only** |
| `compatibleVehicles` | Alto `…1ce6` + Swift `…1ce7` | **Alto `…1ce6` only** |
| Categories | LED indicator + SOS flasher | **unchanged** |

### Exact update (conceptual)

```js
db.products.updateOne(
  {
    _id: ObjectId("6a5d226489c0c8d16c691fb8"),
    slug: "2-pcs-set-alto-660cc-audi-style-side-fender-indicator-in-smoke-color",
    "vehicleCompatibility.vehicles": { $elemMatch: { make: /^Suzuki$/i, model: /^Swift$/i, yearFrom: 2025 } },
    compatibleVehicles: ObjectId("6a5cd43eeb06d36eb2ac1ce7"),
  },
  {
    $pull: {
      "vehicleCompatibility.vehicles": { make: /^Suzuki$/i, model: /^Swift$/i },
      compatibleVehicles: ObjectId("6a5cd43eeb06d36eb2ac1ce7"),
    },
  }
);
```

### Keep (legitimate)

- Alto VC row; Alto vehicle `suzuki-alto-2020-present`
- Both lighting categories

### Rollback

Restore Swift VC object `_id: 6ae8b5defc12692230a39b32` + `compatibleVehicles` Swift id from backup JSON.

---

## M2 — Steering trim: leave Splitters

| Field | Value |
| --- | --- |
| Document ID | `6a5d227089c0c8d16c692045` |
| Slug / SKU | `toyota-corolla-2015-2026-carbon-steering-trim` / **CC-0157** |
| Confidence | **high** |
| Affected | **1** doc |

### Before → after

| Field | Before | After |
| --- | --- | --- |
| Categories | carbon-fiber `…1afc` + splitters `…1af0` | **carbon-fiber only** |
| VC / compatibleVehicles | Corolla 2014–2026; Axio + E170 | **unchanged** |

### Exact update

```js
db.products.updateOne(
  {
    _id: ObjectId("6a5d227089c0c8d16c692045"),
    slug: "toyota-corolla-2015-2026-carbon-steering-trim",
    categories: ObjectId("6a5ccf34eb06d36eb2ac1af0"),
  },
  { $pull: { categories: ObjectId("6a5ccf34eb06d36eb2ac1af0") } }
);
```

### Keep

- `carbon-fiber-accessories`
- Corolla VC; Axio + E170 compatibleVehicles (legitimate Corolla-family)

### Rollback

`$addToSet: { categories: ObjectId("6a5ccf34eb06d36eb2ac1af0") }`

---

## M3 — Ducktail: Splitters → Spoilers

| Field | Value |
| --- | --- |
| Document ID | `6a5d227089c0c8d16c69204a` |
| Slug / SKU | `toyota-corolla-e140-2009-2013-ducktail-trunk-spoiler` / **CC-0162** |
| Confidence | **high** |
| Affected | **1** doc |

### Before → after

| Field | Before | After |
| --- | --- | --- |
| Categories | `[splitters …1af0]` only | **`[spoilers-diffusers …1af1]`** |
| VC | Corolla 2009–2014 | **unchanged** |
| compatibleVehicles | E140 only | **unchanged** |

Spoilers category verified **`status: active`**.

### Exact update

```js
db.products.updateOne(
  {
    _id: ObjectId("6a5d227089c0c8d16c69204a"),
    slug: "toyota-corolla-e140-2009-2013-ducktail-trunk-spoiler",
    categories: ObjectId("6a5ccf34eb06d36eb2ac1af0"),
  },
  {
    $pull: { categories: ObjectId("6a5ccf34eb06d36eb2ac1af0") },
    $addToSet: { categories: ObjectId("6a5ccf34eb06d36eb2ac1af1") },
  }
);
```

### Rollback

Reverse pull/addToSet from backup (restore sole Splitters membership).

---

## M4 — Corolla monogram: remove Aqua / Vitz / Yaris

| Field | Value |
| --- | --- |
| Document ID | `6a5d227089c0c8d16c692044` |
| Slug / SKU | `toyota-corolla-2009-2026-carbon-steering-monogram-abs` / **CC-0156** |
| Confidence | **high** for Aqua/Vitz/Yaris VC + matching vehicle IDs |
| Affected | **1** doc |

### Before → after (VC)

| Model | Action |
| --- | --- |
| Aqua 2012–2026 | **remove** |
| Corolla 2009–2014 | **keep** |
| Corolla 2014–2026 | **keep** |
| Vitz 2012–2026 | **remove** |
| Yaris 2020–2026 | **remove** |

### `compatibleVehicles` pull (exact IDs)

| ID | Slug | Action |
| --- | --- | --- |
| `6a5cd43deb06d36eb2ac1cda` | toyota-aqua-2012-present | **remove** |
| `6a5cd43deb06d36eb2ac1cdb` | toyota-vitz-2012-present | **remove** |
| `6a5cd43deb06d36eb2ac1cd9` | toyota-yaris-2020-present | **remove** |
| `6a5cd43ceb06d36eb2ac1cd7` | toyota-corolla-e140-2009-2014 | **keep** |
| `6a5cd43deb06d36eb2ac1cd8` | toyota-corolla-e170-2014-2026 | **keep** |
| `6a5ea45789c0c8d16c696450` | toyota-axio-2014-2022 | **keep** (Corolla Axio family) |
| `6a71072b3261f3cfd4c7551c` | toyota-yaris-cross-2020-present | **HOLD — ambiguous** (not in VC; do not pull in M4) |

### Exact update

```js
db.products.updateOne(
  {
    _id: ObjectId("6a5d227089c0c8d16c692044"),
    slug: "toyota-corolla-2009-2026-carbon-steering-monogram-abs",
    $and: [
      { "vehicleCompatibility.vehicles": { $elemMatch: { model: /^Aqua$/i } } },
      { "vehicleCompatibility.vehicles": { $elemMatch: { model: /^Corolla$/i } } },
      { "vehicleCompatibility.vehicles": { $elemMatch: { model: /^Vitz$/i } } },
      { "vehicleCompatibility.vehicles": { $elemMatch: { model: /^Yaris$/i } } },
    ],
  },
  {
    $pull: {
      "vehicleCompatibility.vehicles": { make: /^Toyota$/i, model: /^(Aqua|Vitz|Yaris)$/i },
      compatibleVehicles: {
        $in: [
          ObjectId("6a5cd43deb06d36eb2ac1cda"),
          ObjectId("6a5cd43deb06d36eb2ac1cdb"),
          ObjectId("6a5cd43deb06d36eb2ac1cd9"),
        ],
      },
    },
  }
);
```

### Rollback

Restore three VC rows + three vehicle ObjectIds from backup JSON.

---

## Frontend after data fix

Deployed filters (`rejectTitleModelConflicts`, `categoryMembershipMongoGuard`) remain in place as defence-in-depth. After M1–M4 they become mostly no-ops for these SKUs; hubs stay correct even if bad data reappears.

Live today (code-only): Swift/Splitters already exclude misfits. M1–M4 clean the API/Mongo so other surfaces (admin, feeds, mobile) stop advertising wrong relationships.

---

## Ambiguous — NOT in M1–M4

| Item | Why held |
| --- | --- |
| Monogram ↔ Yaris Cross compatibleVehicle | Not in VC; platform overlap unclear |
| Swift RS body kit title 2018–2024 vs VC 2025 | Year conflict — owner choice |
| Multi-gen Swift mats / door handles | May be physically correct |

---

## Isolation

Updates use exact `_id` selectors on **four** product documents in `crazzycars_motorsports` only. No other collections/sites.
