# AEO_AUDIT

## Strengths (existing)

- Policy FAQs grounded in `storePolicyCopy` / `store-policy` (COD, delivery, returns).
- Product FAQs gated on real VC rows (`buildGatedFitmentFaq`) — avoids inventing generations.
- Vehicle hub intros from `buildVehicleIntro` using listed products.
- Prior removal of simulated “N viewing now”.

## Issues addressed locally this session

| Issue | Fix |
| --- | --- |
| Fabricated purchase toast | Removed `FakePurchaseToast` from PDP |
| Cross-model hub answers (Alto on Swift) | Title-conflict filter so wrong SKUs do not appear as “fits this car” |

## Remaining

- C19 repetitive boilerplate still high on some PDPs (live verifier).
- FAQ density vs product-specific facts — continue ProductSpecificsPanel usage.
- Do not add `llms.txt` as a ranking tactic; existing route should stay factually accurate only.

## GEO note

Business entity: **CrazzyCars.pk**, Gujranwala dispatch, WhatsApp from store-policy. Do not invent street address / showroom hours without owner evidence.
