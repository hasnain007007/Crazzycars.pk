# Database Migrations

## Status: NO PRODUCTION WRITES PERFORMED

### 1. NAP Settings (existing dry-run)

- Artifact: `seo-reports/crazzycars-remediation-2026-11-11/nap-settings-dryrun.json`
- Fingerprint gate: `187aad8c44fe3a84`
- Action: `$set` Settings.general address/geo/hours/phone to GBP values
- Rollback: restore prior Settings snapshot from dry-run `before`

### 2. Empty fitment vehicles (inventory only)

- Artifact: `empty-fitment-inventory.json` (52 active SKUs from export dump)
- Not live FP — values may drift
- Proposed: for true universal → ensure `fitmentType=universal` + honest note; else owner assigns vehicles
- No `updateMany` prepared without live IDs confirmation

### 3. Compare-at / T10c / T12

- Blocked pending owner decisions + live FP
