# D3 — L2 low-CTR titles dry-run (NO APPLY)

**When:** 2026-10-28T22:50:43Z
**GRANTED:** empty → dry-run only. Token needed: `L2`.
**Depends:** separate write from L1; only after D2 done (D2 dry-run complete; apply still blocked).
**Source:** `seo-reports/fix-all-1029/L2-dry-run-low-ctr-titles.md`.
**Fingerprint:** `84143ac0cb2c3085`. Fresh mongodump + scratch restore-test before write.

## Overlap with L1

| Check | Result |
|-------|--------|
| Product slug overlap L1 SEO set ∩ L2 | **0** (none) |
| L2 ∩ L1 membership targets | **1** `toyota-corolla-x-shark-fin-style-lower-panel-diffuser` |

On apply: skip any field already equal to L1 after-value; never overwrite door-handle; prices in L2 metas already match live sale prices per source dry-run.

## Planned ops when `GRANTED: L2`

| Bucket | Count | Notes |
|--------|------:|-------|
| product title/meta `$set` | ~14 | ≤60 title, 140–155 meta |
| category title/meta `$set` | 2 | sos-flasher-led-lights, door-handle-covers |
| `/shop`, `/cars` | code | already shippable separately; listed in L2 dry-run |

## Rollback

```bash
# mongorestore pre-L2 archive for products/categories only
# or field $set from before-values JSON
```

## APPLY STATUS

**BLOCKED — GRANTED does not include L2.** Live unchanged.
