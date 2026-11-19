# CrazzyCars.pk — Rubber Screen Protector Frames Light 10 — final report

Applied: 2026-11-19T22:41:14.872Z · batch `CC-SCREENPROT-LIGHT-10` · DB `crazzycars_motorsports`

## Outcome
- **10/10** source combinations accounted for
- **8** draft + securityHold product parents created (0 published)
- **0** existing products matched (no prior rubber screen-frame SKUs)
- **0** prices/stock invented (qty 0, sale null)
- Idempotent re-run: **10/10 colour skips**

## Why nothing was published
- Pack supplied **no prices or stock**.
- Every catalogue row has `fitment_verified: false` (AI visualisation only).
- Owner rule: publish only with verified fitment + price + stock; keep unresolved as drafts.

## Created (all draft / held)
- `byd-atto-2-rubber-infotainment-screen-protector-frame` — Black
  - Hold: catalogue fitment_verified=false — artwork is not physical-stock proof; no pack price or stock supplied
  - Intended URL (draft → public 404 until activated): https://crazzycars.pk/byd-atto-2-rubber-infotainment-screen-protector-frame
- `byd-atto-3-rubber-infotainment-screen-protector-frame` — Black
  - Hold: catalogue fitment_verified=false — artwork is not physical-stock proof; no pack price or stock supplied
  - Intended URL (draft → public 404 until activated): https://crazzycars.pk/byd-atto-3-rubber-infotainment-screen-protector-frame
- `deepal-s05-rubber-infotainment-screen-protector-frame` — Black, Orange
  - Hold: catalogue fitment_verified=false — artwork is not physical-stock proof; no pack price or stock supplied
  - Intended URL (draft → public 404 until activated): https://crazzycars.pk/deepal-s05-rubber-infotainment-screen-protector-frame
- `haval-h6-rubber-infotainment-screen-protector-frame` — Black, Orange
  - Hold: catalogue fitment_verified=false — artwork is not physical-stock proof; no pack price or stock supplied
  - Intended URL (draft → public 404 until activated): https://crazzycars.pk/haval-h6-rubber-infotainment-screen-protector-frame
- `jetour-t2-rubber-infotainment-screen-protector-frame` — Black
  - Hold: catalogue fitment_verified=false — artwork is not physical-stock proof; no pack price or stock supplied
  - Intended URL (draft → public 404 until activated): https://crazzycars.pk/jetour-t2-rubber-infotainment-screen-protector-frame
- `omoda-rubber-infotainment-screen-protector-frame` — Black **HARD HOLD**
  - Hold: exact Omoda model unspecified — keep draft; catalogue fitment_verified=false — artwork is not physical-stock proof; no matching vehicle page slug mapped yet; no pack price or stock supplied
  - Intended URL (draft → public 404 until activated): https://crazzycars.pk/omoda-rubber-infotainment-screen-protector-frame
- `tank-500-rubber-infotainment-screen-protector-frame` — Black
  - Hold: catalogue fitment_verified=false — artwork is not physical-stock proof; no matching vehicle page slug mapped yet; no pack price or stock supplied
  - Intended URL (draft → public 404 until activated): https://crazzycars.pk/tank-500-rubber-infotainment-screen-protector-frame
- `tiggo-8-and-9-pro-rubber-infotainment-screen-protector-frame` — Black **HARD HOLD**
  - Hold: supplier shared Tiggo 8 & 9 Pro grouping — common fitment not verified; catalogue fitment_verified=false — artwork is not physical-stock proof; no matching vehicle page slug mapped yet; no pack price or stock supplied
  - Intended URL (draft → public 404 until activated): https://crazzycars.pk/tiggo-8-and-9-pro-rubber-infotainment-screen-protector-frame

## Hard-held fitment
- **Omoda** — exact model unspecified
- **Tiggo 8 & 9 Pro** — shared supplier grouping; common fitment not verified

## All 10 source rows
| asset_id | model | colour | disposition | product |
|---|---|---|---|---|
| byd-atto-2--black | BYD Atto 2 | Black | create_draft | byd-atto-2-rubber-infotainment-screen-protector-frame |
| byd-atto-3--black | BYD Atto 3 | Black | create_draft | byd-atto-3-rubber-infotainment-screen-protector-frame |
| deepal-s05--black | Deepal S05 | Black | create_draft | deepal-s05-rubber-infotainment-screen-protector-frame |
| deepal-s05--orange | Deepal S05 | Orange | create_draft | deepal-s05-rubber-infotainment-screen-protector-frame |
| haval-h6--black | Haval H6 | Black | create_draft | haval-h6-rubber-infotainment-screen-protector-frame |
| haval-h6--orange | Haval H6 | Orange | create_draft | haval-h6-rubber-infotainment-screen-protector-frame |
| jetour-t2--black | Jetour T2 | Black | create_draft | jetour-t2-rubber-infotainment-screen-protector-frame |
| omoda--black | Omoda | Black | create_draft | omoda-rubber-infotainment-screen-protector-frame |
| tank-500--black | Tank 500 | Black | create_draft | tank-500-rubber-infotainment-screen-protector-frame |
| tiggo-8-9-pro--black | Tiggo 8 & 9 Pro | Black | create_draft | tiggo-8-and-9-pro-rubber-infotainment-screen-protector-frame |

## Live verification
- Draft PDPs: **404** (expected; excluded from listings/sitemap/merchant feed)
- Sitemap product entries for these slugs: **0**
- Media PNG/WebP: **200** (e.g. Deepal black PNG, orange -800.webp)
- Legacy `/haval-h6-rubber-infotainment-screen-protector` still **308** → car page (new slug uses `-frame` suffix)
- Colour→image mapping in DB: Deepal/Haval Black+Orange; others Black

## Rollback
1. Pre-import product count was **0** for this batch — delete products with tag `CC-SCREENPROT-LIGHT-10` (or restore empty from `backup.pre.json`).
2. Remove media files `spf-<asset_id>-*.png` and matching `.webp` derivatives.
3. Do not alter unrelated catalogue products.
