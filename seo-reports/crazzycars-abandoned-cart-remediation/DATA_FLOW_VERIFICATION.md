# Data Flow Verification

## Capture path (post-remediation)

1. **Cart drawer (optional):** name/phone → `cc_checkout_draft_v1` → debounced `POST /api/cart/sync` (`checkoutStage=cart`) + pagehide `sendBeacon`.
2. **CartContext:** item changes → sync with draft merge + unload flush.
3. **Checkout:** name/email/phone/address → draft (non-destructive merge) → sync with `checkoutStage` from step + `customerId` when logged in + unload beacon.
4. **Server:** upsert by `sessionId`; PK phone normalize; never blank existing contact; persist `shippingAddress`.
5. **Admin:** serialize includes stage/address/phoneValid; search shipping fields; modal for missing contact.

## Anti-loss checks

| Scenario | Behavior |
|---|---|
| Refresh checkout | Draft restores fields |
| Tab close | Beacon/keepalive flush |
| Empty explicit over draft | Non-empty preserved |
| Stale empty draft | Cannot wipe explicit phone |
| Checkout without drawer fields | Allowed (optional) |
| Duplicate sessionId | Unique index unchanged |

## Public API exposure

`/api/cart/sync` and `/api/cart/recover` remain session/token scoped. Admin abandoned APIs require login + `canManageOrders`.
