# Preview vs live (no Coolify switch)

**Date:** 2026-10-29  
**Live:** https://crazzycars.pk (Coolify `crazzycars-store` on `179.197.250.101`)  
**Code baseline on live:** effectively `main` @ `ce2792c` (former `vps-test`)  
**Candidate branch (not deployed):** `port/cod-ci-og-2026-10-29` @ `98076cf`  
**Local full Next preview:** skipped — no workstation `.env.local`; per OPS, laptop Atlas URI ≠ production.

## Method

1. Captured 20 live URLs (home, 5 products, 3 categories, 3 blogs, FAQ, shipping, checkout, + shop / cash-on-delivery / advance-payment / 4th blog / carbon-fiber).
2. Compared expected behavior of `port/cod-ci-og-2026-10-29` (code diff vs `main`) plus already-applied blog DB writes.
3. Did **not** change Coolify production image / domain routing.

## Live findings (today)

| Area | Live now | After deploying port branch |
|------|----------|-----------------------------|
| Blog bodies (11 REVIEW posts) | **Updated** (e.g. delivery post starts “One number…”) | Same (DB already written) |
| Blog `<title>` / og:title | **Updated** after metaTitle patch + store restart | Same |
| COD booking tiers in UI | 300 / 600 / 1000 present; **Rs. 10,000 → 1000** | **Rs. 10,000 → 600**; **10,001 → 1000** |
| FAQ / shipping / COD page copy | Still says **“from Rs. 250”** in places | Uses tier summary / `COD_ADVANCE_AMOUNT` (300) + body-kit category wording |
| Body kits | Title/slug match → prepaid; category page `body-kits-extensions` **404** | Also blocks category slug `body-kits*` even without “body kit” in title |
| og:site_name / og:url / og:type | Present on sampled pages (product `og:type=product` via meta) | CMS flat pages gain `og:site_name` if missing |
| Cross-brand leak | **`info@sialkotmotorsports.com`** in Settings `checkoutMessages.footerMessage` / `checkoutSuccess.footerMessage` embedded in every page payload | **Not fixed by this branch** — needs Settings DB edit (CrazzyCars email) |
| `/categories/spoilers-diffusers` & `splitters-side-skirts` | **HTTP 500** on live | Unrelated to this port; investigate separately |
| CI deploy gate | Not in live image | `scripts/assert-ci-green.sh` blocks `deploy-vps.sh` when CI red |

## Coolify steps (do not run until approved)

**Preview / staging first (recommended):**

1. Coolify → project for CrazzyCars → **New Resource** (or duplicate `crazzycars-store`) as `crazzycars-store-preview`.
2. Connect GitHub `hasnain007007/Crazzycars.pk`, branch `port/cod-ci-og-2026-10-29` (or merge to main after PR).
3. Copy env from production **except** `NEXT_PUBLIC_SITE_URL` → preview hostname (e.g. `https://preview.crazzycars.pk`). Keep `MONGODB_URI=mongodb://sialkot-mongo:27017/crazzycars_motorsports` only if intentional (shared DB). Prefer a DB clone for write-safe preview.
4. Deploy preview; re-check the 20 URLs on the preview host.
5. Confirm CI green for the deploy SHA (`./scripts/assert-ci-green.sh`).

**Production switch (later):**

1. Note current production image / commit SHA in Coolify UI (write it down).
2. Point `crazzycars-store` to the approved branch/SHA; deploy.
3. Smoke: home, 1 body-kit PDP, FAQ, shipping, checkout, 1 rewritten blog.
4. Soft-restart not enough for code; image deploy required for COD/CI/OG code.

**Rollback:**

1. Coolify → `crazzycars-store` → Deployments → redeploy previous known-good SHA (`ce2792c` / pre-switch deployment).
2. Or pin image tag from before the switch.
3. Blog content rollback (if needed): restore `/tmp/cc-blog-mongo-backup/` mongodump on VPS (`mongorestore`) or JSON backup `blog-rewrites-backup-2026-10-29T09-25-44-506Z.json`.
4. Confirm live titles/content after restore + `docker restart crazzycars-store`.

## Unsure

- No Storefront CI workflow on this repo — gate defaults to **SEO Healthcheck**, which currently runs on PRs only; open a PR to get a run URL before production deploy.
- Whether preview should share `crazzycars_motorsports` or a clone.
- Category 500s on spoilers/splitters — pre-existing live issue.
