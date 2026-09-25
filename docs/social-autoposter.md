# Social Auto-Poster (crazzycars.pk)

Module lives in **storecraft-admin** (Next.js API routes + Mongoose). Public images are served by the existing storefront `/media/...` route on the shared `MEDIA_ROOT` volume (same pattern as product images).

## Architecture decisions

| Spec idea | What we did | Why |
|-----------|-------------|-----|
| Classic Express routers | Next.js App Router under `app/api/social/` | Matches this monorepo |
| `SOCIAL_MEDIA_DIR=uploads/social` | Files at `{MEDIA_ROOT}/social/<postId>/n.jpg` | Shared Coolify volume; public URL `{PUBLIC_BASE_URL}/media/social/<postId>/n.jpg` |
| In-process `node-cron` | **Planned for step 3:** HTTP cron `GET/POST /api/cron/social` (Coolify every minute) *plus* optional in-process tick. Atomic `findOneAndUpdate` lock either way | Matches existing abandoned-cart / blog crons; multi-instance safe |
| Auth | Existing JWT cookie + `canManageContent` / `canManageSettings` | Same as other content tools |
| Email alerts | Existing `lib/email.js` (Resend/SMTP) | No new mailer |

## Step status

1. **Done** — Model, image service (sharp), public media path, health + draft/upload APIs  
1b. **Done** — Temporary admin UI at `/social/test` (create draft, upload, Check URLs)  
2. Pending — Facebook + Instagram publishers + dry-run + test-post script *(wait for URL confirm)*  
3. Pending — Scheduler + retries + alerts  
4. Pending — Admin UI  
5. Pending — Week-pack import  
6. Pending — TikTok modes  

## Temporary test UI

Open **Admin → Content → Social Test** (`/social/test`):

1. Confirm media is writable.
2. **Create test post**.
3. Choose 1–4 poster images → **Upload & process**.
4. Click each public URL (must be `https://crazzycars.pk/media/social/.../n.jpg`) in a private/incognito window — no login.
5. **Check URLs** — table must show status 200 and `image/jpeg`.

Then reply OK so we continue with step 2 (Graph publish, dry-run default).

## Environment

Add to `storecraft-admin/.env` / Coolify (never commit real tokens):

```
SOCIAL_ENABLED=false
SOCIAL_DRY_RUN=true
SOCIAL_TIMEZONE=Asia/Karachi
SOCIAL_DEFAULT_SLOTS=10:00,18:00
META_GRAPH_VERSION=v23.0
META_PAGE_ID=
META_IG_USER_ID=
META_PAGE_TOKEN=
PUBLIC_BASE_URL=https://crazzycars.pk
SOCIAL_MEDIA_DIR=social
TIKTOK_MODE=off
METRICOOL_USER_TOKEN=
METRICOOL_USER_ID=
METRICOOL_BLOG_ID=
TIKTOK_CLIENT_KEY=
TIKTOK_CLIENT_SECRET=
TIKTOK_REFRESH_TOKEN=
SOCIAL_ALERT_EMAIL=
```

Aliases: `PUBLIC_BASE_URL` falls back to `MEDIA_PUBLIC_BASE_URL` / `NEXT_PUBLIC_STORE_URL`.

If `SOCIAL_ENABLED=true` but Meta IDs/token are missing, the process logs a warning and keeps the scheduler disabled (site does not crash).

## Step 1 — how to test

From a logged-in admin session (browser cookie) or with the admin JWT cookie:

```bash
# 1) Health (no secrets leaked)
curl -sS -b 'admin_token=YOUR_JWT' https://admin.crazzycars.pk/api/social/health | jq

# 2) Create draft
curl -sS -b 'admin_token=YOUR_JWT' -H 'Content-Type: application/json' \
  -d '{"title":"Test carbon set"}' \
  https://admin.crazzycars.pk/api/social/posts | jq
# → note post.id

# 3) Upload images (1–10)
curl -sS -b 'admin_token=YOUR_JWT' \
  -F 'files=@./poster1.jpg' -F 'files=@./poster2.jpg' \
  https://admin.crazzycars.pk/api/social/posts/POST_ID/images | jq
# → check uploaded[].url and probes[].ok

# 4) Open the public URL in a browser (must be https://crazzycars.pk/media/social/.../1.jpg)
#    Instagram will fetch the same URL later.

# 5) Probe URLs
curl -sS -b 'admin_token=YOUR_JWT' -H 'Content-Type: application/json' \
  -d '{"urls":["https://crazzycars.pk/media/social/POST_ID/1.jpg"]}' \
  https://admin.crazzycars.pk/api/social/health | jq
```

Locally, ensure `MEDIA_ROOT` is writable and the storefront serves `/media/*` (or admin’s `/api/media` rewrite if you use that in dev).

## Files added (step 1)

- `lib/models/SocialPost.model.js`
- `lib/social/config.js`
- `lib/social/imageService.js`
- `app/api/social/health/route.js`
- `app/api/social/posts/route.js`
- `app/api/social/posts/[id]/route.js`
- `app/api/social/posts/[id]/images/route.js`

## Replacing the Meta page token (later)

1. Meta Business → System User → Generate token with `pages_manage_posts`, `pages_read_engagement`, `instagram_basic`, `instagram_content_publish`.
2. Set `META_PAGE_TOKEN` in Coolify for admin (and restart).
3. Use health “token check” (step 4 UI) or Graph `GET /me?fields=id,name`.

## Troubleshooting (preview)

| Issue | Fix |
|-------|-----|
| Probe fails / 404 on image URL | Confirm Coolify volume mounted on **both** admin and store at same `MEDIA_ROOT` |
| Wrong content-type | Must be `image/jpeg` — we always write `.jpg` via sharp |
| Scheduler disabled warning | Fill `META_PAGE_*` or set `SOCIAL_DRY_RUN=true` for dry tests |

Week-pack format, TikTok, and Graph error codes will be expanded in later steps.
