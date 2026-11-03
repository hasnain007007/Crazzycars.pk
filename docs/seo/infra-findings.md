# Infra findings — crazzycars.pk (SEO Task 1, 4 Nov 2026)

## Current edge path

Browser → **Cloudflare (Pingora)** → Coolify/Traefik (`coolify` network) → `crazzycars-store` / `crazzycars-admin` containers on the VPS.

Live checks (4 Nov ~01:40 PKT):
- `http://crazzycars.pk/` → **308** `https://crazzycars.pk/` (recovered; earlier GSC day saw intermittent **500** on plain HTTP).
- `http://www.crazzycars.pk/shop` → **308** `https://www.crazzycars.pk/shop` (Cloudflare hop), then app middleware **308** → `https://crazzycars.pk/shop`.
- `GET /api/health` → `{"ok":true,...}` with Mongo ping + catalog counts.
- Store container: Memory limit unset (`0`), RestartCount `0`, OOMKilled `false`.

## Owner / Cloudflare actions (do not change without approval)

1. **SSL/TLS mode:** set **Full (strict)** (not Flexible / Full). Flexible causes Cloudflare to speak HTTP to origin and explains intermittent origin 500s on `http://` probes.
2. **Always Use HTTPS:** ON (edge).
3. **Automatic HTTPS Rewrites:** ON.
4. Prefer a single edge hop for www: Cloudflare Page Rule / Redirect Rule  
   `http://www.crazzycars.pk/*` and `https://www.crazzycars.pk/*` → `https://crazzycars.pk/$1` (308).  
   App middleware already collapses `www` → apex on HTTPS; edge redirect removes the extra hop.
5. Origin certificate: Traefik Let's Encrypt (or Cloudflare Origin Cert) must cover  
   `crazzycars.pk`, `www.crazzycars.pk`, `admin.crazzycars.pk`. Verify with:
   ```bash
   echo | openssl s_client -connect crazzycars.pk:443 -servername crazzycars.pk 2>/dev/null | openssl x509 -noout -subject -enddate
   ```

## Traefik / Coolify (document; apply in Coolify UI)

- `web` entrypoint: `redirectscheme` middleware → `https` (permanent).
- `respondingTimeouts.idleTimeout` ≤ **60s** (or match Cloudflare); Node `keepAliveTimeout` must be **greater**.
- Health check URL: prefer **`/api/healthz`** (liveness, no DB) every 15–30s, 3 retries. Keep `/api/health` for deeper Mongo/catalog monitoring off the critical path.

## In-repo changes (this PR)

| Change | Purpose |
|--------|---------|
| `middleware.js` `forceHttpsRedirect` | Honour `x-forwarded-proto=http` → one 308 to `https://apex/...` (www collapsed in same hop). |
| `app/api/healthz` | Fast `{ok:true}` for Coolify probes. |
| `server-timeouts.mjs` + Dockerfile `CMD` | `keepAliveTimeout=65s`, `headersTimeout=70s` on the standalone HTTP server. |
| Admin/store Dockerfiles | Load `MONGODB_URI` from BuildKit secret (fixes admin build page-collection crash). |

## TLS intermittency (2–3 Nov)

Symptom: `unexpected eof while reading` / 8–9s hangs on ~10–30% of HTTPS probes. Likely causes to verify on the VPS (not changed here):
- Container restart / OOM under load (inspect restart counts during a failure window).
- Proxy idle timeout shorter than Node keep-alive (addressed by `server-timeouts.mjs`).
- Cloudflare ↔ origin SSL mode mismatch (Flexible).

Re-run the 100× `/robots.txt` probe after Cloudflare Full (strict) + healthz wiring.
