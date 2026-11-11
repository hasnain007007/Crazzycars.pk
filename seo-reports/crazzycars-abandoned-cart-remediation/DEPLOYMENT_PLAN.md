# Deployment Plan (not executed)

1. Owner reviews RC on `fix/abandoned-cart-remediation-2026-11-12`.
2. Merge/fast-forward into `vps-test`.
3. Push `origin/vps-test` (triggers Coolify / `deploy-vps-test.sh`).
4. Confirm images `crazzycars-store:<sha>` and `crazzycars-admin:<sha>` healthy.
5. Controlled test: add to cart → optional drawer phone → checkout address → verify Mongo `customer` + `shippingAddress` + `checkoutStage` (read-only verify).
6. Soak 48–72h → re-run abandoned-cart coverage audit.
7. Do **not** enable soft-require phone until AC-14 owner GO.
