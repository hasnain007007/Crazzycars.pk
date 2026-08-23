# PostEx × Shopify Auto-Booking & Tracking

Courier automation middleware for **crazzycars.pk**. Confirmed Shopify orders are booked with PostEx, the tracking number (CN) is written back as a Shopify fulfillment (customer email/SMS), and parcel statuses stay synced until delivery.

Stack: **Node 20 + Express**, **Prisma + SQLite** (Postgres-ready), **EJS** admin dashboard, **node-cron**, **Zod**, **Pino**.

---

## 1. Setup

```bash
cd postex-shopify-middleware
cp .env.example .env
# Edit .env — fill Shopify + PostEx + ADMIN_PASSWORD

npm install
npx prisma db push
npm run dev
```

Open `http://localhost:3000` (or your `PORT`). Sign in with `ADMIN_USERNAME` / `ADMIN_PASSWORD`.

> If port 3000 is already used by the storefront, set `PORT=3100` in `.env`.

---

## 2. Shopify custom app

1. In Shopify Admin → **Settings → Apps and sales channels → Develop apps → Create an app**.
2. Under **Configuration → Admin API access scopes**, enable at least:
   - `read_orders`
   - `write_fulfillments`
   - `read_fulfillments`
   - (optional but useful) `read_merchant_managed_fulfillment_orders`, `write_merchant_managed_fulfillment_orders`
3. **Install app** on the store.
4. Copy the **Admin API access token** → `SHOPIFY_ADMIN_API_TOKEN`.
5. Under **API credentials**, copy the **API secret key** (used as webhook HMAC) → `SHOPIFY_WEBHOOK_SECRET`.
6. Set `SHOPIFY_STORE_DOMAIN` to your `*.myshopify.com` domain (e.g. `crazzycars-pk.myshopify.com`).
7. Keep `SHOPIFY_API_VERSION` in sync with Shopify (default `2025-07`).

---

## 3. Register webhooks

Expose a public HTTPS URL first (see §4), then:

```bash
APP_BASE_URL=https://YOUR-TUNNEL.example npm run register-webhooks
```

This creates:

| Topic | Path |
|--------|------|
| `ORDERS_CREATE` | `/webhooks/orders-create` |
| `ORDERS_CANCELLED` | `/webhooks/orders-cancelled` |
| `ORDERS_UPDATED` | `/webhooks/orders-updated` |

You can also add the same URLs manually in the custom app → **Webhooks**.

HMAC verification is mandatory on every webhook (`X-Shopify-Hmac-Sha256`). Invalid signatures get `401`. Handlers respond `200` immediately and process PostEx work asynchronously.

---

## 4. Local testing (tunnel)

**ngrok:**

```bash
ngrok http 3000
# then: APP_BASE_URL=https://xxxx.ngrok-free.app npm run register-webhooks
```

**cloudflared:**

```bash
cloudflared tunnel --url http://localhost:3000
```

---

## 5. Test checklist

1. Place a **test order** on the Shopify store (COD and/or prepaid).
2. Confirm it appears on **/orders** as `PENDING_BOOKING` (or auto-books if `AUTO_BOOK=true`).
3. Click **Book** → PostEx returns a CN; status becomes `BOOKED`.
4. In Shopify Admin, open the order → fulfilled with carrier **PostEx** and tracking URL.
5. Confirm the customer notification contains the tracking link (`notifyCustomer: true`).
6. Click **Label** to open the airway bill PDF.
7. Wait for the poller (`POLL_INTERVAL_MINUTES`) or change status on PostEx → dashboard status updates; Delivered → `DELIVERED`, Returned → `RETURNED`.
8. Test **Fix city** on a bad city string; mapping should persist under **/settings**.
9. Test **Cancel** while status is still Unbooked/Booked (blocked after pick-up).

---

## 6. Adjusting PostEx endpoints

All paths and create-order field names live in **one config object** at the top of:

`src/services/postex.js` → `ENDPOINTS` (+ `CREATE_ORDER_FIELDS` / Zod schema)

Default shapes (verify against your official PostEx API PDF):

| Function | Method | Path |
|----------|--------|------|
| `getOperationalCities` | GET | `/services/integration/api/order/v2/get-operational-city` |
| `createOrder` | POST | `/services/integration/api/order/v3/create-order` |
| `trackOrder` | GET | `/services/integration/api/order/v1/track-order/{cn}` |
| `listOrders` | GET | `/services/integration/api/order/v1/get-all-order` |
| `cancelOrder` | PUT | `/services/integration/api/order/v1/cancel-order` |
| `getAirwayBill` | GET | `/services/integration/api/order/v1/get-invoice?trackingNumbers=` |

Auth: header `token: POSTEX_API_KEY` on every request.

Tracking number is read defensively from `dist.trackingNumber` → `data.trackingNumber` → `trackingNumber`.

**Change only that file** when your PDF differs — the rest of the app stays untouched.

---

## 7. Deployment (cheap VPS)

1. Point a domain (e.g. `courier.yourdomain.com`) at the VPS.
2. Install Node 20, clone repo, copy `.env`, set:
   ```
   DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/postex?schema=public"
   NODE_ENV=production
   ```
   Then change `provider = "postgresql"` in `prisma/schema.prisma`, run `npx prisma db push`.
3. Process manager:
   ```bash
   npm i -g pm2
   pm2 start src/server.js --name postex-middleware
   pm2 save && pm2 startup
   ```
4. Reverse proxy (Caddy example):
   ```
   courier.yourdomain.com {
     reverse_proxy localhost:3000
   }
   ```
5. Re-register webhooks with the production `APP_BASE_URL`.
6. Keep `AUTO_BOOK` off until you trust city mappings and COD amounts.

---

## Dashboard map

| Route | Purpose |
|-------|---------|
| `/dashboard` | Stats + recent activity |
| `/orders` | Filter, book, bulk book/labels, CN copy |
| `/orders/:id` | Timeline, fix city, cancel, retry |
| `/settings` | AUTO_BOOK, pickup code, city cache, mappings |
| `/logs` | Last 200 API calls (token masked) |

---

## Assumptions to verify against your PostEx PDF

1. Endpoint paths and version segments (`v1` / `v2` / `v3`) match your document.
2. Auth header name is exactly `token` (not `Authorization` / `api-key`).
3. Create-order success puts CN at `dist.trackingNumber` (fallback paths are coded).
4. `invoicePayment` is COD amount in PKR; prepaid = `0`.
5. `pickupAddressCode` matches a registered pickup in your PostEx merchant portal.
6. `orderType: "Normal"` is accepted (or change `POSTEX_ORDER_TYPE`).
7. Airway bill returns raw PDF bytes from `get-invoice`.
8. Bulk `get-all-order` date query params are `fromDate` / `toDate` (ISO date strings).
9. Cancel accepts `{ "trackingNumber": "..." }` via PUT.
10. Status strings match the set listed in the brief (Delivered / Returned / Out For Return, etc.).
