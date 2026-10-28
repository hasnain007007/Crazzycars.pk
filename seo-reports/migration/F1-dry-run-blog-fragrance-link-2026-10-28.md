# F1 dry-run — empty fragrance categories + perfume blog link

**Fingerprint required for any write:** `84143ac0cb2c3085` (sialkot-mongo / `sialkot_motorsports`).  
**Never write:** Atlas `317ae4de8eb24f84`.  
**GATE:** wait for exact `GO F1` before applying DB `$set`.

## Findings (read-only)

| Slug | DB status | Live products | Live HTTP |
|------|-----------|---------------|-----------|
| `fragrances` | active | **0** | 404 (`isEmptyCategoryTree`) |
| `hanging-perfumes` | active | **0** | 404 |
| `air-freshener-decoration` | active | 4 | 200 |

Categories were **not** deleted in the rollback — they exist but have no assigned products, so the category page correctly 404s. Closest live shelf: `/categories/air-freshener-decoration`.

Blog posts linked from FAQ (`…returns-wrong-item…`, `…delivery-charges…`) are **missing** from `blogposts` (rollback). Code now points FAQ/COD/policy UI links to `/returns-policy` and `/shipping-policy` until M4c restores posts.

## Code already on `fix/F1` (no GO)

- FAQ / COD / returns / shipping internal links → policy pages (+ M4c TODO comments).
- `deletedUrlRedirects.mjs`: `/categories/fragrances` and `/categories/hanging-perfumes` → `/categories/air-freshener-decoration`.
- `scripts/link-check.mjs` + seo-verify **C21**.

## DB write (needs GO F1) — field-level `$set` only

### 1) Perfume guide href

```js
// dry-run preview
db.blogposts.find(
  { slug: "car-perfume-air-freshener-guide" },
  { slug: 1, content: 1 }
);
// old fragment:
//   href="/categories/fragrances"
// new fragment:
//   href="/categories/air-freshener-decoration"
```

Apply (only after GO F1 + fresh backup + fingerprint check):

```js
db.blogposts.updateOne(
  { slug: "car-perfume-air-freshener-guide" },
  {
    $set: {
      content: /* same content with fragrances → air-freshener-decoration */,
      updatedAt: new Date(),
    },
  }
);
```

### 2) Optional restore plan (not a write)

If owner wants dedicated shelves again: assign perfume products to `hanging-perfumes` / `fragrances` (or merge those SKUs under `air-freshener-decoration` and keep redirects). No product reassignment in this gate.

## Restore-plan note for M4c

- Re-publish blog slugs:
  - `car-accessories-returns-wrong-item-pakistan-crazzycars`
  - `crazzycars-delivery-charges-regular-vs-bulky-pakistan`
- Then flip FAQ/COD/policy links back (see TODO(M4c) comments).

## Stop

Waiting for exact message: **GO F1**
