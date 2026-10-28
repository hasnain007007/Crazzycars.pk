# D4 — S6-DB keyword-map sync dry-run (NO APPLY)

**When:** 2026-10-28T22:50:43Z
**GRANTED:** empty → dry-run only. Token needed: `S6-DB`.
**Depends:** D2 done (dry-run complete; apply blocked). Code titles already live; this step only syncs DB for admin UI parity.
**Source:** `seo-reports/fix-all-1029/S6-dry-run.md`.
**Fingerprint:** `84143ac0cb2c3085`. Fresh mongodump + scratch restore-test before write.

## Scope

| Surface | Action when granted |
|---------|---------------------|
| Listed vehicles | `$set` metaTitle/metaDescription to match `PAGE_SEO_OVERRIDES` |
| Listed categories | optional `$set` to match `CATEGORY_KEYWORD_META` (wire already prefers code) |
| HUD product | `$set` only if DB differs from live code override |
| Truth check | Only claim products the page really lists (no Aqua/Vitz on side-mirror cat; no grill on Civic X; etc.) |

## Planned ops when `GRANTED: S6-DB`

Field-level `$set` only; skip fields already equal; never invent product claims.

## Rollback

```bash
# mongorestore pre-S6-DB archive for vehicles/categories/products touched
```

## APPLY STATUS

**BLOCKED — GRANTED does not include S6-DB.** Live wire already uses code overrides; DB sync optional.
