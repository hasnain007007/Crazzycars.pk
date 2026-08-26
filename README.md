# Crazzycars.pk — Ecommerce Platform

Car accessories store for the Pakistan market. A two-app Next.js ecommerce platform: a customer-facing **storefront** (`storecraft-store`) and an **admin panel** (`storecraft-admin`). Both apps share MongoDB and integrate with Cloudinary, Stripe, PayPal, and Resend.

- **Live store:** https://crazzycars.pk
- **Admin panel:** https://admin.crazzycars.pk

## Project overview

| App | Port (local) | Purpose |
|-----|----------------|---------|
| `storecraft-store` | 3000 | Public shop: products, cart, checkout, customer accounts |
| `storecraft-admin` | 3001 | Back office: products, orders, settings, reports |

## Prerequisites

- **Node.js 20** (LTS recommended)
- **MongoDB Atlas** (or compatible MongoDB URI)
- **Cloudinary** account (image/video uploads)
- **Stripe** account (card payments + webhooks)
- **PayPal** developer app (PayPal checkout)
- **Resend** account (transactional email)
- **TinyMCE** API key (rich text in admin; optional until you add your key)

## Local setup

1. **Clone** the repository and open the project root.

2. **Copy environment templates** in each app:
   ```bash
   cp storecraft-store/.env.local.example storecraft-store/.env.local
   cp storecraft-admin/.env.local.example storecraft-admin/.env.local
   ```

3. **Fill in** all required values in both `.env.local` files (see [Environment variables](#environment-variables) below).

4. **Install dependencies** (from each app directory):
   ```bash
   cd storecraft-store && npm install
   cd ../storecraft-admin && npm install
   ```

5. **Seed the default admin** (from `storecraft-admin`, with `MONGODB_URI` set):
   ```bash
   node scripts/seed-admin.mjs
   ```

6. **Run locally** (two terminals):
   ```bash
   cd storecraft-store && npm run dev    # http://localhost:3000
   cd storecraft-admin && npm run dev    # http://localhost:3001
   ```

## Environment variables

### storecraft-store (`storecraft-store/.env.local`)

| Variable | Description |
|----------|-------------|
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret for signing admin/customer JWTs |
| `NEXT_PUBLIC_APP_NAME` | Short app label (UI, watermarks) |
| `NEXT_PUBLIC_STORE_NAME` | Store display name |
| `NEXT_PUBLIC_APP_URL` | Public store base URL |
| `NEXT_PUBLIC_ADMIN_URL` | Admin panel base URL |
| `NEXT_PUBLIC_STORE_URL` | Canonical storefront URL (SEO, links) |
| `NEXT_PUBLIC_WHATSAPP` | WhatsApp number (digits only, country code) |
| `RESEND_API_KEY` | Resend API key |
| `FROM_EMAIL` | Sender email (verified in Resend) |
| `FROM_NAME` | Sender display name |
| `ADMIN_EMAIL` | Address for admin notifications |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name (client) |
| `PAYPAL_CLIENT_ID` | PayPal REST client ID |
| `PAYPAL_CLIENT_SECRET` | PayPal REST client secret |

### storecraft-admin (`storecraft-admin/.env.local`)

| Variable | Description |
|----------|-------------|
| `MONGODB_URI` | Same MongoDB as the store |
| `JWT_SECRET` | Same JWT secret as the store |
| `NEXT_PUBLIC_APP_URL` | Admin base URL |
| `NEXT_PUBLIC_STORE_URL` | Storefront URL (links, previews) |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name (client) |
| `RESEND_API_KEY` | Resend API key |
| `FROM_EMAIL` | Sender email |
| `FROM_NAME` | Sender display name |

Committed templates: `storecraft-store/.env.local.example` and `storecraft-admin/.env.local.example`. Do not commit `.env.local`.

## Deployment

### Vercel (recommended for Next.js)

1. Create two Vercel projects (store + admin) or one monorepo with two apps.
2. Set the root directory to `storecraft-store` or `storecraft-admin`.
3. Add all environment variables from the tables above in the Vercel dashboard.
4. Point `NEXT_PUBLIC_*_URL` values to your production domains.
5. Configure Stripe webhooks to `https://<store-domain>/api/payment/stripe/webhook`.
6. Run `node scripts/seed-admin.mjs` once against production MongoDB (locally with production `MONGODB_URI`).

### VPS (PM2 + Nginx)

1. Build both apps: `npm run build` in each directory.
2. Use existing **PM2** config (`pm2.config.js` / `ecosystem.config.js`) to run Node processes on ports 3000 and 3001.
3. **Nginx** reverse proxy (outline):
   - `store.example.com` → `proxy_pass http://127.0.0.1:3000`
   - `admin.example.com` → `proxy_pass http://127.0.0.1:3001`
   - SSL via Let's Encrypt (`certbot`).
4. Set production env vars on the server (never commit secrets).

## First login

Set `ADMIN_SEED_PASSWORD` in `storecraft-admin/.env.local` (min 12 characters), then run `node scripts/seed-admin.mjs`. Log in as `admin@crazzycars.pk` with that password. Change it immediately in production. Never commit the password.

## Required third-party accounts

1. **MongoDB Atlas** — database
2. **Cloudinary** — media CDN and uploads
3. **Stripe** — card payments and webhooks
4. **PayPal** — PayPal checkout
5. **Resend** — transactional email
6. **TinyMCE** — rich text editor in admin ([tiny.cloud](https://www.tiny.cloud/)); replace the placeholder API key in `storecraft-admin/components/ui/TinyEditor.jsx`

Optional: domain registrar, Vercel or VPS host, and WhatsApp Business for the floating chat button.
