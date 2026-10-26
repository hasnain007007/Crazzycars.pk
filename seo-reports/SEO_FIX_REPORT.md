# SEO fix report — 2026-10-27

Source of truth: `seo-reports/STATE.json`. Owner inputs: **EMPTY** (NEEDS-OWNER where facts required).

| Task | Status | Done checks | Branch | Commits | Notes |
|------|--------|-------------|--------|---------|-------|
| T0 Verifier + baseline | DONE | — | seo/T0 | 65659d2 | baseline hard fails listed in STATE |
| T1 llms.txt live cats (C13) | DONE | C13 | seo/T1 | 9b86d01 | C13 pass; no regressions |
| T2 security.txt (C18) | PENDING | C18 | — | — | — |
| T3 robots Allow 404s (C14) | PENDING | C14 | — | — | GATE |
| T4 redirect-map (C15/C1/C16) | PENDING | C15,C1,C16 | — | — | GATE |
| T5 titles ≤60 (C4) | PENDING | C4 | — | — | GATE |
| T6 meta ≤160 (C5) | PENDING | C5 | — | — | GATE |
| T7 duplicate titles (C6) | PENDING | C6 | — | — | GATE |
| T8 og:image (C7) | PENDING | C7 | — | — | — |
| T9 image alts (C8) | PENDING | C8 | — | — | soft |
| T10 vehicle FAQ visible (C9) | PENDING | C9 | — | — | — |
| T11 vehicle direct-answer (C10) | PENDING | C10 | — | — | — |
| T12 Product Offer policies (C11) | PENDING | C11 | — | — | — |
| T13 blog schema/crumbs (C12) | PENDING | C12 | — | — | Author NEEDS-OWNER |
| T14 homepage weight (C19) | PENDING | C19 | — | — | soft |

## Per-task log

### T0
- Status: DONE
- Plan: Build verifier; save baseline.
- Rollback: delete `scripts/seo-verify.mjs` + `seo-reports/baseline.json`.

### T1
- Status: DONE | C13 pass | commit 9b86d01
- Plan: Filter llms categories to ≥1 live product; canonical mat slugs.
- Rollback: revert `storecraft-store/app/llms.txt/route.js`.
