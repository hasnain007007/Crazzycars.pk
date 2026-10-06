# Owner publish gates (SEO / AEO readiness)

Do **not** publish or invent prices/stock/copy for these SKUs until the owner confirms:

| Article | Gate |
|---------|------|
| **CC-0240** | Draft until photos — owner confirmation before `status=active` |
| **CC-0241** | Draft until photos — owner confirmation before `status=active` |
| **CC-0257** | CN7 roof-glass profile confirmation before publish |

Admin API enforces this via `storecraft-admin/lib/productPublishGate.js`. After owner sign-off, set `ownerPublishConfirmed: true` on the product (then activate). Do not rewrite product metas from the SEO CSV import for unrelated SKUs.
