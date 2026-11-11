# POST_DEPLOY_VERIFICATION — Master Remediation RC

**Final status: SUCCESS**

**Deployed SHA:** `0b99dc3381a1e2011075b064cc622cf23f388a40`  
**Previous store image:** `crazzycars-store:c98e0ad`  
**Live store image:** `crazzycars-store:0b99dc3` (healthy)  
**Deploy log:** `/data/crazzycars/deploy/deploy-20261111T153437Z.log` → `=== deploy ok 0b99dc3 ===`  
**Method:** `origin/vps-test` fast-forward to RC → `FORCE=1 /data/crazzycars/scripts/deploy-vps-test.sh`  
**Mongo / Settings / catalogue / prices / payments / ads / DNS:** **unchanged** (code-only)

---

## 1. Preflight results

| Gate | Result |
|---|---|
| Exact candidate SHA at HEAD | **PASS** `0b99dc3…` |
| Tracked working tree clean | **PASS** (only unrelated untracked local artefacts) |
| Diff vs `c98e0ad` / `origin/vps-test` | Storefront SEO/NAP/C19/BR-V/C8 + reports; **no `storecraft-admin` source diffs** |
| 10 new resolutions + 4 inherited present | **PASS** (NAP, C23 strip, llms, BR-V sitemap, C8 headings, C19 scrub, cart layout, Google reviews, vehicle intro, ai-catalog fields) |
| Secrets in commits | **PASS** (no `.env`/credential files; no private keys in storecraft-store diff) |
| Automated tests | **PASS** — scrub boilerplate, stripEmbeddedFaqHtml, NAP address, listing page=1 redirects |
| Production build | **PASS** (local + VPS Docker build) |
| Production healthy pre-deploy | **PASS** — store/admin health ok; products **430** catalog / **399** list API |
| Rollback available | **PASS** — script tags `crazzycars-*:pre-0b99dc3-<ts>` before replace |

### Admin rebuild behaviour (inspected before proceed)

`/data/crazzycars/scripts/deploy-vps-test.sh` **always rebuilds `crazzycars-admin` then `crazzycars-store`**.  
This RC contains **zero admin source changes** vs `origin/vps-test@246b6e3`. Admin rebuild is identical code retagged to `crazzycars-admin:0b99dc3` (Docker layers **CACHED**). Unrelated apps (OPA, sialkot-*, gujranwala-*, mongo, Traefik) were **not** restarted.

---

## 2. Lint baseline comparison

| Scope | Result |
|---|---|
| Full `npm run lint` | **112 problems** (93 errors / 19 warnings) — same class as pre-existing repo lint debt; eslint exit soft |
| Newly introduced critical lint in RC-touched paths | **None requiring stop** |
| Notable pre-existing on touched files | `ProductDetailMedico` setState-in-effect; `blogs/[slug]` JSX-in-try/catch; Contact/About `/review` `<a>` pattern already on baseline |
| About Google-reviews block | Uses same `/review` link pattern already present on baseline About |

Build remains the release gate; lint debt was not silenced.

---

## 3. Deployment evidence

| Item | Value |
|---|---|
| `git push origin vps-test` | `246b6e3..0b99dc3` |
| VPS repo HEAD | `0b99dc3` |
| `last-success-sha` | `0b99dc3381a1e2011075b064cc622cf23f388a40` |
| Store container | `crazzycars-store:0b99dc3` healthy |
| Admin container | `crazzycars-admin:0b99dc3` healthy |

---

## 4. Live C1–C23 (`seo-verify-postdeploy.txt` / `.json`)

Sitemap URLs after deploy: **546** (was 547 with empty BR-V).

| Check | Result | Notes |
|---|---|---|
| C1 | **PASS** | Empty BR-V removed from sitemap |
| C2–C7 | **PASS** | |
| C8 | **FAIL 1** | `/faq` only — H1 “Frequently Asked Questions” + h3 questions; verifier counts questions only after h2/h3 FAQ heading. `/advance-payment` cleared. **Non-critical residual** |
| C9–C13 | **PASS** | |
| C14 | **PASS** | llms ↔ sitemap consistency |
| C15–C18 | **PASS** | |
| C19 | **FAIL 10/20** | Improved vs pre-T5 (11 fails / sharedBlocks 13 → **sharedBlocks 5**). Residual shared FAQ/fitment sentences + family copy. **Not claimed fixed** |
| C20 | **PASS** | No fake urgency |
| C21 | **PASS** | Redirects incl. `honda-br-v` → `/cars` |
| C22 | **PASS** | NAP Block A6 / 52203 / GBP geo / 24×7 hours / shop phone |
| C23 | **PASS** | Duplicate FAQ headings cleared sitewide |

**Summary:** **21 passed / 2 failed** (C8 residual, C19 residual). Critical release targets (NAP, double FAQ, BR-V/sitemap/llms, redirects) **PASS**.

---

## 5. Critical regression / smoke probes

| Probe | Result |
|---|---|
| Org JSON-LD street | `Block A6, Phase 1, Citi Housing` / `52203` |
| Shop telephone (Org) | `+923307767799` |
| WhatsApp contact point | `+923284010007` retained |
| `llms.txt` address | Block A6 / 52203 |
| AI catalog contact | street/postal/shop_phone populated; 399 products |
| `/cars/honda-brv-2017-present` | **404** (empty hub) **and absent from sitemap** |
| `/cars/honda-br-v-2017-present` | **308 → /cars** |
| Double FAQ sample PDP | Single FaqSection heading |
| Google reviews editorial | Present on homepage |
| `/cart`, `/search` | **308 → /shop** |
| `/checkout` robots | `noindex, nofollow` |
| Fake purchase toast | **Absent** |
| Product count | catalog **430** / list API **399** (unchanged vs pre-deploy) |
| Sample hubs Alto/Swift/Civic/Corolla (correct slugs) | Present in sitemap-cars |
| Store logs | No critical errors (mongoose duplicate-index warning only — pre-existing) |

No Google indexing improvement claimed (no GSC evidence in this run).

---

## 6. Other VPS health

| App | Status |
|---|---|
| crazzycars-store / admin | healthy (`0b99dc3`) |
| sialkot-store / admin / mongo | up / healthy |
| gujranwala-store / admin / mongo | up / healthy |
| opa-stageb-* | up / healthy |
| coolify-proxy (Traefik) | healthy |

---

## 7. Rollback status

**Not required.**  
Procedure if needed: recreate from `crazzycars-store:pre-0b99dc3-<ts>` / prior `c98e0ad` tag via deploy script rollback path; do **not** roll back Mongo.

---

## 8. Remaining owner-only blockers

Unchanged from `OWNER_APPROVAL_REQUIRED.md`: NAP Settings Mongo apply, CALL vs WhatsApp display policy, side-mirror SKU decision, T10c/T10d/T12/abs blog/Tucson, compare-at FP audit, empty-fitment assignments, GA4/Meta admin verification, C8 H1→H2 (or verifier) follow-up, C19 remaining family boilerplate.

---

## Artefacts

- `seo-verify-postdeploy.txt`
- `seo-verify-postdeploy.json`
- Deploy log on VPS: `deploy-20261111T153437Z.log`
