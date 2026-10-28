# S7c — Mongo index dry-run (NO CREATE without `GO S7c-INDEXES`)

Fingerprint target (writes only): `84143ac0cb2c3085`. Atlas `317ae4de8eb24f84` is read-only.

## Why

Home/category/blog TTFB still spends time in Mongo. Hot paths after ISR/unstable_cache still need:

1. Blog post by slug + published
2. Blog list by status + publishedAt
3. Product storefront filter + deals/featured sorts

## Proposed indexes (dry-run only)

```js
// blogposts
db.blogposts.createIndex(
  { status: 1, slug: 1 },
  { name: "status_slug", background: true }
);
db.blogposts.createIndex(
  { status: 1, publishedAt: -1 },
  { name: "status_publishedAt", background: true }
);
db.blogposts.createIndex(
  { status: 1, categories: 1, publishedAt: -1 },
  { name: "status_categories_publishedAt", background: true }
);

// products — compound covering WEBSITE_PRODUCT_FILTER + deal/home sorts
db.products.createIndex(
  { status: 1, segment: 1, securityHold: 1, updatedAt: -1 },
  { name: "storefront_segment_updated", background: true }
);
db.products.createIndex(
  { status: 1, segment: 1, isDeal: 1, updatedAt: -1 },
  { name: "storefront_deals_updated", background: true }
);
db.products.createIndex(
  { status: 1, segment: 1, featured: 1, updatedAt: -1 },
  { name: "storefront_featured_updated", background: true }
);
```

## Verify before create

```js
db.blogposts.getIndexes()
db.products.getIndexes()
// explain the hot queries with .explain("executionStats")
```

## Apply message required

Exact: `GO S7c-INDEXES`

Then: fresh mongodump of FP `84143ac0cb2c3085`, field-level createIndex only (no drops), re-run explain.
