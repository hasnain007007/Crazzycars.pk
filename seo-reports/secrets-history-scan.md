# Git history credential scan (types + paths only — no values)

Scanned: `git log -p` for seed/README/docs; no secret values recorded here.

## Findings (rotate)

| type | paths (historical) | action |
|------|--------------------|--------|
| hardcoded-admin-password (seed) | `storecraft-admin/scripts/seed-admin.mjs` (older commits) | Rotate production admin password if still matching any historical seed |
| default-admin-email (docs/README/seed) | `README.md`, `storecraft-admin/scripts/seed-admin.mjs`, `docs/SECURITY-AUDIT.md`, `docs/FINAL-VERIFICATION.md` | Email is public-ish; rotate password; do not re-publish defaults |
| emergency-temp-password (referenced) | `docs/CLEAN-SYSTEM.md` / `docs/SECURITY-AUDIT.md` (type only) | Confirm that account was rotated |
| placeholder-seed-password (ChangeMe-style) | `storecraft-admin/scripts/seed-admin.mjs` (very old commits) | Historical only; confirm unused |

## Needs rotating (names only)

- Production admin account password (any password that ever appeared in git history for the seed script)
- Any emergency/temp admin password from the density-verify incident (if ever applied)
- JWT_SECRET / DB credentials: no live secret values found in current working tree by C20/C21 scan; history rewrite of old seed password remains an owner decision (not done)

## Not rewritten

Git history was **not** rewritten (forbidden without explicit GO). Current tree uses env-only `ADMIN_EMAIL` + `ADMIN_PASSWORD`.
