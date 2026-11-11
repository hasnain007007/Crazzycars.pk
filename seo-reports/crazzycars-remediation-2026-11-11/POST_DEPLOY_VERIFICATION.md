# POST_DEPLOY_VERIFICATION

Run **only after** owner approves the exact release SHA and Coolify finishes the storefront deploy.  
Do **not** apply Mongo M1–M4 in this window.

## 0. Prove the deployed commit

1. Coolify → `crazzycars-store` → confirm deployed git SHA equals the approved SHA.  
2. Optional: container env / build metadata if exposed.  
3. Fail the verification if SHA mismatch — do not proceed to smoke.

## 1. HTTP + behaviour checks

| Area | Expectation |
| --- | --- |
| Homepage | 200 |
| Shop | 200 |
| Splitters & Side Skirts | 200; **no** steering-trim / ducktail SKUs |
| Suzuki Swift vehicle page | 200; **no** Alto 660cc fender; Swift SKUs remain |
| Corolla monogram | Present on Corolla hubs; **absent** on Aqua/Vitz/Yaris hubs |
| Product detail | 200; **no** fake purchase toast |
| HUD category `/categories/car-hud` | 308/301 → `/car-heads-up-display-hud` **200** |
| Sitemap | 200 |
| Canonicals | `/products/…` → flat; www→apex as before |
| Cart | Existing redirect/behaviour; drawer still adds lines |
| Checkout | Page 200; totals still compute (no live payment) |
| `/api/health` | `ok`, `db: ok`, `storecraft-store` |

## 2. Immediate rollback triggers

- Health `db` not ok  
- Checkout 5xx  
- Swift hub empty or Splitters shelf empty  
- Add-to-cart broken  
- Unrelated VPS apps impacted  

Execute `ROLLBACK_PLAN.md` → redeploy `0df2d2f`.
