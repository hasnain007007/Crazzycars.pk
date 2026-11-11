# Abandoned Cart Remediation — Final Report

**RC branch:** `fix/abandoned-cart-remediation-2026-11-12`  
**RC SHA:** `d521fed2845f70631b2abfe42d3eec6f0c6e97f3` (full code remediation; branch tip includes docs pins)
**Baseline production:** `f6cd49c`  
**Mission constraints honored:** no production Mongo writes, no deploy, no customer contact, no live orders.

## Outcome

Safely actionable audit issues were fixed in storefront + admin code with unit tests and green production builds.

| Status | Count | Issues |
|---|---:|---|
| Resolved (code) | 10 | AC-02…AC-10, AC-12 |
| Partial | 1 | AC-01 (forward path only) |
| Accepted / by design | 2 | AC-11, AC-15 |
| Blocked | 2 | AC-13 (soak), AC-14 (owner soft-require) |

## Key technical changes

1. **Reliable sync:** `sendBeacon` unload flush from CartContext, CartDrawer, CheckoutView; fetch for interactive sync.
2. **Draft safety:** non-empty merge; empty incoming never wipes server/local contact; draft `updatedAt`.
3. **PK phones:** normalize to `03XXXXXXXXX`; `phoneValid` / `phoneRaw` on CartSession; admin badge.
4. **Funnel:** `checkoutStage` + optional `customerId`.
5. **Admin:** shippingAddress search; contact modal; stage/phone validity display.
6. **Hygiene:** cron prune empty actives; gitignore PII exports.
7. **Checkout conversion protected:** drawer name/phone remain **optional**; required address stays on checkout.

## Builds / tests

- `node --test storecraft-store/scripts/test-cart-sync-normalize.mjs` → **9/9 pass**
- `storecraft-store` `npm run build` → **pass**
- `storecraft-admin` `npm run build` → **pass**

## Database

Additive schema fields only (`checkoutStage`, `customerId`, `customer.phoneValid`, `customer.phoneRaw`). No migration script required for Mongo — mongoose accepts new paths. No production apply performed.

## Deployment readiness

**CONDITIONAL GO** — merge RC to `vps-test` and deploy when owner approves; then soak 48h and re-run coverage audit. Soft-require phone (AC-14) still needs separate owner GO.
