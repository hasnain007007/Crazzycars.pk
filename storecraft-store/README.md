This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Mobile API

Base path: `/api/mobile/v1/`

Error envelope (mobile routes only): `{ error: { code, message, fields? } }`

**Web cookie auth is unchanged.** Mobile uses a separate `MOBILE_JWT_SECRET`, Bearer-only access tokens (`aud: crazzycars-mobile`, `typ: mobile_access`), and rotating opaque refresh tokens (hashed in Mongo). Cookie JWTs are not accepted as Bearer and vice versa.

Shared checkout logic lives in `lib/checkout/createStoreOrder.js`. Web `POST /api/checkout` is a thin adapter (`orderSource: site`, no server min-order enforce). Mobile orders use `orderSource: mobile` and enforce `minimumOrderAmount` server-side.

Required env: `MOBILE_JWT_SECRET` (not set in production by the mobile-api branch alone).

Rate limiting uses the existing MongoDB `LoginAttempt` collection (TTL), not in-memory counters.

