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

## Current Coolify behaviour (verified 16 Oct 2026)

- Traefik (`coolify-proxy`) listens on `0.0.0.0:80` and `:443`.
- UFW allows `80/tcp` and `443/tcp`.
- File provider `deploy/traefik/crazzycars-https-apex.yaml` → `/data/coolify/proxy/dynamic/` issues a **308 Permanent Redirect** (Traefik v3 “permanent”) in **one hop** to `https://crazzycars.pk$1` for both apex and www on HTTP, and for www on HTTPS.

If `http://crazzycars.pk` times out from your network but works from the VPS (`curl -sI http://127.0.0.1/contact -H 'Host: crazzycars.pk'`), check the **cloud provider firewall / security group** (Hostinger hPanel → Firewall) — UFW alone is not enough when the provider drops :80 upstream.

## Applied file (preferred)

Ship `deploy/traefik/crazzycars-https-apex.yaml` into Coolify’s Traefik file provider:

```bash
scp deploy/traefik/crazzycars-https-apex.yaml root@VPS:/data/coolify/proxy/dynamic/crazzycars-https-apex.yaml
# Traefik reloads file provider automatically; verify with the curls below.
```

This beats Coolify’s default `redirectscheme` (307 to the same host) by issuing a **301** straight to `https://crazzycars.pk$1` for both apex and www on the `http` entrypoint, and for www on `https`.

## Coolify + Traefik labels (storefront app, alternative)

In Coolify → storecraft-store → **Advanced** / custom labels, replace the generic HTTPS redirect with an apex redirectregex (or add these alongside and point the HTTP www router at them). Adjust the router UUID prefix (`p3pc49…`) to match your app.

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

# Also set on Coolify’s existing middleware if you keep redirectscheme:
# traefik.http.middlewares.redirect-to-https.redirectscheme.permanent: "true"
# Prefer redirectregex above for www→apex in one hop.

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
