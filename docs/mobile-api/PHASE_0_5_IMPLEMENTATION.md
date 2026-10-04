# Phase 0.5 — Implementation report

**Branch:** `mobile-api` (not merged to main)  
**Date:** 2026-10-04  
**Production env vars:** not changed

---

## Decisions applied

| Topic | Implementation |
|-------|----------------|
| DELETE /me | Anonymize PII, clear wishlist, `isActive:false`, revoke refresh tokens, delete devices; **orders kept** |
| Devices | Guest register OK; link via `deviceToken` on login; Mongo rate limit |
| JWT | **`MOBILE_JWT_SECRET` only**; `aud:crazzycars-mobile`, `typ:mobile_access`; cookie JWT not accepted as Bearer |
| Min-order | Enforced on **mobile** `/orders` (+ soft fields on `/cart/quote`). **Web checkout still client-only** (not changed) |
| Payments | `/config` exposes all enabled methods; app v1 should show COD-only |
| Wishlist | No API |
| Rate limit | **Mongo `LoginAttempt` TTL counters** (existing `lib/actionRateLimit.js`) — not Upstash, not in-memory |

---

## Database / preview safety

| Environment | DB |
|-------------|-----|
| Unit tests (`checkout-characterization`, `mobile-auth-claims`, `cod-eligibility`) | **No Mongo** |
| Local storefront | Whatever is in `storecraft-store/.env.local` → `MONGODB_URI` (must not be production) |
| Coolify preview of `mobile-api` | Whatever `MONGODB_URI` that Coolify app is configured with — **do not point a preview at production `sialkot-mongo`**. Use a separate DB name (e.g. `crazzycars_mobile_preview`) |
| Mobile orders | Flagged `orderSource: "mobile"` for filtering/cleanup |

**Never run tests or previews against production Mongo.**

---

## New env vars (add when deploying this branch)

| Variable | Required | Notes |
|----------|----------|-------|
| `MOBILE_JWT_SECRET` | Yes for mobile auth | Separate from `JWT_SECRET`. Generate: `openssl rand -hex 64`. Missing → mobile auth returns 500. **Not added to production by this work.** |

No `MOBILE_REFRESH_SECRET` (refresh tokens are opaque; only sha256 hashes stored).

---

## New Mongo collections / indexes

### `customerrefreshtokens`
- Fields: `customerId`, `tokenHash` (unique), `expiresAt`, `isRevoked`, `revokedAt`, `createdAt`
- Indexes: unique `tokenHash`; `{ expiresAt: 1 }` TTL `expireAfterSeconds: 0`; `{ customerId: 1, isRevoked: 1 }`

### `mobiledevices`
- Fields: `token` (unique), `platform`, `appVersion`, `customerId?`, timestamps
- Indexes: unique `token`; `{ customerId: 1 }`

### `idempotencykeys`
- Fields: `key`, `scope`, `status`, `requestHash`, `responseBody`, `createdAt`
- Indexes: unique `{ key: 1, scope: 1 }`; `{ createdAt: 1 }` TTL 24h

### Reused: `loginattempts`
- Scopes: `mobile-login`, `mobile-register`, `mobile-contact`, `mobile-track`, `mobile-devices` (+ existing checkout scope for order create path)
- TTL: `lastAttemptAt` expireAfterSeconds 3600

### Settings
- New optional `mobileApp` subdoc: min versions, maintenance, store URLs

---

## Files changed (storefront focus)

### Checkout refactor (behavior-preserving for web)
- `lib/checkout/createStoreOrder.js` — extracted shared create; opts: `orderSource`, `enforceMinOrder`, `linkedCustomerId`
- `app/api/checkout/route.js` — thin adapter (`site`, no min-order)
- `lib/codEligibility.js` — `buildCodUnavailableMessage` (locked by tests)

### Mobile API
- `lib/mobile/auth.js`, `response.js`, `refreshToken.js`
- Models: `CustomerRefreshToken`, `MobileDevice`, `IdempotencyKey`
- Routes under `app/api/mobile/v1/*` (config, home, categories, products, vehicles, cart/quote, orders, track, auth, me, devices, blogs, pages, contact)
- `registerModels.js`, `models/index.js`, `Settings.model.js`
- `.env.local.example`, `README.md`

### Tests (no Mongo)
- `tests/checkout-characterization.test.js`
- `tests/mobile-auth-claims.test.js`

### Docs (mobile project)
- `crazzycars-mobile/docs/WEB_CHANGES_PLAN.md`
- `crazzycars-mobile/docs/PHASE_0_5_IMPLEMENTATION.md`
- Updated `API_CONTRACT.md` / `OPEN_QUESTIONS.md` earlier

Unrelated dirty files on the branch from prior work (admin profit, etc.) may still be present in the working tree — **only merge/commit mobile + checkout extraction when you choose.**

---

## Web min-order note (report)

Web checkout still enforces `storePayment.minimumOrderAmount` **only in the client UI**.  
`POST /api/checkout` does **not** enforce it. Per your instruction, that was **not** changed. Mobile `/api/mobile/v1/orders` does enforce it server-side.

---

## Manual test checklist

### A. Web checkout (must stay identical)

1. Guest COD order for a normal (non–body-kit) product → success; order `orderSource` is `site` (or legacy empty).
2. Body-kit product + COD → error exactly:  
   `Cash on Delivery is not available for: {name}. Choose advance payment instead.`
3. Bulky item → shipping ≥ Rs.500; regular cart floor Rs.250.
4. Cookie login `/api/customer/login` still sets `customer_token`; `/api/customer/me` works.
5. Coupon + stock failure messages unchanged.
6. Double-submit without idempotency still behaves as before (web has no Idempotency-Key).

### B. Mobile auth

1. `POST /api/mobile/v1/auth/register` with firstName, lastName, email, phone, password → accessToken + refreshToken.
2. `POST /api/mobile/v1/auth/login` with email + password → tokens.
3. `GET /api/mobile/v1/me` with `Authorization: Bearer <access>` → profile.
4. Cookie `customer_token` as Bearer → **401**.
5. Mobile access token is not usable as web cookie session.
6. `POST /auth/refresh` rotates; reuse old refresh → all sessions revoked.
7. `DELETE /me` → anonymized; refresh fails; orders still in DB.

### C. Cart / orders / tracking

1. `POST /cart/quote` with body kit + COD → **400** `COD_NOT_AVAILABLE` with exact message.
2. Quote bulky → shippingCost ≥ 500.
3. Quote returns `minOrderAmount` / `meetsMinOrder` (soft).
4. `POST /orders` without Idempotency-Key → 400.
5. Same key + same body twice → one order, same response.
6. Same key + different body → 409.
7. Order has `orderSource: "mobile"`; response includes `orderId`, `accessToken`, `orderNumber`.
8. `GET /orders/track?orderNumber=&phone=` correct → minimal status; wrong phone → generic not found.
9. Existing `GET /api/tracking?trackingNumber=` still works.
10. `GET /api/orders/:id/public?t=` with saved accessToken works.

### D. Devices / config / catalog

1. `POST /devices` as guest → 201; login with `deviceToken` links customerId.
2. `GET /config` → floors 250/500, `enabledPaymentMethods`, contact/WhatsApp.
3. Smoke: `/home`, `/categories`, `/products`, `/products/:slug`, `/vehicles`, `/blogs`, `/pages/:slug`.

---

## Suggested local verify commands

```bash
# Unit tests (no Mongo)
cd /Users/mac/Desktop/CCSMS
node --experimental-strip-types --test \
  tests/checkout-characterization.test.js \
  tests/cod-eligibility.test.ts \
  tests/shipping-advance.test.js \
  tests/mobile-auth-claims.test.js

# From storecraft-store (for jsonwebtoken resolution if needed)
cd storecraft-store && NODE_PATH=./node_modules node --test ../tests/mobile-auth-claims.test.js

# Build (uses local env; do not point at prod Mongo for runtime smoke)
cd storecraft-store && npm run build
```
