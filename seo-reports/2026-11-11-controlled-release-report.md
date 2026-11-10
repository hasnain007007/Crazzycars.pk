# CrazzyCars.pk — Controlled SEO Release Report

**Date:** 2026-11-11  
**Branch:** `vps-test`  
**Named candidate:** `654ad69`  
**Deployed RC (after holds):** `67bef500e5ffcae20fa57ae9781820c4453039fa`  
**Origin after push:** `origin/vps-test` = `67bef50`  
**Live:** https://crazzycars.pk  

## Final verdict

**DEPLOYED — VERIFIED**

Safe SEO package is live. Blocked product redirects were excluded. No Mongo mutations. No OPA staging changes. C19 improved but is **not** claimed fixed.

---

## 1. Commit map

| Ref | SHA | Notes |
| --- | --- | --- |
| Production (pre-deploy behaviour) | **pre-`a08bccc`** | Live still sent unknown `/cars/*` → `/categories/exterior`; oshan-x7 → exterior. Exact prior Coolify image digest not readable from this agent (no Docker SSH). |
| `origin/vps-test` before push | `6f2849c` | Included side-mirror retirement + vehicle map; **not** yet live. |
| Local / named candidate | `654ad69` | T5 + T13 docs; still contained blocked side-mirror 301. |
| Why 3 ahead of origin | `b917c47`, `0f9c471`, `654ad69` | STATE/T10c/d reports, T5 boilerplate collapse, T13 Lighthouse baseline — unpushed until this release. |
| Deployed RC | **`67bef50`** | `654ad69` + hold side-mirror redirect + Tucson hold comment + CategoriesIndexChrome policy-literal fix (prebuild gate). |

### SEO range commits (`fdf96aa`…`67bef50`) — classification

| Commit | Classification |
| --- | --- |
| `fdf96aa` Nov-10 verifier C1–C20 | **Safe** |
| `363a194` T0 baseline retries | **Safe** |
| `e58bd06` STATE T0 sha | **Safe** |
| `5bb61f3` T1 vehicle FAQ+intro | **Safe** |
| `346f5bb` STATE T1 | **Safe** |
| `66bf288` T2 FAQ single source | **Safe** |
| `59b4bd9` T3 returnFees + bulky flag | **Safe** |
| `6af6c51` T4 llms filter | **Safe** |
| `f6422b9` T7 remove fake viewing counter | **Safe** |
| `05bdbe7` T8 hub/shipping copy | **Safe** (CategoriesIndexChrome fee literal corrected in `67bef50`) |
| `938ca33` T11 hide zero-review stars | **Safe** |
| `17c12ec` STATE | **Safe** |
| `ada4888` verifier C1/C3 measurement | **Safe** |
| `a08bccc` T10a vehicle redirects + side-mirror retire + drop exterior catch-all | **Requires correction** → side-mirror portion **blocked**; vehicle map + 404 catch-all **safe** after hold |
| `3b08891` T9/T10b/T10e/T10g | **Safe** (410 only for confirmed empty/gone cats already reviewed) |
| `6f2849c` T6 strip embedded FAQ + T12 dry-run script | **Safe** (script only; Mongo apply **blocked**) |
| `b917c47` STATE + T10c/d reports | **Safe** |
| `0f9c471` T5 boilerplate + C4/C18 code | **Safe** |
| `654ad69` T13 Lighthouse baseline | **Safe** (baseline evidence only — no perf claim) |
| `67bef50` hold side-mirror + Tucson note + policy fix | **Safe / required gate** |

### Explicitly excluded / not deployed as behaviour

| Item | Status |
| --- | --- |
| Side-mirror LED → neon 301 | **Removed** before deploy |
| Tucson Hybrid 2025 → 2020–2024 hub | **Never added**; live **404** |
| T10c bulk publish / bulk 301 | **Blocked** — matrix only |
| T10d blanket 410 on products | **Blocked** — review only |
| T12 Mongo `--apply` | **Blocked** — needs separate scoped GO |
| Compare-at price writes | **N/A** — read-only audit blocked (no live FP URI) |
| Uncommitted `AnalyticsScripts.jsx` | **Not shipped** (would remove thank-you Pixel urgency) |
| OPA staging | **Untouched** |
| DB migrations | **None** |

---

## 2. Pre-deployment gates

| Gate | Result |
| --- | --- |
| Exact Git commit | `67bef50` |
| Production pre-behaviour | oshan/tucson → exterior; side-mirror both 200 |
| Release diff | `6f2849c..67bef50` plus prior unpushed SEO through `654ad69` already on branch history from `fdf96aa` |
| Typecheck / build | `npm run build` in `storecraft-store` **PASS** after policy-literal fix |
| Tests | alias-loader SEO unit suite **16/16 pass** (`product-slug-redirects`, `seo-fixes-2026-10-31`, `soft-404`) |
| Local redirect asserts | oshan→oshanx7; tucson→null; side-mirror→null |
| SEO metadata / canonical / structured data | Covered by verifier + live PDP schema spot checks |
| Product visibility / ATC | LED PDP live **Add to Cart** + SKU `CC-COR-MIRROR-3` |
| DB migration / writes | **None** |
| Rollback | Revert/redeploy prior Coolify revision of storefront image; git parent of RC for code is pre-`fdf96aa` Ahrefs line — prefer Coolify previous successful deployment for app-only rollback |
| Merchant / DB health | store `api/health` ok (430 products, 38 blogs); admin `api/health` ok |
| Blocked changes excluded | **Yes** (side-mirror hold committed) |

---

## 3. Redirect changes (live after deploy)

| Source | Result | Notes |
| --- | --- | --- |
| `/cars/changan-oshan-x7-2022-present` | **308 →** `/cars/changan-oshanx7-2022-present` **200** | Direct permanent; **not** exterior. Chain verified. |
| `/cars/tucson-hybrid-2025-nx4` | **404** | Hold — no redirect to 2020–2024 |
| `/cars/hyundai-tucson-2020-2024` | **200** | Preserved |
| `/toyota-corolla-2014-2026-side-mirror-led-indicators` | **200** | Hold retained |
| `/toyota-corolla-2015-2026-led-side-mirror-neon-indicator-pair` | **200** | Distinct SKU retained |
| `/cars/honda-hrv-2022-present` | **404** | Empty hub (T10a) |

---

## 4. SEO verifier before / after (live)

Artefacts:

- Before: `seo-reports/2026-11-11-predeploy-live.json`
- After: `seo-reports/2026-11-11-postdeploy-live.json`

| Check | Before | After |
| --- | --- | --- |
| C1 | PASS (545) | **PASS (547)** |
| C3 | PASS | **PASS** |
| C4 | FAIL 1 (delivery meta 190) | **PASS** (live meta len=120) |
| C18 | FAIL 1 (hero alt) | **PASS** (civic-night alt present) |
| C19 | FAIL **11/20**, sharedBlocks=**18** | FAIL **11/20**, sharedBlocks=**13** (ratios down; **not fixed**) |
| C21 | FAIL 11/13 | **PASS 13/13** |

**C19:** Do not claim fixed. Failures remain 11/20; shared-block count dropped 18→13 and per-URL boilerplate % decreased (e.g. Tucson key cover 49%→39%). Further PDP-specific content still required.

**T13:** Baseline retained under `seo-reports/lighthouse/SUMMARY.md` — no optimisation claim.

---

## 5. Tucson Hybrid 2025

**Decision implemented:** no redirect; URL returns **404** until a verified 2025 Hybrid hub exists (generation, PK market identity, FWD/AWD, accessory fitment). 2020–2024 hub remains **200**.

---

## 6. Side-mirror SKU decision

See `seo-reports/side-mirror-sku-decision-2026-11-11.md`.

| | LED parent | Neon pair |
| --- | --- | --- |
| SKU | **CC-COR-MIRROR-3** | **CC-0004** |
| Price | PKR **8500** | PKR **6500** |
| Type | Neon / Sequential / RGB variants | Neon-only |
| Live | 200 | 200 |

**Retain both.** Redirect blocked and removed from `DELETED_URL_REDIRECTS`.

---

## 7. T10c draft-product matrix

See `seo-reports/T10c-decision-matrix-2026-11-11.md`.

All listed draft/404 slugs remain **404**. Proposed actions are **HOLD** except one **301_candidate** (`…neon-style-indicator` → live neon pair) awaiting separate GO. No DB writes.

---

## 8. T10d homeware / beauty

See `seo-reports/T10d-homeware-beauty-2026-11-10.md` (unchanged policy).

- Category paths: already **410** via `goneCategoryPaths` (intentional empty non-car shelves in code).
- Sample product PDPs: **404**, not 410.
- **No blanket 410** applied this release.
- **Founder still needed:** deliberate drop vs data loss before any product-path 410 alignment. Do not label as intentional deletion without DB last-seen evidence.

---

## 9. T12 blog expansions

- Draft content lives in `storecraft-store/scripts/expand-blog-posts-t6-t12-2026-11.mjs` (dry-run default).
- **Not applied to Mongo** (publication requires DB write → **separate scoped approval** per directive §9).
- Status: **READY TO APPLY — AWAITING DB GO**.

---

## 10. Compare-at price audit

- Fingerprint `187aad8c44fe3a84` = **sha256-16 of live Mongo URI** for `crazzycars_motorsports` (`scripts/mongo/prodFingerprint.mjs`).
- Local `storecraft-store/.env.local` fingerprints to **Atlas `317ae4de8eb24f84` / `sialkot_motorsports`** — **refused**.
- **No discrepancy report against live** — cannot reach live FP from this environment without authorised URI.
- **Remaining approval:** provide live FP session (or VPS `docker exec`) for read-only compare-at audit.

---

## 11. Production health (post-deploy)

| Check | Result |
| --- | --- |
| Store health | `ok`, db `ok`, 430 products, 38 blogs |
| Admin health | `ok`, db `ok` |
| Checkout | `/checkout` **200** |
| Cart route | `/cart` → 308 `/shop` (existing behaviour) |
| Robots | 200, Allow + sitemaps |
| Sitemap index | 200 |
| Image digest | **Unavailable** (no Coolify/Docker SSH from agent) |

---

## 12. Rollback evidence

- App-only rollback: redeploy previous Coolify storefront revision for `crazzycars-store` (do not restart unrelated apps / OPA).
- Git: `67bef50` is tip of `vps-test`; revert commit or redeploy prior SHA if Coolify tracks git.
- DB untouched → no data rollback required for this release.

---

## 13. Remaining founder approvals

1. **T12** Mongo `--apply` for two blog expansions (scoped).
2. **T10c** per-SKU PUBLISH / 301 / 410 decisions (matrix ready).
3. **T10d** deliberate drop vs data loss; then consistent product 410 if dropped.
4. **Compare-at** read-only on live FP `187aad8c44fe3a84`.
5. **Tucson 2025 Hybrid hub** build (optional) — only with verified fitment.
6. **C19 residual** — further product-specific copy if green C19 is required.
7. Optional: ship or discard uncommitted `AnalyticsScripts.jsx` thank-you Pixel change (not in this RC).

---

## Image digest

**Not captured** — agent lacks Docker/Coolify SSH. Deployed git SHA on `origin/vps-test`: **`67bef50`**. Live behavioural markers match that commit (oshan map, tucson 404, side-mirror 200, C4/C18 pass).
