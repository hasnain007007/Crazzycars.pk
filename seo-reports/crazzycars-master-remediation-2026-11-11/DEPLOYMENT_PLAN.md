# Deployment Plan

1. Owner reviews this remediation branch + `OWNER_APPROVAL_REQUIRED.md`.
2. Merge/rebase onto `vps-test` (no force-push).
3. Push `vps-test` → Coolify auto-deploy crazzycars.pk.
4. Post-deploy verify markers:
   - Org JSON-LD streetAddress = Block A6 Phase 1 Citi Housing
   - C23 double FAQ = 0
   - `/cars/honda-brv-2017-present` absent from sitemap-cars OR 200 with products
   - C8 /faq and /advance-payment PASS
   - C19 sample PASS (or documented residual unavoidable similarity)
5. Optional: apply NAP Settings dry-run after separate GO.
