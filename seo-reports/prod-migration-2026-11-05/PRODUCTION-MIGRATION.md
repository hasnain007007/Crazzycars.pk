# Production migration (reviewable) — do NOT apply until authorized

**Target DB:** `crazzycars_motorsports` on VPS `sialkot-mongo` (Coolify `crazzycars-store` / `crazzycars-admin`)  
**Source of URI:** container env `MONGODB_URI` (never commit / print credentials)  
**Dry-run completed:** 2026-11-04 against live DB via `mongo:7` on `sialkot-db` network  
**Code deploy verified:** image `crazzycars-store:d2adb40` + `crazzycars-admin:d2adb40` healthy

## Why Atlas `sialkot_motorsports` was written earlier

| DB | Host | Used by | This task |
|----|------|---------|-----------|
| `crazzycars_motorsports` | VPS `sialkot-mongo` | crazzycars.pk live | **intended prod target** — dry-run only so far |
| `sialkot_motorsports` | VPS `sialkot-mongo` | sialkot-store live | untouched |
| `sialkot_motorsports` | Atlas `cluster0.yg8dcwr` | local `.env.local` only | **accidental --apply** (6 records) |

Atlas is **not** the intended CrazzyCars test database. Rollback script:  
`scripts/migrations/2026-11-05-atlas-sialkot-rollback.mjs` (dry-run default).

## Proposed production changes (from dry-run)

### Vehicles (3) — metaDescription
| slug | change | before → after |
|------|--------|----------------|
| `toyota-prius-2004-2009` | yes | “…at **Sialkot Motorsports**…” → XW20-specific CrazzyCars meta |
| `toyota-prius-2009-2015` | yes | same shared blurb → XW30-specific |
| `toyota-prius-2016-2022` | yes | short COD stub → 2016–2022-specific |

*Note: Live HTML already shows correct metas via code (`carPageMeta` preference). DB write still needed to remove “Sialkot Motorsports” contamination and keep feeds/admin consistent.*

### Products / categories (2)
| slug | action |
|------|--------|
| `toyota-corolla-x-carbon-fiber-interior-door-handle-panels-2014-2026` | remove `door-handle-covers` (keep interior + carbon*) |
| `toyota-corolla-carbon-fiber-interior-door-panels-4pcs-2014-2026` | same |

Unexpected extras matching interior-door regex in door-handle-covers: **none**.

### Settings (1)
`storePayment.advancePaymentMessage`: legacy “pay the **delivery charges** of {amount} in advance…” → booking-advance template (deducted from total; no fitment-refund promise).  
*Runtime already sanitizes this on read; DB write makes admin/CMS match.*

### Blog posts (2) — permanent CMS correction (replaces render scrub)
| slug | conflict flags |
|------|----------------|
| `delivery-charges-regular-vs-bulky-pakistan` | flat250 every order, delivery paid in advance, wrong 5k–10k tier boundary |
| `car-accessories-returns-wrong-item-pakistan` | change-of-mind = exchange only |

Skipped: **none**. Unexpected: **none**.

## Backup procedure (before --apply)

On VPS (credentials from container env only):

```bash
NET=sialkot-db
URI=$(docker inspect crazzycars-store --format '{{range .Config.Env}}{{println .}}{{end}}' | grep '^MONGODB_URI=' | sed 's/^MONGODB_URI=//')
STAMP=$(date -u +%Y%m%dT%H%M%SZ)
OUT=/data/crazzycars/backups/policy-mig-$STAMP
mkdir -p "$OUT"

docker run --rm --network "$NET" -v "$OUT:/out" mongo:7 \
  mongosh "$URI" --quiet --eval '
const ids = {
  vehicles: ["toyota-prius-2004-2009","toyota-prius-2009-2015","toyota-prius-2016-2022"],
  products: ["toyota-corolla-x-carbon-fiber-interior-door-handle-panels-2014-2026","toyota-corolla-carbon-fiber-interior-door-panels-4pcs-2014-2026"],
  blogs: ["delivery-charges-regular-vs-bulky-pakistan","car-accessories-returns-wrong-item-pakistan"]
};
const dump = {
  vehicles: db.vehicles.find({slug:{$in:ids.vehicles}}).toArray(),
  products: db.products.find({slug:{$in:ids.products}}, {slug:1,name:1,categories:1,updatedAt:1}).toArray(),
  blogs: db.blogposts.find({slug:{$in:ids.blogs}}).toArray(),
  settings: db.settings.findOne({}, {"storePayment.advancePaymentMessage":1, updatedAt:1})
};
print(EJSON.stringify(dump, null, 2));
' > "$OUT/pre-apply.json"

# Also copy dry-run report
cp /tmp/cc-prod-dryrun-report.json "$OUT/" 2>/dev/null || true
echo "Backup at $OUT"
```

## Apply (only after explicit authorization)

```bash
# From repo on a host that can reach sialkot-mongo (or docker on VPS):
node scripts/migrations/2026-11-05-policy-content-and-categories.mjs --apply \
  --uri="$MONGODB_URI_FROM_STORE_CONTAINER"
```

Prefer re-running dry-run first and diffing against this report.

## Rollback (production)

Restore from `$OUT/pre-apply.json`:

1. **Vehicles:** set `metaDescription` to backed-up values for the 3 Prius slugs.  
2. **Products:** `$addToSet` the backed-up `door-handle-covers` ObjectId onto both product `categories` arrays.  
3. **Settings:** restore `storePayment.advancePaymentMessage`.  
4. **Blogs:** restore full `content`, `excerpt`, `seo`, `title` documents from backup.

Do **not** bulk-restore unrelated collections.

## Render-time scrub status

`scrubPolicyConflictCopy.js` is **narrow phrase replacement** (policy conflicts only). Verified: unrelated HTML (`<p>Hello <strong>world</strong></p>`) left intact.  
Gap found: blog **excerpt** was not scrubbed (only `content` + meta). Patch pending in `storeBlogData.js` so excerpt/JSON-LD stay consistent until CMS apply.
