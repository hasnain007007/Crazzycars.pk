=== SEO FIX REPORT ===
date_utc: 2026-10-26T20:31:52Z
repo_head_commit: fba55b01e08d577b61aff6e0c76c220733b2b123
vps_test_url: https://crazzycars.pk
verifier_baseline: seo-reports/baseline.json
verifier_final: seo-reports/runs/T2-20261026T202652Z.json

SUMMARY
tasks_total: 15 | done: 3 | blocked: 0 | needs_owner: 0 | hold: 0 | waiting_go: 1

CHECKS (baseline -> final; give counts)
C1 | PASS | 584 -> 584
C2 | PASS | 584 -> 584
C3 | PASS | 584 -> 584
C4 | FAIL | 584 -> 584
C5 | FAIL | 584 -> 584
C6 | FAIL | 584 -> 584
C7 | FAIL | 584 -> 584
C8 | FAIL (soft) | 6657 -> 6657
C9 | FAIL | 59 -> 59
C10 | FAIL | 59 -> 59
C11 | FAIL | 427 -> 427
C12 | FAIL | 39 -> 39
C13 | FAIL -> PASS | 129 -> 126
C14 | FAIL | 1 -> 1
C15 | FAIL | 0 -> 0
C16 | PASS | 584 -> 584
C17 | PASS | 427 -> 427
C18 | FAIL -> PASS | 1 -> 1
C19 | FAIL (soft) | 1 -> 1
C20 | PASS (soft) | 80 -> 80

TASKS (one line each)
T0 | DONE | seo/T0 | 65659d2 | 6 | — | delete scripts/seo-verify.mjs + seo-reports/baseline.json | Verifier + baseline; hard_fail C4–C7,C9–C15,C18 soft C8,C19
T1 | DONE | seo/T1 | 9b86d01,ab822e1 | 1 | C13 false->true | revert storecraft-store/app/llms.txt/route.js | C13 pass (126 links); no hard regressions
T2 | DONE | seo/T2 | e5eb64a,fba55b0 | 1 | C18 false->true | delete storecraft-store/app/.well-known/security.txt/route.js + redeploy | C18 pass; run T2-20261026T202652Z.json
T3 | WAITING-GO | seo/T3 | — | 0 | C14 false->— | revert robots.js + C14 Allow regex in seo-verify.mjs | Dry-run seo-reports/dry-runs/T3-robots-allow.md; loop stopped at GATE
T4 | PENDING | — | — | 0 | C15/C1/C16 — | — | GATE not reached
T5 | PENDING | — | — | 0 | C4 — | — | GATE not reached
T6 | PENDING | — | — | 0 | C5 — | — | GATE not reached
T7 | PENDING | — | — | 0 | C6 — | — | GATE not reached
T8 | PENDING | — | — | 0 | C7 — | — | —
T9 | PENDING | — | — | 0 | C8 — | — | soft
T10 | PENDING | — | — | 0 | C9 — | — | —
T11 | PENDING | — | — | 0 | C10 — | — | —
T12 | PENDING | — | — | 0 | C11 — | — | —
T13 | PENDING | — | — | 0 | C12 — | — | Author Person NEEDS-OWNER (inputs EMPTY)
T14 | PENDING | — | — | 0 | C19 — | — | soft

DATA CHANGES (one entry per write; write "none" if none)
none

REDIRECTS
rules added: 0 | rules total: 0 | unmatched old URLs file: none (seo-reports/redirect-map.csv not built) | regression tests passing: no

SECRETS
findings in git history: 0 (C20 working-tree scan pass) | types (no values): none | secrets that need rotating (names only): none

NEEDS OWNER (one bullet per missing input)
- Blog Author Person display name / sameAs (T13) — ownerInputs EMPTY
- Any legal/org facts for security.txt beyond Contact mailto (intentionally omitted; T2 used STORE_CONTACT.email only)
- GO approvals for gated tasks T3–T7 (resume GO list was empty)

BLOCKERS (task, failing check, last 10 lines of output)
- T3 WAITING-GO | C14 still FAIL on live until GO | last verify hard_fail=C4,C5,C6,C7,C9,C10,C11,C12,C14,C15 soft_fail=C8,C19 | dry-run ready: replace Allow /ai/ with /ai/catalog; fix C14 regex so Disallow is not matched as Allow

RELEASE ORDER (branches in review order, each with a one-line rollback)
1. seo/T0 — delete scripts/seo-verify.mjs and seo-reports/baseline.json
2. seo/T1 — revert storecraft-store/app/llms.txt/route.js
3. seo/T2 — delete storecraft-store/app/.well-known/security.txt/route.js and redeploy vps-test
4. seo/T3 (not merged; WAITING-GO) — discard branch / do not merge

URLS TO RE-REQUEST IN SEARCH CONSOLE (patterns and counts: vehicle pages, blog posts, changed products, redirected URLs)
- https://crazzycars.pk/llms.txt (1) — category link set corrected (T1)
- https://crazzycars.pk/.well-known/security.txt (1) — new (T2)
- https://crazzycars.pk/robots.txt (1) — pending T3 change; re-request after GO/deploy
- vehicle pages: 0 changed this loop
- blog posts: 0 changed this loop
- changed products: 0
- redirected URLs: 0 (no redirect-map yet)

SPOT CHECKS (five curl commands I can run against vps-test to see the fixes)
curl -sS https://crazzycars.pk/.well-known/security.txt
curl -sS https://crazzycars.pk/llms.txt | head -n 40
curl -sS -o /dev/null -w "%{http_code}\n" https://crazzycars.pk/ai/catalog
curl -sS https://crazzycars.pk/robots.txt | head -n 20
BASE_URL=https://crazzycars.pk SEO_VERIFY_TIMEOUT_MS=60000 node scripts/seo-verify.mjs --out seo-reports/runs/spot-check.json
=== END ===
