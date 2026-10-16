# HTTP → HTTPS and www → apex (Coolify / Traefik)

Do **not** redirect HTTP→HTTPS inside Next.js. Terminate TLS and canonicalize the host at the reverse proxy so each request is a single 301 hop to `https://crazzycars.pk/*` (path + query preserved).

## Required behaviour

| Request | Response |
|---------|----------|
| `http://crazzycars.pk/contact` | `301` → `https://crazzycars.pk/contact` |
| `http://www.crazzycars.pk/contact` | `301` → `https://crazzycars.pk/contact` (not via www HTTPS) |
| `https://www.crazzycars.pk/contact` | `301` or `308` → `https://crazzycars.pk/contact` |

The storefront middleware already 308s `www` → apex on HTTPS. Port 80 must be open and Traefik must own the HTTP→HTTPS redirect.

## Firewall

On the VPS, allow inbound TCP 80 and 443:

```bash
ufw allow 80/tcp
ufw allow 443/tcp
ufw status
```

Also confirm the cloud provider security group / firewall allows 80.

## Coolify + Traefik labels (storefront app)

Attach these labels to the **store** service (or the Coolify “Custom Labels” field for the crazzycars.pk resource). Adjust the router/service names to match the Coolify-generated ones if they differ (`p3pc49…` style).

```yaml
# Listen on HTTP (entrypoint web) and redirect everything to HTTPS apex.
traefik.enable: "true"

# --- HTTP router: redirect to https://crazzycars.pk (permanent) ---
traefik.http.routers.crazzycars-http.rule: Host(`crazzycars.pk`) || Host(`www.crazzycars.pk`)
traefik.http.routers.crazzycars-http.entrypoints: web
traefik.http.routers.crazzycars-http.middlewares: crazzycars-https-apex
traefik.http.routers.crazzycars-http.service: noop@internal

# Middleware: permanent redirect to https://crazzycars.pk${path}?${query}
traefik.http.middlewares.crazzycars-https-apex.redirectregex.regex: ^https?://(?:www\.)?crazzycars\.pk(.*)$
traefik.http.middlewares.crazzycars-https-apex.redirectregex.replacement: https://crazzycars.pk$${1}
traefik.http.middlewares.crazzycars-https-apex.redirectregex.permanent: "true"

# --- HTTPS router: apex only (TLS) ---
traefik.http.routers.crazzycars-https.rule: Host(`crazzycars.pk`)
traefik.http.routers.crazzycars-https.entrypoints: websecure
traefik.http.routers.crazzycars-https.tls: "true"
traefik.http.routers.crazzycars-https.tls.certresolver: letsencrypt

# --- HTTPS www → apex (single hop; optional if middleware above already covers HTTPS www) ---
traefik.http.routers.crazzycars-https-www.rule: Host(`www.crazzycars.pk`)
traefik.http.routers.crazzycars-https-www.entrypoints: websecure
traefik.http.routers.crazzycars-https-www.tls: "true"
traefik.http.routers.crazzycars-https-www.tls.certresolver: letsencrypt
traefik.http.routers.crazzycars-https-www.middlewares: crazzycars-https-apex
traefik.http.routers.crazzycars-https-www.service: noop@internal
```

If Coolify already creates the HTTPS apex router for the app, only add:

1. An HTTP (`web`) router for both hosts with the `redirectregex` middleware above.
2. Ensure the Coolify domain list includes `crazzycars.pk` and `www.crazzycars.pk`, with **Generate SSL** on both (www can redirect before serving content).

### Coolify UI checklist

1. Application → **Domains**: `crazzycars.pk`, `www.crazzycars.pk`
2. Enable **HTTPS** / Let’s Encrypt for both
3. Under proxy / Traefik: enable **HTTP → HTTPS redirect** (permanent)
4. Prefer redirect target host = **apex** (`crazzycars.pk`), not www
5. Redeploy the store after labels change

## Verify

```bash
UA="Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"
curl -sI -A "$UA" http://crazzycars.pk/contact | grep -iE '^HTTP|^location'
curl -sI -A "$UA" http://www.crazzycars.pk/contact | grep -iE '^HTTP|^location'
curl -sI -A "$UA" https://www.crazzycars.pk/contact | grep -iE '^HTTP|^location'
```

Expect exactly one redirect to `https://crazzycars.pk/contact` (301 preferred; 308 acceptable for HTTPS www if issued by Next middleware).

## Notes

- Opening port 80 alone is not enough; Traefik must bind the `web` entrypoint (usually `:80`).
- After applying, confirm `ss -lntp | grep ':80 '` shows Traefik listening.
- Storefront Next.js must keep serving only on the internal container port; public 80/443 stay on Traefik.
