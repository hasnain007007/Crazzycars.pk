# Coolify Traefik access log (crazzycars.pk)

JSON access logs for agent/bot auditing. Coolify’s proxy UI can rewrite
`/data/coolify/proxy/docker-compose.yml` on re-save and **drop** these flags —
treat this doc + `scripts/check-traefik-accesslog.sh` as the source of truth.

## Exact flags (service `traefik` / container `coolify-proxy`)

Add under `command:` in `/data/coolify/proxy/docker-compose.yml`:

```yaml
- '--accesslog=true'
- '--accesslog.filepath=/traefik/logs/access.log'
- '--accesslog.format=json'
- '--accesslog.bufferingSize=100'
- '--accesslog.fields.headers.defaultmode=drop'
- '--accesslog.fields.headers.names.User-Agent=keep'
```

Host path (bind mount `/data/coolify/proxy/:/traefik`):

`/data/coolify/proxy/logs/access.log`

JSON lines include `DownstreamStatus`, `RequestPath`, and `request_User-Agent` (bots / 404s auditable).

## Host prep + logrotate

```bash
mkdir -p /data/coolify/proxy/logs
cat >/etc/logrotate.d/coolify-traefik-access <<'EOF'
/data/coolify/proxy/logs/access.log {
  daily
  rotate 30
  maxsize 200M
  compress
  delaycompress
  missingok
  notifempty
  copytruncate
}
EOF
```

## Apply / restart

```bash
mkdir -p /data/coolify/proxy/logs
docker compose -f /data/coolify/proxy/docker-compose.yml up -d
docker inspect coolify-proxy --format '{{.Config.Cmd}}' | tr ' ' '\n' | grep accesslog
curl -sI -A Googlebot https://crazzycars.pk/ | head -1
sleep 2
tail -n 3 /data/coolify/proxy/logs/access.log
```

Expect JSON lines with `DownstreamStatus` / `RequestPath` / User-Agent.

## Re-apply after Coolify proxy UI re-save

1. Open Coolify → Servers → Proxy (or equivalent Traefik / coolify-proxy settings).
2. Do **not** rely on the UI to keep custom Traefik flags.
3. SSH to the VPS and confirm:

```bash
docker inspect coolify-proxy --format '{{json .Config.Cmd}}' | grep -q accesslog \
  && echo OK || echo MISSING
```

4. If `MISSING`: edit `/data/coolify/proxy/docker-compose.yml`, re-add the four
   `--accesslog*` lines under `command:`, then:

```bash
docker compose -f /data/coolify/proxy/docker-compose.yml up -d
```

5. Re-run the verify block above.

App redeploys (store/admin) do **not** wipe `/data/coolify/proxy/`. Only proxy
UI re-saves rewrite the compose file.

## Nightly drift check

Install on the VPS (once):

```bash
install -m 755 /path/to/repo/scripts/check-traefik-accesslog.sh /usr/local/bin/check-traefik-accesslog.sh
# or copy the script contents to /usr/local/bin/

cat >/etc/cron.d/coolify-traefik-accesslog <<'EOF'
# Alert if Coolify proxy UI dropped Traefik accesslog flags
15 3 * * * root /usr/local/bin/check-traefik-accesslog.sh >>/var/log/coolify-traefik-accesslog-check.log 2>&1
EOF
```

The check exits non-zero and appends `ALERT` lines when flags are missing so a
simple log tail / monitoring hook can notice the silent revert.
