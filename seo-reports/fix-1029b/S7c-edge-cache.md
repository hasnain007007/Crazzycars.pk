# S7c — Cache-Control at origin + edge (report)

## Origin (Next.js `storecraft-store/next.config.mjs`) — shipped in code

| Path | Cache-Control |
|------|----------------|
| `/_next/static/*` (prod) | `public, max-age=31536000, immutable` |
| `/media/*`, `/api/media/*` | `public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400` (+ sandbox CSP) |
| `/sitemap.xml` | `public, s-maxage=86400, stale-while-revalidate=3600` |
| `/robots.txt` | `public, s-maxage=86400` |
| Public product/banner APIs | `public, s-maxage=60–300, stale-while-revalidate=…` |
| Customer/checkout/auth APIs | `private, no-store` |

HTML for home / categories / cars / blogs uses **ISR `revalidate = 600`**. Next emits `s-maxage=600` (or CDN-Cache-Control) on those responses when served from the Full Route Cache — do not override with `no-store` at the proxy.

## Recommended nginx (Coolify / VPS) — apply on host, not committed secrets

```nginx
# Static Next assets
location /_next/static/ {
  proxy_pass http://storefront;
  proxy_hide_header Cache-Control;
  add_header Cache-Control "public, max-age=31536000, immutable";
}

# Uploaded media
location /media/ {
  proxy_pass http://storefront;
  # Prefer origin headers; if stripped, set:
  # add_header Cache-Control "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400";
  proxy_cache cc_media;
  proxy_cache_valid 200 7d;
  proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;
}

# HTML — short shared cache aligned with ISR 600s
location / {
  proxy_pass http://storefront;
  proxy_cache cc_html;
  proxy_cache_valid 200 10m;
  proxy_cache_use_stale error timeout updating;
  # Honour origin Cache-Control / x-nextjs-cache when present
  proxy_ignore_headers Set-Cookie;
  proxy_hide_header Set-Cookie;
}
```

Bypass `proxy_cache` for `/api/customer`, `/api/checkout`, `/api/auth`, cart cookies.

## Cloudflare (if orange-cloud)

- **Cache Rules**
  - URI Path starts with `/_next/static` → Cache Everything, Edge TTL 1 month, Browser TTL 1 month.
  - URI Path starts with `/media` → Cache Everything, Edge TTL 7 days, Browser TTL 1 day.
  - URI Path is `/` or starts with `/categories` `/cars` `/blogs` → Eligible for cache, Edge TTL **respect origin** (ISR 600s). Do **not** “Cache Everything” with a long override that ignores revalidation.
- **Skip cache** for `/api/customer*`, `/checkout*`, cookie `session` / cart present.
- Never cache a sitemap URL that redirects or returns non-200 (C23).

## Status

- Origin media + API headers: **code** (this branch).
- nginx/Cloudflare snippets above: **ops config to apply on VPS/CF** (no automatic apply from this repo).
