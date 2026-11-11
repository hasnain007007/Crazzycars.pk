# Privacy Review

- No PII in remediation reports.
- `.gitignore` blocks abandoned-cart CSV/XLSX/JSON exports under `exports/`.
- Prior PII dumps remain outside git: `~/Desktop/CCSMS-private-exports/`.
- Sync responses do not echo full customer payloads beyond tokens/status.
- Admin contact modal text: saving does not itself message customers.
- Outreach to historical recoverable carts still requires owner permission (unchanged).
