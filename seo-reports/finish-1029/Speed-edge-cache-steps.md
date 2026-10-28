# Speed — exact edge/CDN steps (NOT applied)

Home LCP ~2.9 s and `/categories/carbon-fiber` ~3.2 s still miss 2.5 s after origin ISR/cache. Do **not** change infra from this repo; apply manually.

## A. Cloudflare Cache Rules (preferred if orange-cloud)

1. **Dashboard → Caching → Cache Rules** (or Rules → Cache Rules).

2. **Rule: Next static**
   - If: URI Path starts with `/_next/static`
   - Then: Eligible for cache · Edge TTL = 1 month · Browser TTL = 1 month · Cache key ignore query string

3. **Rule: Media**
   - If: URI Path starts with `/media`
   - Then: Eligible for cache · Edge TTL = 7 days · Browser TTL = 1 day

4. **Rule: HTML hubs (home / categories / cars / blogs)**
   - If: URI Path equals `/` OR starts with `/categories` OR `/cars` OR `/blogs`
   - Then: Eligible for cache · Edge TTL = **Respect origin** (ISR `s-maxage=600`) · Browser TTL = Respect origin
   - Do **not** set a long fixed Edge TTL that ignores origin revalidation.

5. **Rule: Bypass private**
   - If: URI Path starts with `/api/` OR `/admin` OR `/cart` OR `/checkout` OR `/account` OR `/order-confirmation` OR `/review`
   - Then: Bypass cache

6. **Rule: Bypass when cookie**
   - If: Cookie contains `store_jwt` OR `cart` OR `session` OR `paid_traffic` (adjust to real cookie names)
   - Then: Bypass cache

7. After save: Purge Everything once, then warm `/`, `/categories/carbon-fiber`, one PDP, one blog. Re-run Lighthouse mobile.

## B. nginx proxy cache on VPS (Coolify host) — alternative / complement

Add under the storefront upstream (do not commit secrets):

```nginx
proxy_cache_path /var/cache/nginx/cc_html levels=1:2 keys_zone=cc_html:32m max_size=1g inactive=20m use_temp_path=off;
proxy_cache_path /var/cache/nginx/cc_media levels=1:2 keys_zone=cc_media:64m max_size=8g inactive=7d use_temp_path=off;

# Bypass map
map $request_uri $cc_bypass {
  default                 0;
  ~^/api/                 1;
  ~^/admin                1;
  ~^/cart                 1;
  ~^/checkout             1;
  ~^/account              1;
  ~^/order-confirmation   1;
  ~^/review               1;
}
map $http_cookie $cc_cookie_bypass {
  default                 0;
  ~*store_jwt             1;
  ~*cart                  1;
}

location /_next/static/ {
  proxy_pass http://crazzycars-store:3000;
  proxy_hide_header Cache-Control;
  add_header Cache-Control "public, max-age=31536000, immutable";
}

location /media/ {
  proxy_pass http://crazzycars-store:3000;
  proxy_cache cc_media;
  proxy_cache_valid 200 7d;
  proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;
  add_header X-Cache-Status $upstream_cache_status;
}

location / {
  proxy_pass http://crazzycars-store:3000;
  proxy_cache cc_html;
  proxy_cache_bypass $cc_bypass$cc_cookie_bypass;
  proxy_no_cache $cc_bypass$cc_cookie_bypass;
  proxy_cache_valid 200 10m;
  proxy_cache_use_stale error timeout updating;
  proxy_ignore_headers Set-Cookie;
  add_header X-Cache-Status $upstream_cache_status;
}
```

Reload nginx/`coolify-proxy` Traefik only after review — Traefik may already terminate TLS; prefer Cloudflare rules if Traefik sits in front without nginx HTML cache.

## C. Verify after ops apply

```bash
curl -sI https://crazzycars.pk/ | grep -iE 'cf-cache|x-cache|cache-control'
curl -sI https://crazzycars.pk/cart | grep -iE 'cf-cache|x-cache|cache-control'
# cart must NOT be HIT
npx lighthouse https://crazzycars.pk/ --form-factor=mobile --only-categories=performance
```

Target: LCP &lt; 2.5 s on home and `/categories/carbon-fiber`; CLS stays &lt; 0.1.
