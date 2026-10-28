# F5 dry-run — long titles / odd descriptions

**Fingerprint for writes:** `84143ac0cb2c3085`. Never Atlas `317ae4de8eb24f84`.  
**GATE:** wait for exact `GO F5`.

## Full product slugs (from live sitemap)

| Truncated in brief | Full slug |
|--------------------|-----------|
| center-cons… | `/toyota-corolla-carbon-fiber-center-console-gear-glass-holder-2014-2026` |
| interior-do… | `/toyota-corolla-carbon-fiber-interior-door-panels-4pcs-2014-2026` |
| dashboard-t… | `/toyota-corolla-carbon-fiber-dashboard-trim-3pcs-lcd-2014-2026` |
| x-carbon… | `/toyota-corolla-x-carbon-fiber-interior-door-handle-panels-2014-2026` |

## Live lengths (2026-10-28)

| Path | Title len | Desc len | Action |
|------|----------:|---------:|--------|
| center-console-gear-glass-holder | **72** | 163 | DB `$set` title (+ optional desc) |
| door-panels-4pcs | **72** | 144 | DB `$set` title |
| dashboard-trim-3pcs | **75** | 158 | DB `$set` title |
| x door-handle-panels | **70** | 156 | DB `$set` title |
| `/categories/splitters-side-skirts` | 62 | 144 | OK (already ≤65) |
| `/categories/interior-lights` | 63 | 153 | OK |
| `/categories/exterior` | 52 | 155 | OK |
| `/advance-payment` | 43 | **166** | **code** on `fix/F5` |
| `/about` | 65 | **173** | **code** on `fix/F5` (clamp) |

## Proposed product metaTitle (60–65 chars)

| Slug | OLD | NEW | NEW len |
|------|-----|-----|--------:|
| …center-console-gear-glass-holder-2014-2026 | Toyota Corolla Carbon Center Console Kit 2014–2026 \| Gear + Glass Holder | Toyota Corolla Carbon Center Console 2014-26 \| CrazzyCars.pk | 60 |
| …interior-door-panels-4pcs-2014-2026 | Toyota Corolla Carbon Fiber Door Panels 4PCS 2014–2026 Price in Pakistan | Corolla Carbon Fiber Door Panels 4PCS 2014-26 \| CrazzyCars.pk | 61 |
| …dashboard-trim-3pcs-lcd-2014-2026 | Toyota Corolla Carbon Fiber Dashboard Trim 3PCS 2014–2026 Price in Pakistan | Corolla Carbon Dashboard Trim 3PCS 2014-2026 \| CrazzyCars.pk | 60 |
| …x-carbon-fiber-interior-door-handle-panels-2014-2026 | Toyota Corolla X Carbon Door Handle Panels 2014–2026 Price in Pakistan | Corolla X Carbon Door Handle Panels 2014-2026 \| CrazzyCars.pk | 61 |

Also `$set` matching `seo.metaTitle` on each doc.

Optional desc trim (center-console currently 163):

| OLD (163) | NEW (~152) |
|-----------|------------|
| Buy Toyota Corolla carbon-style center console kit (gear + glass/cup holder) for 2014–2026. Pioneer kit in Pakistan by CrazzyCars.pk. Sale Rs. 7,499. COD eligible. | Buy Toyota Corolla carbon center console kit (gear + glass holder) for 2014–2026. Sale Rs. 7,499 in Pakistan at CrazzyCars.pk. COD eligible. |

## Apply sketch (after GO F5 + backup)

```js
db.products.updateOne(
  { slug: "toyota-corolla-carbon-fiber-center-console-gear-glass-holder-2014-2026" },
  { $set: {
      metaTitle: "Toyota Corolla Carbon Center Console 2014-26 | CrazzyCars.pk",
      "seo.metaTitle": "Toyota Corolla Carbon Center Console 2014-26 | CrazzyCars.pk",
      updatedAt: new Date(),
  }}
);
// …same pattern for the other three slugs
```

## Stop

Waiting for exact message: **GO F5**
