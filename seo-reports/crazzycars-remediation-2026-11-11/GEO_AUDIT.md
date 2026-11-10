# GEO_AUDIT

## Entity consistency (code / policy)

| Fact | Source |
| --- | --- |
| Brand | CrazzyCars.pk (`lib/brand`) |
| Dispatch city | Gujranwala (`store-policy`) |
| WhatsApp | `STORE_POLICY.contact.whatsapp` |
| Currency | PKR |
| COD / shipping fees | `store-policy` + checkout code |

## Risks

- City landing pages must not become doorway duplicates — existing `cityLandingPages.js` has city-specific copy; audit uniqueness in later pass.
- No invented physical showroom address in Organization schema without evidence.

## AI visibility testing

Matrix file: `AI_VISIBILITY_TEST_MATRIX.csv` — prompts prepared; live AI citations **not** collected (tools not available / do not invent).
