# F6 dry-run — duplicate velvet dashboard mat titles

**Fingerprint for writes:** `84143ac0cb2c3085`. Never Atlas `317ae4de8eb24f84`.  
**GATE:** wait for exact `GO F6`.

## Duplicate group (live)

| Path | Live `<title>` | Len |
|------|----------------|----:|
| `/toyota-corolla-2014-2026-velvet-dashboard-mat` | Toyota Corolla Velvet Dashboard Mat \| CrazzyCars.pk | 51 |
| `/toyota-corolla-2008-2013-velvet-dashboard-mat` | Toyota Corolla Velvet Dashboard Mat \| CrazzyCars.pk | 51 |
| `/toyota-corolla-cross-2020-2026-velvet-dashboard-mat` | Toyota Corolla Cross Velvet Dashboard Mat \| CrazzyCars | 57 |

First two share an identical title. Make each unique with model + year range, 60–65 chars.

## Proposed (unique, 60–65)

| Slug | NEW metaTitle | Len |
|------|---------------|----:|
| toyota-corolla-2014-2026-velvet-dashboard-mat | Toyota Corolla Velvet Dashboard Mat 2014-2026 \| CrazzyCars.pk | 61 |
| toyota-corolla-2008-2013-velvet-dashboard-mat | Toyota Corolla Velvet Dashboard Mat 2008-2013 \| CrazzyCars.pk | 61 |
| toyota-corolla-cross-2020-2026-velvet-dashboard-mat | Toyota Corolla Cross Velvet Dash Mat 2020-2026 \| CrazzyCars.pk | 62 |

Also `$set` `seo.metaTitle` to the same string.

## Apply sketch (after GO F6 + backup)

```js
db.products.updateOne(
  { slug: "toyota-corolla-2014-2026-velvet-dashboard-mat" },
  { $set: {
      metaTitle: "Toyota Corolla Velvet Dashboard Mat 2014-2026 | CrazzyCars.pk",
      "seo.metaTitle": "Toyota Corolla Velvet Dashboard Mat 2014-2026 | CrazzyCars.pk",
      updatedAt: new Date(),
  }}
);
// …2008–2013 and Cross similarly
```

## Stop

Waiting for exact message: **GO F6**
