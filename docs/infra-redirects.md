# HTTP → HTTPS and www → apex (Coolify / Traefik)

Do **not** redirect HTTP→HTTPS inside Next.js. Terminate TLS and canonicalize the host at the reverse proxy so each request is a single permanent hop to `https://crazzycars.pk/*` (path + query preserved).

## Required behaviour

| Request | Response |
|---------|----------|
| `http://crazzycars.pk/contact` | `301` or `308` → `https://crazzycars.pk/contact` |
| `http://www.crazzycars.pk/` | `301` or `308` → `https://crazzycars.pk/` (not via www HTTPS) |
| `https://www.crazzycars.pk/contact` | `301` or `308` → `https://crazzycars.pk/contact` |

Traefik v3 emits **308** when `permanent: true` on `redirectRegex` (method-preserving permanent redirect). That satisfies SEO “one permanent hop” requirements. Coolify’s older `redirectscheme` without `permanent` was **307**.

---

## Status (verified 16 Oct 2026 — external probes)

**There is no VPS-side block on TCP 80 right now.** Port 80 is open to the public internet and redirects correctly.

### External proof (not from the VPS)

From a laptop outside the VPS (`curl -4 -sI --max-time 12 http://crazzycars.pk/contact`):

```
HTTP/1.1 308 Permanent Redirect
Location: https://crazzycars.pk/contact
```

From [check-host.net](https://check-host.net) TCP/HTTP nodes (IL, IR, NL, RS, TR, BR, DE, KZ, FR, PT, …):

- TCP `31.97.107.181:80` — **open** from all sampled nodes  
- `http://crazzycars.pk/contact` — **301/308 Moved Permanently** to HTTPS apex  
- `http://www.crazzycars.pk/` — **301/308** to `https://crazzycars.pk/`  
- [portchecker.io](https://portchecker.io) API: ports **80** and **443** both `status: true`

### DNS

| Name | Type | Value | Notes |
|------|------|-------|--------|
| `crazzycars.pk` | NS | Cloudflare (`bjorn` / `tara`) | Registrar NS only |
| `crazzycars.pk` / `www` | A | `31.97.107.181` | **DNS-only** (grey cloud) — not Cloudflare proxied |
| `crazzycars.pk` / `www` | AAAA | *(none)* | No IPv6 pitfall |

HTTPS responses have **no** `cf-ray` — traffic hits the VPS Traefik directly.

### VPS stack (guest)

| Check | Result |
|-------|--------|
| `ss -ltnp \| grep ':80 '` | `docker-proxy` on `0.0.0.0:80` and `[::]:80` |
| Coolify proxy publish | `80:80`, `443:443` on `coolify-proxy` |
| Traefik entrypoints | `http` → `:80`, `https` → `:443` (Coolify names; not `web`/`websecure`) |
| Apex redirect file | `/data/coolify/proxy/dynamic/crazzycars-https-apex.yaml` |
| UFW | `80/tcp` and `443/tcp` ALLOW |
| `DOCKER-USER` | Explicit `ACCEPT` tcp/80 and tcp/443 (`ccsms-harden-http` / `ccsms-harden-https`) before management-port DROPs |
| Harden script | `/usr/local/sbin/coolify-docker-harden.sh` (keeps 80/443 allowed; drops 8000/6001/6002/8080) |

Repo copy of the Traefik file: `deploy/traefik/crazzycars-https-apex.yaml`.

---

## If YOUR machine still times out on `http://`

When global checkers and other networks succeed but one laptop/CI box hangs on `:80` while `:443` works, the filter is **upstream of or local to that client**, not Coolify/Traefik.

Try in order:

1. **Outbound block on the client network** — many corporate Wi‑Fi / mobile CGNAT setups block client→internet TCP 80. Test a phone hotspot or another ISP.  
2. **Hostinger hPanel edge firewall** (account owner only — we cannot toggle this from SSH):

### Hostinger hPanel — open inbound TCP 80 (account owner)

1. Log in to [hPanel](https://hpanel.hostinger.com) with the VPS owner account  
2. Open **VPS** → select server `31.97.107.181` (hostname `srv1861294`)  
3. Go to **Firewall** (sometimes under **Security**)  
4. Ensure an **inbound** rule exists:  
   - Protocol: **TCP**  
   - Port: **80**  
   - Source: **Anywhere** (`0.0.0.0/0`)  
   - Action: **Accept** / Allow  
5. Keep the matching rule for **TCP 443**  
6. Save / apply — wait ~1–2 minutes  
7. Re-test from the failing machine:

```bash
curl -4 -sI --max-time 12 http://crazzycars.pk/contact
curl -4 -sI --max-time 12 http://www.crazzycars.pk/
```

Expect one hop: `301` or `308` with `Location: https://crazzycars.pk/...`.

UFW inside the guest is already open; Hostinger’s panel firewall is a **separate** layer in front of the VPS. Only the account owner can change it.

---

## Apply / re-copy Traefik apex redirect

```bash
scp deploy/traefik/crazzycars-https-apex.yaml root@VPS:/data/coolify/proxy/dynamic/crazzycars-https-apex.yaml
# file provider watches the directory — no Traefik restart required
```

### Coolify UI checklist (if rebuilding the app)

1. Domains: `crazzycars.pk`, `www.crazzycars.pk` with Let’s Encrypt  
2. Prefer the file-provider apex redirect above over Coolify’s default `redirectscheme` (307)  
3. Do **not** also enable a second HTTP→HTTPS redirect that chains through `https://www…`

## Verify (run from outside the VPS)

```bash
curl -4 -sI --max-time 12 http://crazzycars.pk/contact | grep -iE '^HTTP|^location'
curl -4 -sI --max-time 12 http://www.crazzycars.pk/ | grep -iE '^HTTP|^location'
# Optional multi-region: https://check-host.net/check-http?host=http://crazzycars.pk/contact
```

## Notes

- Coolify Traefik entrypoint names are `http` / `https`, not `web` / `websecure`.  
- Public 80/443 stay on Traefik; the Next.js container stays on the internal Docker network only.  
- Never use build-time or Next.js for HTTP→HTTPS — proxy only.  
