# Storefront audit runbooks (October 2026)

Operational notes for audit items 9–11 and merchant policy surfaces. **No assetlinks / AASA in this pass** — do not publish `/.well-known/assetlinks.json` or `apple-app-site-association` until the mobile app deep-link contract is signed off.

---

## Item 9 — Single canonical HTTPS redirect (www + http)

**Goal:** One hop to `https://crazzycars.pk$request_uri` for all `http://`, `http://www.`, and `https://www.` requests.

### Coolify / Traefik (recommended)

Add a high-priority router on the Coolify proxy (`coolify-proxy`) or the app’s Traefik labels:

```yaml
# Example middleware + router (adjust entryPoints / cert resolver names to match host)
http:
  middlewares:
    canonical-https:
      redirectRegex:
        regex: "^https?://(?:www\\.)?crazzycars\\.pk/(.*)"
        replacement: "https://crazzycars.pk/${1}"
        permanent: true
  routers:
    crazzycars-canonical:
      rule: Host(`crazzycars.pk`) || Host(`www.crazzycars.pk`)
      entryPoints:
        - web
        - websecure
      middlewares:
        - canonical-https
      service: crazzycars-store
      tls:
        certResolver: letsencrypt
```

Verify:

```bash
curl -sI http://www.crazzycars.pk/shop | grep -i '^location:'
curl -sI https://www.crazzycars.pk/ | grep -i '^location:'
# Expect: Location: https://crazzycars.pk/...
```

### nginx (if terminating TLS on nginx instead of Traefik)

```nginx
server {
  listen 80;
  listen 443 ssl;
  server_name crazzycars.pk www.crazzycars.pk;
  return 301 https://crazzycars.pk$request_uri;
}
```

**Checklist:** HSTS only after redirect loop test; Search Console property should use the `https://crazzycars.pk` URL-prefix (non-www).

---

## Item 10 — Cloudflare “Cache Everything” for catalog HTML

**Goal:** Cache anonymous catalog HTML at the edge; never cache authenticated or transactional paths.

### Cache

- Enable **Cache Rules** (or Page Rules legacy): **Cache Everything** for:
  - `/` (homepage)
  - `/*` product PDPs (slug routes)
  - `/shop`, `/categories/*`, `/cars/*`, `/blogs/*`, static marketing pages
- Respect origin `Cache-Control` where present; set edge TTL 2–24h for HTML if origin is conservative.

### Bypass (always)

Use **Bypass cache** (or `Cache-Control: private, no-store` from origin) for:

| Path pattern | Reason |
|--------------|--------|
| `/cart`, `/checkout`, `/account/*` | Session / PII |
| `/admin`, `admin.crazzycars.pk` | Staff |
| `/api/*` | Dynamic JSON, auth, cart |
| `/feed/*`, `/sitemap*` | Fresh feeds / SEO |
| `POST` / `PUT` / `PATCH` / `DELETE` | Mutations |

Purge after deploy: homepage, `/shop`, top category URLs, or use tagged purge if configured.

---

## Item 11 — Firewall / fail2ban (bot-friendly)

**Goal:** Rate-limit abuse without blocking legitimate crawlers or cloud CI from AWS/GCP.

### Do not

- Drop entire **AWS** or **GCP** ASN ranges at the edge — Googlebot, Merchant Center fetches, and your own VMs share those ranges.

### Do

1. **Rate-limit** `/api/*`, `/checkout`, `/account/login`, `/customer/*` (e.g. 60 req/min/IP burst 120).
2. **Allowlist verified bots** via Cloudflare Bot Fight Mode / Super Bot Fight Mode *or* WAF skip rules for:
   - Googlebot (`googlebot.com` reverse DNS)
   - Bingbot
   - `AdsBot-Google`, `Google-InspectionTool`
3. **fail2ban** on the VPS (sshd + nginx/Traefik 401/403 storms), not on CDN bot paths.
4. **Test from AWS/GCP VMs** after rule changes:

```bash
curl -sI -A "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" https://crazzycars.pk/
curl -sI https://crazzycars.pk/robots.txt
# From a small AWS/GCP instance — expect 200, not 403
```

Document any IP allowlist for internal cron (`/api/cron/*`) separately; use shared secrets, not geo blocks.

---

## Merchant Center & Search Console — return policy as source of truth

- **Google Merchant Center:** Returns / refund policy URL → `https://crazzycars.pk/returns-policy` (must match live page and checkout copy).
- **Search Console:** Same URL in sitewide structured data / merchant listings where applicable; avoid contradictory shorter copy in feeds.
- When policy text changes, update **in this order:** live CMS page → Merchant Center → re-fetch in GSC URL Inspection for `/returns-policy`.

---

## Explicitly out of scope (this audit pass)

- **Digital Asset Links** (`/.well-known/assetlinks.json`)
- **Apple App Site Association** (`/.well-known/apple-app-site-association` or root `apple-app-site-association`)

Ship these only with a coordinated mobile release and verified package IDs / team IDs.
