# Homefy.pk — Ecommerce Platform

**Private repo:** [github.com/hasnain007007/homefy.pk](https://github.com/hasnain007007/homefy.pk)  
**Remote:** `homefy` → `main` (independent from CrazzyCars `Crazzycars.pk` / `vps-test`)

Kitchen accessories, beauty bags and ladies bags for the Pakistan market. A two-app Next.js ecommerce platform: a customer-facing **storefront** (`storecraft-store`) and an **admin panel** (`storecraft-admin`).

- **Store:** https://homefy.pk
- **Admin:** https://admin.homefy.pk
- **Local:** http://localhost:3000 and http://localhost:3001

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

Homefy must stay independent from CrazzyCars Coolify/`vps-test`. See **`docs/HOMEFY-DEPLOY.md`**.

### Vercel (Homefy projects)

| App | Vercel project | Staging |
|--|--|--|
| Store | `homefy-pk-store` | https://homefy-pk-store.vercel.app |
| Admin | `homefy-pk-admin` | https://homefy-pk-admin.vercel.app |

Do **not** deploy Homefy to legacy `storecraft-store` / `storecraft-admin` (those are CrazzyCars-era).

For CLI deploys, leave Vercel Root Directory empty and run from each app folder. After connecting Git for monorepo builds, set Root Directory to `storecraft-store` / `storecraft-admin` and Production Branch to **`homefy-dev`**.

```bash
cd storecraft-store && vercel --prod --yes --scope hasnain-s-projects3
cd ../storecraft-admin && vercel --prod --yes --scope hasnain-s-projects3
node scripts/homefy/verify-deploy-independence.mjs
```

Connect Git → production branch **`homefy-dev`**, then attach `homefy.pk` / `admin.homefy.pk`.

Hobby plan: store crons are daily only (`vercel.json`) — hourly crons require Vercel Pro (or run on Coolify).

### Coolify (Homefy apps only)

Create **new** apps on branch `homefy-dev` with Dockerfiles under `storecraft-*`. Never retarget the live CrazzyCars apps on `vps-test`.

## First login

After seeding:

- **Email:** `admin@homefy.pk`
- **Password:** `@Hasnain0007`

Change this password immediately in production.

## Required third-party accounts

1. **MongoDB Atlas** — database
2. **Cloudinary** — media CDN and uploads
3. **Stripe** — card payments and webhooks
4. **PayPal** — PayPal checkout
5. **Resend** — transactional email
6. **TinyMCE** — rich text editor in admin ([tiny.cloud](https://www.tiny.cloud/)); replace the placeholder API key in `storecraft-admin/components/ui/TinyEditor.jsx`

Optional: domain registrar, Vercel or VPS host, and WhatsApp Business for the floating chat button.
