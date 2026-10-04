# A/B checkout: HEAD route vs `createStoreOrder` adapter

Harness: `scripts/ab-checkout/run-ab.mjs` (mongodb-memory-server throwaway DBs by default; never production).

## Carts

| Case | Expect |
|------|--------|
| `simple_cod` | 200, identical order doc |
| `with_coupon` | 200, identical order doc |
| `bulky_item` | 200, identical order doc (bulky shipping floor) |
| `body_kit_cod_block` | 400, identical error message |
| `body_kit_bank_transfer` | 200, body-kit + enabled bankTransfer succeeds |
| `cod_with_advance_charge` | 200, `payment.advanceRequired` ≥ shipping when COD + advance enabled |
| `variant_low_stock` | 400, identical error message |
| `guest_checkout` | 200, identical order doc |
| `existing_customer` | 200, identical order doc |

Ignored when diffing: `_id`, timestamps, `orderNumber`, `publicAccessToken`, `metaPurchaseEventId`, item/status/timeline sub-ids, `customer.customerId`, and order-number substrings inside timeline/status strings.

## Result (2026-10-04)

All **9 PASS** (includes `body_kit_bank_transfer` + `cod_with_advance_charge`). Resend + Meta CAPI env vars cleared; Settings SEO tokens empty — orders still created (emails skipped with `RESEND_API_KEY not set — emails disabled`).

Raw-only difference before order-number scrub: `timeline[].description` embedded different `Order #ORD-…` values when sequence advanced across sequential runs — not a behavioral divergence.

```bash
cd scripts/ab-checkout && npm install && node run-ab.mjs
```
