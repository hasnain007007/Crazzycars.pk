# OWNER_APPROVAL_REQUIRED — Stage 2 Mongo M1–M4

**Code deploy `c98e0ad`:** complete (see `POST_DEPLOY_REPORT.md`).  
**This ask:** authorise **or** refuse production Mongo writes for M1–M4 only.

## Recommendation

# **CONDITIONAL GO** for M1–M4

Ready to apply on exact preconditions, with these gates:

1. Apply **only** via VPS / `crazzycars-store` against `sialkot-mongo` / **`crazzycars_motorsports`**.  
2. Confirm store URI fingerprint **`aef1004e2d04d2fc`** at apply time (credentialed live URI).  
3. Abort if any update `matchedCount !== 1`.  
4. Take `/data/crazzycars/mongo/m1-m4-backup-*` before writes.  
5. **Do not** pull monogram ↔ Yaris Cross (ambiguous hold).  
6. Keep frontend filters after apply.

Not a blank GO: fingerprint docs historically cited unauthenticated `187aad8c…`; live credentialed FP is `aef1004e…` but DB identity is verified.

## Approval phrases

| Reply | Effect |
| --- | --- |
| `GO migrate M1-M4` | Apply the four updates in `MIGRATION_REVIEW.md` with backup + abort gates |
| `GO migrate M1-M3` | Skip monogram (M4) |
| `NO GO` | Hold — hubs already filtered in code |

## Package

- `DATABASE_TARGET_VERIFICATION.md`  
- `MIGRATION_REVIEW.md`  
- `MIGRATION_DRY_RUN.md`  
- `dry-run-2026-11-11/before-m1-m4.json`  
- `GSC_POST_DEPLOY_BASELINE.md`  
