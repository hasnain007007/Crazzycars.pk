# Category HTTP 500 — production diagnosis

**Date:** 2026-10-29  
**Site:** https://crazzycars.pk  
**Sitemap:** `/sitemap-categories.xml` — **7 × 200**, **28 × 500** before fix  
**Example URL:** `/categories/body-kits-extensions`

## 1. Production stack (crazzycars-store)

Triggered: `GET /categories/body-kits-extensions` → 500.  
Source: `docker logs crazzycars-store` on `179.197.250.101`.

```
⨯ CastError: Cast to ObjectId failed for value "{
  '0': 106,
  '1': 92,
  '2': 207,
  '3': 51,
  '4': 235,
  '5': 6,
  '6': 211,
  '7': 110,
  '8': 178,
  '9': 172,
  '10': 26,
  '11': 233
}" (type Object) at path "_id" for model "Category"
    at ignore-listed frames {
  stringValue: '"{\n' +
    "  '0': 106,\n" +
    "  '1': 92,\n" +
    ...
    '}"',
  kind: 'ObjectId',
  value: {
    '0': 106,
    '1': 92,
    '2': 207,
    '3': 51,
    '4': 235,
    '5': 6,
    '6': 211,
    '7': 110,
    '8': 178,
    '9': 172,
    '10': 26,
    '11': 233
  },
  path: '_id',
  reason: BSONError: input must be a 24 character hex string, 12 byte Uint8Array, or an integer
      at ignore-listed frames,
  valueType: 'Object',
  digest: '2842799515'
}
```

Mongoose throws while `.populate("parentCategory" | "parents" | "ancestors")` in `loadStoreCategoryDetail` (`storecraft-store/lib/storeCategoryData.js`).

## 2. Root cause (data, not code path alone)

In **`crazzycars_motorsports.categories`**, child categories store parent refs as mangled BSON:

```js
parentCategory: { buffer: { '0': 106, '1': 92, /* … 12 bytes … */ } }
parents: [ { buffer: { … } } ]
ancestors: [ { buffer: { … } } ]
```

Those 12 bytes are the correct ObjectId (`6a5ccf33…` = Exterior for body-kits), but the clone/repoint serialized ObjectIds as `{ buffer: {0..11} }` instead of BSON ObjectId.

**Same slug in `sialkot_motorsports`:** proper `ObjectId('6a5ccf33eb06d36eb2ac1ae9')` — populate works.  
**Top-level CC categories** (`exterior`, `interior`, `led-lighting`, …) have empty `ancestors` / null parent → **200**.  
**Counts before repair:** CC ~65 categories with corrupt refs; Sialkot 0.

Not caused by missing `needsPhoto` / image fields (images present). Not a sort/index bug. Clone/migration corruption of ObjectId fields.

## 3. Fix plan

1. **Data:** repair `parentCategory` / `parents` / `ancestors` ObjectIds in `crazzycars_motorsports` (recover hex from buffer bytes), with mongodump backup first.  
2. **Code:** coerce mangled ObjectIds before populate; unit fixture + sitemap smoke test.  
3. Deploy code via Coolify only after report approval (data repair restores live 200s without image switch).


## 4. Applied on production Mongo (no Coolify image switch)

1. **Category ObjectId repair** — 65 categories: `parentCategory` / `parents` / `ancestors` restored from `{buffer:{0..11}}` → real ObjectIds.  
   Backup: VPS `/tmp/cc-categories-dump-pre-objectid-repair` + JSON `/tmp/cc-oid-backups/category-objectid-repair-*.json`.
2. **Product category refs** — 118 products had `categories` / `category` as hex **strings** (or mangled); coerced to ObjectIds.  
   Backup: `/tmp/cc-products-dump-pre-catref-repair`.
3. **Settings cross-brand email** — replaced `info@sialkotmotorsports.com` → `info@crazzycars.pk` in `aboutPage.faq[4].answer` and `storefront.checkoutSuccess.footerMessage` (0 hits remain).
4. Cleared Next fetch cache + `docker restart crazzycars-store` so `unstable_cache` empty category payloads refreshed.

## 5. Live smoke (post-repair)

See `reports/category-500-smoke-live.txt`. Target: every `/sitemap-categories.xml` URL → 200.

## 6. Still needs Coolify deploy (code on branch)

- Harden `loadStoreCategoryDetail` / tree loaders (no populate on mangled ids) + fixture test + smoke script.
- FAQ / shipping copy: booking advance still “from Rs. 250” on **live image** until port branch deploys (`codAdvanceTierSummary()`).
- Blog chrome: visible `Last updated: {date}` in `BlogPostView` (body HTML already has an updated line on some posts).
- Cache key bump `category-detail-v10`.
