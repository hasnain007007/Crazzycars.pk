# POST_DEPLOY_REPORT — CrazzyCars storefront

**Deploy authorised:** `GO deploy c98e0add02dc29e271d9ecc66c23b03617a05a8e`  
**Deployed SHA:** `c98e0add02dc29e271d9ecc66c23b03617a05a8e`  
**UTC:** 2026-11-11 ~00:24–00:28  
**Method:** VPS autodeploy (`watch-vps-test` → `deploy-vps-test.sh`) after `origin/vps-test` reached the approved SHA.  
**Mongo M1–M4:** **not applied**  
**Rollback:** **not required** (ready via `0df2d2f` / `crazzycars-store:pre-c98e0ad-*` tags)

## Pre-deploy checks

| Check | Result |
| --- | --- |
| Exact SHA exists on GitHub / local | **PASS** — `c98e0ad` |
| `0df2d2f` available for rollback | **PASS** — ancestor of tip; still on remote history |
| Production identity | **PASS** — `crazzycars.pk` → `storecraft-store`, admin → `storecraft-admin`, db ok, 430 products |
| Target ambiguity | **None** — store image tagged `crazzycars-store:c98e0ad`; last-success SHA file matches |

Baseline (pre-cutover live HTML): Alto still on Swift, Splitters misfits present, HUD category 404.

## Deploy outcome

| Item | Value |
| --- | --- |
| Store image | `crazzycars-store:c98e0ad` |
| Store health | **healthy** |
| Deploy log | `/data/crazzycars/deploy/deploy-20261111T002402Z.log` → `=== deploy ok c98e0ad ===` |
| `last-success-sha` | `c98e0add02dc29e271d9ecc66c23b03617a05a8e` |
| Repo on VPS | `HEAD = c98e0ad` |

**Note:** The existing VPS deploy script rebuilds **admin then store**. Admin also landed on `crazzycars-admin:c98e0ad` (healthy). Unrelated apps (OPA, sialkot-*, gujranwala-*, mongo, Traefik) were **not** restarted by this agent; they remained up.

## Live URL evidence

| URL | Result |
| --- | --- |
| https://crazzycars.pk/api/health | **PASS** 200 `storecraft-store` db ok |
| https://admin.crazzycars.pk/api/health | **PASS** 200 |
| https://crazzycars.pk/ | **PASS** 200 |
| https://crazzycars.pk/shop | **PASS** 200 |
| https://crazzycars.pk/categories/splitters-side-skirts | **PASS** 200 |
| https://crazzycars.pk/cars/suzuki-swift-2025-present | **PASS** 200 |
| Product PDPs (monogram, Alto) | **PASS** 200 |
| https://crazzycars.pk/checkout | **PASS** 200 |
| https://crazzycars.pk/cart | **PASS** 308 → `/shop` (existing) |
| https://crazzycars.pk/sitemap.xml | **PASS** 200 |
| https://crazzycars.pk/categories/car-hud | **PASS** 308 → `/car-heads-up-display-hud` → **200** |

## P0 verification

| Check | Result | Evidence |
| --- | --- | --- |
| Alto excluded from Swift hub | **PASS** | `alto-660cc` / `Alto 660cc` hits = 0; Swift content still present |
| Steering trim / ducktail off Splitters | **PASS** | `steering-trim`=0, `ducktail`=0; splitter tokens remain |
| Corolla monogram off Aqua/Yaris hubs | **PASS** | monogram hits Aqua=0, Yaris=0; Corolla hub still shows monogram |
| Fake purchase toast absent | **PASS** | no FakePurchaseToast / “purchased this item” on PDP HTML |
| HUD category redirect | **PASS** | 308 → live HUD PDP |

API still returns Alto↔Swift VC rows — expected until M1–M4; hub exclusion is the code defensive layer.

## Cart / checkout (no real orders)

| Check | Result |
| --- | --- |
| Checkout page loads | **PASS** |
| Shipping / COD markers present | **PASS** (flat delivery Rs 250, COD enabled in settings) |
| Live payment / order create | **NOT_TESTED** (forbidden) |

## Logs / collateral

| Check | Result |
| --- | --- |
| Store logs (10m) critical errors | **PASS** — no new fatal/ECONNREFUSED spike in filtered sample |
| OPA / sialkot / gujranwala / mongo | **PASS** — remain healthy/up |

## Rollback status

**Not executed.** Procedure remains: redeploy image/commit `0df2d2f` via documented rollback / previous `pre-c98e0ad` tags if needed.

## Remaining (separate authorisation)

- Mongo migrations **M1–M4** still deferred.
- GA4 ecommerce E2E still unverified (unchanged; no new tags).
