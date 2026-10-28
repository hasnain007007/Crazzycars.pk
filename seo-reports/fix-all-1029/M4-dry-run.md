# M4 Restore dry-run — STOP (awaiting GO M4)

**Status:** blocked / dry-run only. No production writes.

## Intent
Finish restore dry-run for blog posts, products, and images (field-level `$set`/`$pull`/`$addToSet` only; FP `84143ac0cb2c3085`).

## Blocked why
Prior M4 restore plan / apply1+apply2 delta source is not fully reconstituted in this branch beyond:
- `backups/seo-2026-10-apply/seo-backup-dry-run-2026-10.json` (on `docs/L0-L2-seo-dry-runs`)
- L1/M4b re-apply list (see `L1-dry-run-m4b-reapply.md`)

Need owner confirmation which restore snapshot is authoritative before a fresh mongodump + write.

## Required before any write
1. Exact message: `GO M4`
2. Fresh mongodump path recorded here
3. Fingerprint check `84143ac0cb2c3085`
