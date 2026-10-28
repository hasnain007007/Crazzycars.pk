# M4 / L1 / L2 / S6-DB — dry-run only (OWNER INPUTS blank + GRANTED empty)

## Missing owner inputs

| Field | Current |
|-------|---------|
| Old VPS or old Mongo still running? | *(blank)* |
| Newest mongodump date and path | *(blank)* |
| Old `/media/uploads` path | *(blank)* |
| Door-handle panels: Set of 2 Rs. 4,490 (live) or Set of 4 Rs. 5,999 | *(blank)* |

## Prior dry-runs (reuse; do not write)

| Task | File |
|------|------|
| M4 | `seo-reports/fix-all-1029/M4-dry-run.md` |
| L1 | `seo-reports/fix-all-1029/L1-dry-run-m4b-reapply.md` |
| L1/L2 overlap | `seo-reports/fix-all-1029/L1-L2-overlap.md` |
| S6-DB | `seo-reports/fix-all-1029/S6-dry-run.md` |

## Exact messages required later

1. Fill OWNER INPUTS in the master prompt / STATE.
2. Put `M4`, `L1`, `L2`, `S6` (or `S6-DB`) in GRANTED.
3. Send in order: `GO M4` → `GO L1` → `GO L2` → `GO S6` (each with fresh mongodump on FP `84143ac0cb2c3085`).
