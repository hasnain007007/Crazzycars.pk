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
- Fields: `customerId`, `tokenHash` (unique), `expiresAt`, `isRevoked`, `revokedAt`, `replacedByTokenHash`, `graceExpiresAt`, `graceRetryCount`, `createdAt`
- Indexes: unique `tokenHash`; `{ expiresAt: 1 }` TTL `expireAfterSeconds: 0`; `{ customerId: 1, isRevoked: 1 }`; index on `replacedByTokenHash`

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
6. `POST /auth/refresh` rotates with **30s grace** (unused child → issue NEW child, cap 3); after window / used child / cap → `TOKEN_REUSED` + revoke all.
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
9. `GET /tracking?trackingNumber=` (mobile) → unified envelope; missing courier keys → `TRACKING_UNAVAILABLE` (not 500). Web `/api/tracking` unchanged.
10. `GET /orders/:id` with Bearer (owner) **or** header `X-Order-Access-Token` (guest). Wrong token / missing id → same generic 404. Do **not** put token in query string.
11. `GET /orders` Bearer → paginated own orders (max 50).
12. Quote/order with disabled payment method → `PAYMENT_METHOD_UNAVAILABLE`. Body-kit + enabled non-COD → success.
13. `POST /orders` + `GET /orders/:id` include `paymentInstructions` (amountDue, accountLines, WhatsApp wa.me URL).

### D. Devices / config / catalog

1. `POST /devices` as guest → 201; login with `deviceToken` links customerId.
2. `GET /config` → floors 250/500, `enabledPaymentMethods`, contact/WhatsApp.
3. Smoke: `/home`, `/categories`, `/products`, `/products/:slug`, `/vehicles`, `/blogs`, `/pages/:slug`.

---

## Suggested local verify commands

```bash
# Unit tests (no Mongo) + refresh grace (memory Mongo)
cd /Users/mac/Desktop/CCSMS-mobile-api
node --test tests/checkout-characterization.test.js
node --import ./scripts/ab-checkout/alias-loader-register.mjs --test \
  storecraft-store/tests/mobile-auth-claims.test.mjs \
  tests/mobile-refresh-grace.test.mjs

# Build (uses local env; do not point at prod Mongo for runtime smoke)
cd storecraft-store && npm run build
```

---

## Preview curl checklist (expanded)

Prerequisites: preview HTTPS URL, catalog restored + secrets scrubbed, `NEXT_PUBLIC_INDEXABLE=false`.

```bash
export PREVIEW=https://mobile-preview.crazzycars.pk
export BASE=$PREVIEW/api/mobile/v1
export EMAIL="preview.tester+$(date +%s)@example.com"
export PHONE="03001234567"
export PASS='TestPass123!'
# Fill from catalog:
export PRODUCT_ID='<active-simple-productId>'
export LOW_STOCK_ID='<product with trackInventory + low inventory.quantity>'
export BODY_KIT_ID='<body-kit productId>'
```

### Setup: register / login

```bash
curl -sS -X POST "$BASE/auth/register" -H 'Content-Type: application/json' -d "{
  \"firstName\":\"Preview\",\"lastName\":\"Tester\",
  \"email\":\"$EMAIL\",\"phone\":\"$PHONE\",\"password\":\"$PASS\"
}" | tee /tmp/reg.json

curl -sS -X POST "$BASE/auth/login" -H 'Content-Type: application/json' -d "{
  \"email\":\"$EMAIL\",\"password\":\"$PASS\"
}" | tee /tmp/login.json

export ACCESS=$(python3 -c "import json;print(json.load(open('/tmp/login.json'))['accessToken'])")
export REFRESH=$(python3 -c "import json;print(json.load(open('/tmp/login.json'))['refreshToken'])")
export CUSTOMER_ID=$(python3 -c "import json;print(json.load(open('/tmp/login.json'))['customer']['id'])")
```

### (1) Idempotency: different body + concurrent same key

**Same key, different body → 409 `IDEMPOTENCY_KEY_REUSED`**

```bash
export IDEM_DIFF="idem-diff-$(date +%s)"
BODY_A=$(cat <<EOF
{"items":[{"productId":"$PRODUCT_ID","quantity":1}],
 "customer":{"name":"A","phone":"$PHONE","email":"$EMAIL"},
 "shippingAddress":{"street":"1 Test St","city":"Lahore","state":"Punjab","province":"Punjab","country":"Pakistan"},
 "paymentMethod":"cod"}
EOF
)
BODY_B=$(cat <<EOF
{"items":[{"productId":"$PRODUCT_ID","quantity":2}],
 "customer":{"name":"B","phone":"$PHONE","email":"$EMAIL"},
 "shippingAddress":{"street":"1 Test St","city":"Lahore","state":"Punjab","province":"Punjab","country":"Pakistan"},
 "paymentMethod":"cod"}
EOF
)

curl -sS -i -X POST "$BASE/orders" \
  -H "Authorization: Bearer $ACCESS" -H 'Content-Type: application/json' \
  -H "Idempotency-Key: $IDEM_DIFF" -d "$BODY_A" | tee /tmp/idem-a.txt

curl -sS -i -X POST "$BASE/orders" \
  -H "Authorization: Bearer $ACCESS" -H 'Content-Type: application/json' \
  -H "Idempotency-Key: $IDEM_DIFF" -d "$BODY_B"
# expect HTTP 409, error.code = IDEMPOTENCY_KEY_REUSED
```

**Two concurrent requests, one key → one order**

```bash
export IDEM_RACE="idem-race-$(date +%s)"
BODY_RACE="$BODY_A"

curl -sS -o /tmp/race1.json -w '%{http_code}' -X POST "$BASE/orders" \
  -H "Authorization: Bearer $ACCESS" -H 'Content-Type: application/json' \
  -H "Idempotency-Key: $IDEM_RACE" -d "$BODY_RACE" &
PID1=$!
curl -sS -o /tmp/race2.json -w '%{http_code}' -X POST "$BASE/orders" \
  -H "Authorization: Bearer $ACCESS" -H 'Content-Type: application/json' \
  -H "Idempotency-Key: $IDEM_RACE" -d "$BODY_RACE" &
PID2=$!
wait $PID1; echo " r1"
wait $PID2; echo " r2"
echo '--- bodies ---'; cat /tmp/race1.json; echo; cat /tmp/race2.json; echo
# One response should be 201 (or completed replay); the other 201 identical replay
# or 409 DUPLICATE_REQUEST while pending — never two different orderIds.
```

**mongosh (preview DB only) — one order for that idempotency key’s orderNumber**

```bash
# On VPS — crazzycars_mobile_preview ONLY
docker exec sialkot-mongo mongosh crazzycars_mobile_preview --quiet --eval '
const key = "'"$(python3 -c "import json; d=json.load(open(\"/tmp/race1.json\")); print(d.get(\"orderNumber\") or json.load(open(\"/tmp/race2.json\")).get(\"orderNumber\",\"\"))" 2>/dev/null || true)"'";
// Prefer: count by phone + recent window, or by orderIds from both JSON files:
'
# Simpler: extract orderIds from both responses and count distinct
python3 - <<'PY'
import json
ids=set()
for p in ("/tmp/race1.json","/tmp/race2.json"):
  try:
    d=json.load(open(p))
    if d.get("orderId"): ids.add(d["orderId"])
  except Exception: pass
print("distinct orderIds from race responses:", ids, "count=", len(ids))
# expect count == 1 (or 0 if both 409 — retry once serially)
PY

docker exec sialkot-mongo mongosh crazzycars_mobile_preview --quiet --eval '
const phone = "03001234567";
const n = db.orders.countDocuments({
  "customer.phone": phone,
  orderSource: "mobile",
  createdAt: { $gte: new Date(Date.now() - 10*60*1000) }
});
print("mobile orders last 10m for phone:", n);
'
```

### (2) Refresh grace + cross-token rejection

Immediate replay of the parent refresh now hits the **grace path** (not family revoke). Use these cases:

**(a) Grace retry → 200 with a different valid refresh; lost child no longer works**

```bash
# Fresh login so REFRESH is unused
curl -sS -X POST "$BASE/auth/login" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}" | tee /tmp/login-g.json
export PARENT=$(python3 -c "import json;print(json.load(open('/tmp/login-g.json'))['refreshToken'])")

curl -sS -X POST "$BASE/auth/refresh" -H 'Content-Type: application/json' \
  -d "{\"refreshToken\":\"$PARENT\"}" | tee /tmp/ref-lost.json
export LOST_CHILD=$(python3 -c "import json;print(json.load(open('/tmp/ref-lost.json'))['refreshToken'])")

# Simulate lost response: retry PARENT within 30s
curl -sS -i -X POST "$BASE/auth/refresh" -H 'Content-Type: application/json' \
  -d "{\"refreshToken\":\"$PARENT\"}" | tee /tmp/ref-grace.json
# expect HTTP 200; refreshToken DIFFERENT from LOST_CHILD
export GRACE_CHILD=$(python3 -c "import json;print(json.load(open('/tmp/ref-grace.json'))['refreshToken'])")
python3 - <<'PY'
import json
lost=json.load(open("/tmp/ref-lost.json"))["refreshToken"]
grace=json.load(open("/tmp/ref-grace.json"))["refreshToken"]
assert lost != grace, "grace must issue a NEW opaque refresh (hashes only in DB)"
print("ok: grace child differs from lost child")
PY

# Lost child must fail; grace child must still work
curl -sS -i -X POST "$BASE/auth/refresh" -H 'Content-Type: application/json' \
  -d "{\"refreshToken\":\"$LOST_CHILD\"}"
# expect 401 TOKEN_INVALID (superseded unused child — no family revoke)

curl -sS -i -X POST "$BASE/auth/refresh" -H 'Content-Type: application/json' \
  -d "{\"refreshToken\":\"$GRACE_CHILD\"}" | tee /tmp/ref-grace2.json
# expect 200
```

**(b) Rotate the child first, then replay the original → 401 TOKEN_REUSED + all sessions revoked**

```bash
curl -sS -X POST "$BASE/auth/login" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}" | tee /tmp/login-b.json
export PARENT=$(python3 -c "import json;print(json.load(open('/tmp/login-b.json'))['refreshToken'])")

curl -sS -X POST "$BASE/auth/refresh" -H 'Content-Type: application/json' \
  -d "{\"refreshToken\":\"$PARENT\"}" | tee /tmp/ref-b1.json
export CHILD=$(python3 -c "import json;print(json.load(open('/tmp/ref-b1.json'))['refreshToken'])")

# Client received child and rotated again
curl -sS -X POST "$BASE/auth/refresh" -H 'Content-Type: application/json' \
  -d "{\"refreshToken\":\"$CHILD\"}" | tee /tmp/ref-b2.json

# Replay original parent → family revoke
curl -sS -i -X POST "$BASE/auth/refresh" -H 'Content-Type: application/json' \
  -d "{\"refreshToken\":\"$PARENT\"}"
# expect 401 TOKEN_REUSED

export GRAND=$(python3 -c "import json;print(json.load(open('/tmp/ref-b2.json'))['refreshToken'])")
curl -sS -i -X POST "$BASE/auth/refresh" -H 'Content-Type: application/json' \
  -d "{\"refreshToken\":\"$GRAND\"}"
# expect 401 (session dead)
```

**(c) Replay after `sleep 31` → 401 TOKEN_REUSED**

```bash
curl -sS -X POST "$BASE/auth/login" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}" | tee /tmp/login-c.json
export PARENT=$(python3 -c "import json;print(json.load(open('/tmp/login-c.json'))['refreshToken'])")

curl -sS -X POST "$BASE/auth/refresh" -H 'Content-Type: application/json' \
  -d "{\"refreshToken\":\"$PARENT\"}" >/tmp/ref-c1.json

sleep 31
curl -sS -i -X POST "$BASE/auth/refresh" -H 'Content-Type: application/json' \
  -d "{\"refreshToken\":\"$PARENT\"}"
# expect 401 TOKEN_REUSED
```

**Refresh token as Bearer → 401**

```bash
curl -sS -i "$BASE/me" -H "Authorization: Bearer $REFRESH"
# expect 401 TOKEN_INVALID (opaque refresh is not a JWT / wrong typ)
```

**Mobile access token as web `customer_token` cookie → rejected**

```bash
curl -sS -i "$PREVIEW/api/customer/me" \
  -H "Cookie: customer_token=$ACCESS"
# expect 401 / unauthenticated — cookie verified with JWT_SECRET + store claims, not MOBILE_JWT_SECRET
```

(Also keep the reverse: cookie JWT as mobile Bearer → 401, from the earlier checklist.)

### (3) Rate limit + track privacy

**Repeated bad logins until 429** (5 / 10 min per email+IP)

```bash
for i in 1 2 3 4 5 6; do
  echo "attempt $i"
  curl -sS -o /tmp/bad$i.json -w ' HTTP %{http_code}\n' -X POST "$BASE/auth/login" \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"$EMAIL\",\"password\":\"WrongPassword!!!\"}"
done
# 6th (or first after limit) → 429, error.code RATE_LIMITED, Retry-After header
```

**Track: wrong phone vs nonexistent orderNumber — identical body**

```bash
# Use a real orderNumber from a prior successful place-order if you have one:
export REAL_ORDER='ORD-....'   # or from /tmp/idem-a success JSON

curl -sS -D /tmp/h1.txt -o /tmp/t1.json \
  "$BASE/orders/track?orderNumber=${REAL_ORDER}&phone=03999999999"

curl -sS -D /tmp/h2.txt -o /tmp/t2.json \
  "$BASE/orders/track?orderNumber=ORD-DOES-NOT-EXIST-999&phone=$PHONE"

diff -u /tmp/t1.json /tmp/t2.json
# expect empty diff; both HTTP 404, {"error":{"code":"NOT_FOUND","message":"Order not found."}}
```

### (4) Guest order (no Authorization)

```bash
export IDEM_GUEST="idem-guest-$(date +%s)"
curl -sS -i -X POST "$BASE/orders" \
  -H 'Content-Type: application/json' \
  -H "Idempotency-Key: $IDEM_GUEST" \
  -d "{
    \"items\":[{\"productId\":\"$PRODUCT_ID\",\"quantity\":1}],
    \"customer\":{\"name\":\"Guest Only\",\"phone\":\"03009876543\",\"email\":\"\"},
    \"shippingAddress\":{\"street\":\"9 Guest Rd\",\"city\":\"Lahore\",\"state\":\"Punjab\",\"province\":\"Punjab\",\"country\":\"Pakistan\"},
    \"paymentMethod\":\"cod\"
  }" | tee /tmp/guest-order.json
# expect 201; orderSource mobile; response includes paymentInstructions + accessToken
export GUEST_ORDER_ID=$(python3 -c "import json;print(json.load(open('/tmp/guest-order.json'))['orderId'])")
export GUEST_ORDER_TOKEN=$(python3 -c "import json;print(json.load(open('/tmp/guest-order.json'))['accessToken'])")
```

### (4b) Order list / detail / courier tracking / payment validation

```bash
# Own orders list (Bearer)
curl -sS "$BASE/orders?page=1&limit=20" -H "Authorization: Bearer $ACCESS"
# expect { orders:[...], pagination:{ total, page, limit, pages, hasNext } }

# Guest reopen via header (never query string)
curl -sS -i "$BASE/orders/$GUEST_ORDER_ID" \
  -H "X-Order-Access-Token: $GUEST_ORDER_TOKEN"
# expect 200 + paymentInstructions

# Wrong token → same generic 404 as missing id
curl -sS -i "$BASE/orders/$GUEST_ORDER_ID" -H "X-Order-Access-Token: wrong-token"
curl -sS -i "$BASE/orders/000000000000000000000000" -H "X-Order-Access-Token: $GUEST_ORDER_TOKEN"
# both: {"error":{"code":"NOT_FOUND","message":"Order not found."}}

# --- IDOR: all three must match nonexistent-id body ---
# Capture baseline (nonexistent)
curl -sS -o /tmp/idor-base.json -w "%{http_code}" \
  "$BASE/orders/000000000000000000000000"
# expect 404 {"error":{"code":"NOT_FOUND","message":"Order not found."}}

# (1) User B Bearer on User A's order id
curl -sS -o /tmp/idor-1.json -w "%{http_code}" \
  "$BASE/orders/$ORDER_A_ID" -H "Authorization: Bearer $ACCESS_B"
diff -u /tmp/idor-base.json /tmp/idor-1.json
# expect empty diff

# (2) Guest token for order A used on order B
curl -sS -o /tmp/idor-2.json -w "%{http_code}" \
  "$BASE/orders/$ORDER_B_ID" -H "X-Order-Access-Token: $GUEST_ORDER_TOKEN"
diff -u /tmp/idor-base.json /tmp/idor-2.json
# expect empty diff

# (3) No auth and no token
curl -sS -o /tmp/idor-3.json -w "%{http_code}" \
  "$BASE/orders/$GUEST_ORDER_ID"
diff -u /tmp/idor-base.json /tmp/idor-3.json
# expect empty diff

# List is own-orders only (Bearer A must not include B's orderNumber)
curl -sS "$BASE/orders?page=1&limit=50" -H "Authorization: Bearer $ACCESS" \
  | python3 -c "import json,sys; d=json.load(sys.stdin); ids={o['id'] for o in d['orders']}; assert '$ORDER_B_ID' not in ids if '$ORDER_B_ID' else True; print('ok', len(d['orders']))"

# Courier tracking (mobile envelope)
curl -sS -i "$BASE/tracking?trackingNumber=INVALID1"
# expect 404 NOT_FOUND or 503 TRACKING_UNAVAILABLE (never 500 when courier keys missing)

# Disabled / unknown payment method on quote
curl -sS -i -X POST "$BASE/cart/quote" -H 'Content-Type: application/json' -d "{
  \"items\":[{\"productId\":\"$PRODUCT_ID\",\"quantity\":1}],
  \"paymentMethod\":\"stripe\",
  \"shippingAddress\":{\"city\":\"Lahore\",\"state\":\"Punjab\",\"country\":\"Pakistan\"}
}"
# expect 400 PAYMENT_METHOD_UNAVAILABLE

# Body-kit + enabled bankTransfer (set BODY_KIT_ID + ensure bankTransfer.enabled in preview Settings)
curl -sS -i -X POST "$BASE/cart/quote" -H 'Content-Type: application/json' -d "{
  \"items\":[{\"productId\":\"$BODY_KIT_ID\",\"quantity\":1}],
  \"paymentMethod\":\"bankTransfer\",
  \"shippingAddress\":{\"city\":\"Lahore\",\"state\":\"Punjab\",\"country\":\"Pakistan\"}
}"
# expect 200 (not COD_NOT_AVAILABLE)
```

### (4c) Home sections + fitment + delivery ETA

```bash
# Home — same sources as website SSR (hotDeals / bestSellers / brands)
curl -sS "$BASE/home" | python3 -c "import json,sys; d=json.load(sys.stdin); assert 'hotDeals' in d and 'bestSellers' in d and 'brands' in d; print(d['hotDeals'].get('title'), len(d['hotDeals'].get('products') or []), len(d['bestSellers'].get('products') or []), len(d['brands'].get('items') or []))"
# hotDeals.flashSaleEndTime may be null (FlashSale settings field)

# Config delivery policy (Lahore ETA confirmed; other cities neutral)
curl -sS "$BASE/config" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['delivery']['etaSummary']); print(d['delivery']['feeShort'])"

# Products that fit a vehicle (web /cars filter). Every card has fitsVehicle:true
curl -sS "$BASE/products?vehicle=$VEHICLE_SLUG&limit=5" | python3 -c "import json,sys; d=json.load(sys.stdin); assert all(p.get('fitsVehicle') is True for p in d['products']); print('ok', len(d['products']), d.get('vehicle'))"

# Product detail fitment flag
curl -sS "$BASE/products/$PRODUCT_SLUG?vehicle=$VEHICLE_SLUG" | python3 -c "import json,sys; d=json.load(sys.stdin); print('fitsVehicle=', d['product'].get('fitsVehicle'))"

# Order detail items include slug/image (historical orders get slug from productId lookup)
curl -sS "$BASE/orders/$GUEST_ORDER_ID" -H "X-Order-Access-Token: $GUEST_ORDER_TOKEN" \
  | python3 -c "import json,sys; o=json.load(sys.stdin)['order']; print([(i.get('slug'), bool(i.get('image')), i.get('variantId')) for i in o['items']])"
```

### (5) Price tamper / min-order / oversell (no partial stock decrement)

**Fake client price/total ignored — charged DB price**

```bash
export IDEM_PRICE="idem-price-$(date +%s)"
curl -sS -X POST "$BASE/orders" \
  -H 'Content-Type: application/json' \
  -H "Idempotency-Key: $IDEM_PRICE" \
  -d "{
    \"items\":[{\"productId\":\"$PRODUCT_ID\",\"quantity\":1,\"unitPrice\":1,\"price\":1}],
    \"total\":1,\"subtotal\":1,\"shippingCost\":0,
    \"customer\":{\"name\":\"Tamper\",\"phone\":\"03001110001\",\"email\":\"tamper@example.com\"},
    \"shippingAddress\":{\"street\":\"1 St\",\"city\":\"Lahore\",\"state\":\"Punjab\",\"province\":\"Punjab\",\"country\":\"Pakistan\"},
    \"paymentMethod\":\"cod\"
  }" | tee /tmp/tamper.json
# response.total / pricing must match server catalog + shipping floors — not 1
```

**Below minimumOrderAmount → 400 `MIN_ORDER_NOT_MET`**

```bash
# Preview Settings: set a high floor for the test, then restore
docker exec sialkot-mongo mongosh crazzycars_mobile_preview --quiet --eval '
db.settings.updateOne({singletonKey:"default"},{$set:{"storePayment.minimumOrderAmount":999999}})
'

export IDEM_MIN="idem-min-$(date +%s)"
curl -sS -i -X POST "$BASE/orders" \
  -H 'Content-Type: application/json' \
  -H "Idempotency-Key: $IDEM_MIN" \
  -d "{
    \"items\":[{\"productId\":\"$PRODUCT_ID\",\"quantity\":1}],
    \"customer\":{\"name\":\"Min\",\"phone\":\"03001110002\",\"email\":\"min@example.com\"},
    \"shippingAddress\":{\"street\":\"1 St\",\"city\":\"Lahore\",\"state\":\"Punjab\",\"province\":\"Punjab\",\"country\":\"Pakistan\"},
    \"paymentMethod\":\"cod\"
  }"
# expect 400 MIN_ORDER_NOT_MET

docker exec sialkot-mongo mongosh crazzycars_mobile_preview --quiet --eval '
db.settings.updateOne({singletonKey:"default"},{$set:{"storePayment.minimumOrderAmount":0}})
'
```

**Quantity above stock → error; stock unchanged**

```bash
docker exec sialkot-mongo mongosh crazzycars_mobile_preview --quiet --eval '
const id = ObjectId("'"$LOW_STOCK_ID"'");
const p = db.products.findOne({_id:id},{name:1,"inventory.quantity":1,"inventory.trackInventory":1});
printjson(p);
'

export QTY_BEFORE=$(docker exec sialkot-mongo mongosh crazzycars_mobile_preview --quiet --eval \
  'print(db.products.findOne({_id:ObjectId("'"$LOW_STOCK_ID"'")}).inventory.quantity)')

export IDEM_STOCK="idem-stock-$(date +%s)"
curl -sS -i -X POST "$BASE/orders" \
  -H 'Content-Type: application/json' \
  -H "Idempotency-Key: $IDEM_STOCK" \
  -d "{
    \"items\":[{\"productId\":\"$LOW_STOCK_ID\",\"quantity\":9999}],
    \"customer\":{\"name\":\"Oversell\",\"phone\":\"03001110003\",\"email\":\"stock@example.com\"},
    \"shippingAddress\":{\"street\":\"1 St\",\"city\":\"Lahore\",\"state\":\"Punjab\",\"province\":\"Punjab\",\"country\":\"Pakistan\"},
    \"paymentMethod\":\"cod\"
  }"
# expect 400 OUT_OF_STOCK / Insufficient stock — no 201

docker exec sialkot-mongo mongosh crazzycars_mobile_preview --quiet --eval '
const q = db.products.findOne({_id:ObjectId("'"$LOW_STOCK_ID"'")}).inventory.quantity;
print("qty after failed oversell:", q, "before was '"$QTY_BEFORE"'");
'
# expect unchanged
```

### (6) Account deletion — mongosh verify

```bash
# Place at least one authed order first so orders exist for CUSTOMER_ID / email.
curl -sS -i -X DELETE "$BASE/me" -H "Authorization: Bearer $ACCESS"

docker exec sialkot-mongo mongosh crazzycars_mobile_preview --quiet --eval '
const id = ObjectId("'"$CUSTOMER_ID"'");
const c = db.customers.findOne({_id:id},{email:1,phone:1,name:1,firstName:1,lastName:1,isActive:1,wishlist:1,password:1,passwordHash:1});
print("customer:", JSON.stringify(c));
// expect: isActive false; email like deleted+<id>@deleted.local; phone ""; names ""; wishlist []; passwords empty

print("orders kept:", db.orders.countDocuments({
  $or: [
    {"customer.customerId": id},
    {"customer.email": /deleted\+/}
  ]
}));
// or by pre-delete email if you stored it — orders must remain

print("devices:", db.mobiledevices.countDocuments({customerId: id}));
// expect 0

print("refresh tokens still active:", db.customerrefreshtokens.countDocuments({customerId: id, isRevoked: {$ne: true}}));
// expect 0
'
```

---

## Refresh-token grace window (implemented)

Only **hashes** are stored — we never return “the same” opaque refresh.

On normal rotate: revoke parent, issue child, set `replacedByTokenHash`, `graceExpiresAt = now+30s`, `graceRetryCount = 0`.

On parent retry within 30s with **unused** child (`!child.isRevoked`), and `graceRetryCount < 3`: revoke that child (supersede), issue a **NEW** child, update `replacedByTokenHash` / `graceExpiresAt`, increment `graceRetryCount`. **No family revoke.**

Otherwise (child already used, window passed, or cap hit): `401 TOKEN_REUSED` + revoke all sessions for the customer.

Unit tests: `tests/mobile-refresh-grace.test.mjs`.
