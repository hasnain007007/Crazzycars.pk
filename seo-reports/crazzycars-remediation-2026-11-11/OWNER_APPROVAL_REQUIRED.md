# OWNER_APPROVAL_REQUIRED

Nothing below has been applied to production Mongo or deployed from this remediation branch.

## A. Production deploy of code fixes

Branch: `fix/crazzycars-seo-aeo-geo-2026-11-11`

Includes (local):

1. Vehicle hub title-model conflict filter (hides Alto-on-Swift class errors).
2. Splitters category Mongo name-guard (hides steering trim / ducktail class misfits).
3. Removal of fabricated `FakePurchaseToast` social proof on PDPs.
4. Reports + audit tooling under `seo-reports/crazzycars-remediation-2026-11-11/`.

**Ask:** Approve merge/deploy to the authorised storefront pipeline (historically `vps-test` → Coolify)?

## B. Database migrations (separate)

See `MIGRATION_DRY_RUN.md` rows 1–3 (high confidence):

1. Remove Swift VC from Alto fender SKU.  
2. Remove Splitters category from Corolla steering trim.  
3. Reclassify Corolla E140 ducktail to spoilers (not splitters).

Requires live FP `187aad8c44fe3a84` session + backup.

## C. Ambiguous fitment holds

- Swift multi-gen mats/door handles (2022–2026 titles with 2025 VC).  
- Swift RS body kit title 2022–2024 vs VC 2025–2026.

## D. Compare-at / pricing audit

Read-only on live FP only — blocked without live URI.

## E. T12 blog Mongo expansions

Still blocked from prior SEO work — separate scoped GO.

## Explicit non-requests

- No price/inventory changes.  
- No OPA / other merchant changes.  
- No DNS / firewall changes.  
- No image asset overwrites.
