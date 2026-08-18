# Tech debt

Logged from the 18 Aug 2026 storefront production build (`storecraft-store`, Next 16.2.4). Build **succeeded** (exit 0). These are warnings only — they did not block the `origin/vps-test` merge.

## 1. Duplicate Mongoose index on Category `{status:1}`

**Urgency:** low. Fix within a few weeks.

`next build` warns:

```
mongoose: Duplicate schema index on {"status":1} for model "Category".
This is often due to declaring an index using both "index: true" and "schema.index()".
```

Both declarations are in `storecraft-store/lib/models/Category.model.js`:

- Field: `status: { …, index: true }`
- Compound/explicit: `categorySchema.index({ status: 1 })`

Remove **one** of them. Check `storecraft-admin/lib/models/Category.model.js` if it duplicates the same pattern.

## 2. `middleware.js` → `proxy` convention

**Urgency:** before the next Next.js major upgrade.

Build:

```
The "middleware" file convention is deprecated. Please use "proxy" instead.
```

File: `storecraft-store/middleware.js` (admin already has `storecraft-admin/proxy.js`). Next 16 still ran it as `ƒ Proxy (Middleware)`. Migrate the storefront matcher and host/301 logic to the documented `proxy` convention so a future major does not drop crawler redirects.

## 3. Custom Cache-Control on `/_next/static/:path*`

**Urgency:** review, not an emergency.

Build:

```
Warning: Custom Cache-Control headers detected for the following routes:
  - /_next/static/:path*
Setting a custom Cache-Control header can break Next.js development behavior.
```

Source: `storecraft-store/next.config.mjs` `headers()` — production-only `public, max-age=31536000, immutable` on `/_next/static/:path*`. Confirm this is an intentional hashed-asset / CDN policy. If it is leftover, drop it and let Next set static caching.
