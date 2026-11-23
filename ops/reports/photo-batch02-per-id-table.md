# Photo Batch 02 — per-ID result (2026-11-23)

**Counts:** new drafts 0 · existing gallery updates 6 · newly published 0 · held 0 · category assets 0

**Policy:** AI main+fitted (2048×2048 PNG masters) appended as non-primary gallery; live primary/OG/prices/stock/SKU/slug preserved. Mapped via `replace-list-batch2.csv` IDs 02–07 (ID 01 Aqua TRD not in this zip).

**Validation:** 12 PNG masters; media HEAD + `-800.webp` all 200; 0 cross-product dups; idempotent re-run skipped 6; primaryIsIllust=false on all 6.

**Rollback:** `ops/reports/photo-batch02-backup-before-apply.json`

**Script:** `ops/scripts/import-photo-batch-02.mjs`

| ID | Action | SKU / slug | URL | Price source | Fitment/stock | Unresolved |
|---|---|---|---|---|---|---|
| 2 | existing_gallery_append | `CC-INT-134 / suzuki-alto-2019-2026-tpe-floor-mats-premium` | https://crazzycars.pk/suzuki-alto-2019-2026-tpe-floor-mats-premium | live_preserved (sale=6999) | fitment_unverified; stock_photo_primary_retained | AI illustrations — stock/fitment not verified by these images; primary stock photo retained |
| 3 | existing_gallery_append | `CC-0203 / car-front-bumper-splitter-abs-plastic-3pcs` | https://crazzycars.pk/car-front-bumper-splitter-abs-plastic-3pcs | live_preserved (sale=4499) | fitment_unverified; stock_photo_primary_retained | Universal Batman-style splitter — vehicle fit not verified by illustration |
| 4 | existing_gallery_append | `CC-0145 / corolla-e210-grande-led-rear-reflector` | https://crazzycars.pk/corolla-e210-grande-led-rear-reflector | live_preserved (sale=1799) | fitment_unverified; stock_photo_primary_retained | E210 Grande reflector illustration — confirm bumper/facelift against stock |
| 5 | existing_gallery_append | `CC-INT-137 / honda-civic-2016-2021-tpe-floor-mats-premium` | https://crazzycars.pk/honda-civic-2016-2021-tpe-floor-mats-premium | live_preserved (sale=6999) | fitment_unverified; stock_photo_primary_retained | AI illustrations — stock/fitment not verified by these images; primary stock photo retained |
| 6 | existing_gallery_append | `CC-0281 / toyota-corolla-carbon-fiber-dashboard-trim-3pcs-lcd-2014-2026` | https://crazzycars.pk/toyota-corolla-carbon-fiber-dashboard-trim-3pcs-lcd-2014-2026 | live_preserved (sale=7499) | fitment_unverified; stock_photo_primary_retained | Carbon-look dash trim — composition not independently documented by these images |
| 7 | existing_gallery_append | `CC-COR-BBL-2 / toyota-corolla-rgb-dynamic-back-bumper-light` | https://crazzycars.pk/toyota-corolla-rgb-dynamic-back-bumper-light | live_preserved (sale=3999) | fitment_unverified; stock_photo_primary_retained | RGB bumper lamp — electrical/CANbus compatibility not verified by illustration |
