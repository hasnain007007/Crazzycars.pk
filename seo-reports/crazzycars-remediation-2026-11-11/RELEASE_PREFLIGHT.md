# RELEASE_PREFLIGHT — 11 November 2026

## 1. Repository state

| Item | Value |
| --- | --- |
| Branch | `fix/crazzycars-seo-aeo-geo-2026-11-11` |
| **Candidate release SHA** | **`f3e050c2ce4cd1d55ae494e4d9e313d57c888672`** |
| Reported `d853595` | Exists — ancestor of HEAD |
| Reported `f3e050c` | Exists — **is descendant of `d853595`** |
| Tracks | `origin/fix/crazzycars-seo-aeo-geo-2026-11-11` |
| Diff base (current prod deploy tip) | `origin/vps-test` = `0df2d2f` |
| Commits in RC vs `vps-test` | 4: `77b2d96`, `27898ca`, `d853595`, `f3e050c` |

### Uncommitted (excluded from release)

| Path | Action |
| --- | --- |
| `storecraft-store/components/store/AnalyticsScripts.jsx` | **Exclude** |
| `.gitignore` | **Exclude** |
| Untracked backups / OPA / mobile copies | **Exclude** |
| Preflight docs updates (this package) | May land as follow-up docs commit on fix branch only — **must not** merge to `vps-test` without owner GO |

### Secrets scan

- No `.env`, credentials, or key files in `origin/vps-test...HEAD`.
- Reports mention fingerprint IDs only (not connection strings).

### Unrelated modifications

RC only touches fitment filters, deleted redirects (HUD), PDP toast removal, tests, audit scripts, and `seo-reports/crazzycars-remediation-2026-11-11/`.

---

## 2. Confirmed P0 fixes (code)

| P0 | Code status | Live today (pre-deploy) | After deploy (expected) |
| --- | --- | --- | --- |
| Alto on Swift | `rejectTitleModelConflicts` in `loadProductsForVehicle` | Alto **still** in Swift HTML (bad VC) | Alto hidden; Swift SKUs kept; universals kept |
| Splitters misfits | `categoryMembershipMongoGuard` in `loadStoreCategoryDetail` | Steering trim + ducktail **still** listed | Excluded; genuine splitters kept |
| Fake purchase toast | Unmounted from `ProductDetailMedico.jsx` | Client toast still in old bundle until deploy | Gone |
| Corolla monogram | Same title filter hides on Aqua/Vitz/Yaris hubs | Bad VC still in API | Hidden on wrong hubs; Corolla kept |

**Defensive layer:** keep code filters even after DB migrations M1–M4.

**Dead code retained (not mounted):** `FakePurchaseToast.jsx`, `ProductLiveView.jsx`, `lib/fakeSocialProof.js` — no live imports.

---

## 3. Tests

See `REGRESSION_RESULTS.md` (re-run 2026-11-11).

- Fitment suite: **10/10 PASS**
- Broader unit: **69/72 PASS**, **3 FAIL** (pre-existing — not introduced by RC)
- Live smoke: homepage/shop/splitters/swift/checkout/sitemap/health **200**; cart→shop 308; HUD category **404** until RC deploy; HUD product **200**
- Storefront build: **PASS** (prior session on RC)

---

## 4. Database

| Check | Result |
| --- | --- |
| Live app | `crazzycars.pk` / `storecraft-store` health `db:ok`, 430 products |
| Historical live FP gate | `187aad8c44fe3a84` / `crazzycars_motorsports` |
| Local agent URI | Atlas `317ae4de8eb24f84` — **refused for writes** |
| P0 document IDs | Reconfirmed via public product API (see `MIGRATION_REVIEW.md`) |

Migrations: **dry-run documentation only** — not applied.

---

## 5. GA4

**Present but unverified** end-to-end.  
Settings expose `seo.googleAnalyticsId` (`G-…`); **no GTM**. Ecommerce helpers exist in code. No new tags installed.

---

## 6. Deployment risk

| Factor | Level |
| --- | --- |
| Code-only storefront redeploy | **Low–medium** (filter logic; ISR refresh) |
| Combined with Mongo M1–M4 same window | **Medium** (prefer sequential) |
| Shared VPS collateral | **Low** if only `crazzycars-store` rebuilt |
| Rollback | **Ready** → redeploy `0df2d2f` |

---

## 7. Recommendation

# **CONDITIONAL GO**

**GO for code deploy** of `f3e050c` after owner names this SHA.  
**Separate GO required** for Mongo migrations in `MIGRATION_REVIEW.md`.  
Do not deploy or write production Mongo until explicit owner approval.
