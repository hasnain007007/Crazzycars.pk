# Test Results

## Unit

Command: `node --test storecraft-store/scripts/test-cart-sync-normalize.mjs`

| Suite | Result |
|---|---|
| normalizePkMobile (3) | PASS |
| phoneForStorage (2) | PASS |
| mergeContactPayload (2) | PASS |
| address + stage (2) | PASS |
| **Total** | **9 passed / 0 failed** |

## Builds

| App | Command | Result |
|---|---|---|
| storecraft-store | `npm run build` | PASS |
| storecraft-admin | `npm run build` | PASS |

## Not executed (restricted)

- Live WhatsApp / email send
- Live convert-to-order
- Production Mongo mutations
- Browser device matrix unload (code-path covered; manual recommended post-deploy)
