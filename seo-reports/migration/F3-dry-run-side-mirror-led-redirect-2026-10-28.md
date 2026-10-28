# F3 dry-run — sitemap URL that redirects

**Fingerprint for any write:** `84143ac0cb2c3085`. Never Atlas `317ae4de8eb24f84`.  
**GATE:** wait for exact `GO F3` before any DB write.

## Live finding

| Field | Value |
|-------|--------|
| Sitemap URL | `/toyota-corolla-2014-2026-side-mirror-led-indicators` |
| HTTP | **308** → `/cars/toyota-corolla-e170-2014-2026` |
| Cause | Code redirect in `lib/deletedUrlRedirects.mjs` (deleted catalogue URL → car hub) |

## Product record (read-only)

| Field | Value |
|-------|--------|
| `_id` | `6a835d9833a52e6041af41e1` |
| `slug` | `toyota-corolla-2014-2026-side-mirror-led-indicators` |
| `name` | Toyota Corolla 2014-2026 Side Mirror LED Indicators |
| `status` | `active` |
| `pricing.regularPrice` | 11000 |
| `pricing.salePrice` | 8500 |
| `inventory.quantity` | 118 |
| Main image | `…/toyota-corolla-2014-2026-side-mirror-led-indicators-5-32aa522429.webp` |
| Image count | 5 |

Price is **present** (not missing). The PDP slug is intentionally redirected away from a sellable URL; sitemap was still listing the active Mongo product.

## Code fix on `fix/F3` (no GO)

`lib/sitemap/entries.js` now:

1. Requires `pricing.salePrice > 0` or `pricing.regularPrice > 0`.
2. Excludes any path present in `DELETED_URL_REDIRECTS` (including this slug).
3. seo-verify **C23**: every sitemap URL must be HTTP 200 with no redirect.

## Optional DB write (only if owner wants SKU retired)

If the product should not remain `active` (redirect-only forever):

```js
// dry-run
db.products.findOne(
  { slug: "toyota-corolla-2014-2026-side-mirror-led-indicators" },
  { status: 1, slug: 1, pricing: 1 }
);

// apply after GO F3 + backup + fingerprint
db.products.updateOne(
  { slug: "toyota-corolla-2014-2026-side-mirror-led-indicators" },
  { $set: { status: "draft", updatedAt: new Date() } }
);
```

**Recommended:** keep product active for inventory/Order Hub; sitemap exclusion via code is enough.

## Stop

Waiting for exact message: **GO F3** (only if applying the optional status `$set`).
