# Abandoned Cart Remediation — Post-Deploy Report

**Status: SUCCESS**

## Deployment identity

| Item | Value |
|---|---|
| Source candidate SHA | `d521fed2845f70631b2abfe42d3eec6f0c6e97f3` |
| Actual deployed SHA | `d521fed2845f70631b2abfe42d3eec6f0c6e97f3` (exact match; FF merge) |
| Branch merged | `fix/abandoned-cart-remediation-2026-11-12` → `vps-test` |
| Deploy log | `/data/crazzycars/deploy/deploy-20261111T233658Z.log` |
| Deploy start (UTC) | **2026-11-11T23:36:58Z** |
| Deploy result | `=== deploy ok d521fed ===` |
| `last-success-sha` | `d521fed2845f70631b2abfe42d3eec6f0c6e97f3` |
| Rollback target | previous healthy images / SHA **`f6cd49c`** |

## Application health

| App | Image | Health |
|---|---|---|
| crazzycars-store | `crazzycars-store:d521fed` | healthy |
| crazzycars-admin | `crazzycars-admin:d521fed` | healthy |
| Storefront HTTPS | `https://crazzycars.pk/` | 200 |
| Admin abandoned route (unauth) | `https://admin.crazzycars.pk/abandoned-carts` | 307 → login |

### Other VPS applications (untouched)

| App | Status after deploy |
|---|---|
| gujranwala-store | healthy (unchanged) |
| gujranwala-admin | healthy (unchanged) |
| sialkot-store | healthy (unchanged) |
| sialkot-admin | healthy (unchanged) |
| sialkot-mongo / gujranwala-mongo | up |
| coolify-proxy | up |

## Preflight gates

| Gate | Result |
|---|---|
| Exact RC SHA present | PASS |
| Diff vs `f6cd49c` scoped to abandoned-cart + reports + gitignore | PASS |
| No secrets / PII paths in commit | PASS |
| Unit tests 9/9 | PASS |
| Store + admin production builds | PASS |
| AC-14 optional drawer fields (no checkout block) | PASS |

## Live verification (synthetic only)

| Check | Result |
|---|---|
| Add-to-cart sync creates session with items | PASS |
| Optional contact capture (name/phone/email) persists | PASS (`phoneValid: true` for `03…`) |
| Address persistence (street/city/state) | PASS |
| Checkout stage updates (`checkout_details` → `checkout_payment` → `browsing`) | PASS |
| Invalid phone accepted without blocking cart; `phoneValid: false` | PASS |
| Empty-items sync does not create noise session | PASS |
| Repeated sync idempotent (same recoveryToken) | PASS |
| Items-only sync does **not** wipe prior contact/address | PASS |
| Recover API returns contact + shippingAddress | PASS |
| Guest session continuity via `sessionId` | PASS |
| Admin unauthenticated access blocked | PASS (307) |
| Bundle contains sendBeacon unload path | PASS |
| Historical abandoned carts intact | PASS (**151** with items; **8** phone; **0** street; **12** name) |

No WhatsApp/email sends. No convert-to-order. No payment/shipping rule changes. No manual Mongo mutations.

## Database compatibility

- Additive fields only (`checkoutStage`, `customerId`, `customer.phoneValid`, `customer.phoneRaw`, `shippingAddress.*`).
- Existing historical documents readable; new fields absent/default on old rows.
- No migration script applied; mongoose accepts new paths at runtime.
- Synthetic verify sessions created via public sync API only (2 new active probe docs).

## Owner decision implementation

| Issue | Decision | Live status |
|---|---|---|
| **AC-14** | Keep name/phone optional; do not block checkout | Implemented — drawer placeholders say optional; checkout CTA ungated |
| **AC-13** | Post-deploy verification + monitoring | Monitoring plan ready; **insufficient organic post-deploy traffic yet to claim lift** |
| **AC-01** | Remain PARTIAL until independent verify | **PARTIAL** — forward capture verified synthetically; 139 historical dark carts unchanged |

## Soak monitoring readiness (AC-13)

**Deploy timestamp (UTC):** `2026-11-11T23:36:58Z`

Track after real traffic (do not claim improvement until sample exists):

- New `cartsessions` with `createdAt >= deploy timestamp`
- Rates: name / phone (`phoneValid`) / email / complete address / checkoutStage distribution
- Checkout initiation (`lastPath` or stage ≥ `checkout_details`)
- Sync error rate (app logs)
- Duplicate `sessionId` count (expect 0)
- Orders created after deploy
- Compare to baseline: 151 abandoned / 8 phone / 0 complete address

At report time: organic carts created after deploy still not required for SUCCESS of release gates; synthetic proof confirms code path.

## Rollback readiness

- Previous SHA `f6cd49c` known-good and recorded.
- Procedure: reset `vps-test` to `f6cd49c`, `FORCE=1 deploy-vps-test.sh`, confirm health.
- Cron prune only removes empty `active` itemCount=0 idle >48h — does not delete abandoned inventory.
- **Rollback not invoked.**

## Final status

**SUCCESS**
