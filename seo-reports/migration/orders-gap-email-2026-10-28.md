# Orders gap + admin email (2026-10-28)

## What the admin screen shows

- Latest: `ORD-2026-00567` today (Ahmed Safder).
- Next rows: `00566`… dated ~Oct 15 PKT (DB `createdAt` Oct 14 UTC).
- UI “All: 567” vs Mongo **597** (filter/UI delta; DB has all docs, none soft-deleted).

## Order data analysis

| window (UTC) | orders in live DB |
|---|---:|
| 2026-10-10 | 7 |
| 2026-10-11 | 10 |
| 2026-10-12 | 8 |
| 2026-10-13 | 10 |
| 2026-10-14 | 7 |
| **2026-10-15 → 2026-10-27** | **0** |
| 2026-10-28 | 1 (`00567`) |

- Order numbers `ORD-2026-00500`…`00567`: **no holes** (566 then 567). Nothing was deleted from the sequence; nothing was inserted for those days.
- Archive on VPS (`sialkot_motorsports.archive`): **408** orders (older/fewer than live).
- Old VPS `31.97.107.181`: **unreachable** (ssh timeout).
- Gap-period carts: 11 sessions on Oct 15 only, **no customer name/phone/email**, none converted.
- Gap-period invoices/receipts/loginattempts: **0**.
- Traffic: sparse `dailyvisitors` (Oct 15, 27, 28); cutover notes say migrate **2026-10-27**.

**Conclusion:** Live Mongo does not contain Oct 15–27 orders. They were never in this DB (site quiet / downtime / dump taken before those days). They cannot be fetched from any reachable backup. Recovery needs the old VPS disk, a mongodump newer than Oct 14 evening, or courier/WhatsApp/manual ledgers.

## Admin email root cause

- Settings: `emailOnNewOrder=true`, `notificationEmail=ordersatall@gmail.com`.
- `ORD-2026-00567.emailHistory` was **empty** (send never succeeded).
- Live `RESEND_API_KEY` belongs to Resend account with verified domains **imedihelp.com** + **thechaingang.eu** only.
- `FROM_EMAIL=info@crazzycars.pk` → Resend **403** “crazzycars.pk domain is not verified”.
- Sandbox `onboarding@resend.dev` → **403** only allows owner `hasssnainkamran@gmail.com`, not `ordersatall@gmail.com`.
- Adding `crazzycars.pk` to this account → **403** “domain has been registered already” (owned by **another** Resend account).

## Fix applied (interim)

- Set `FROM_EMAIL=noreply@imedihelp.com` on store + admin (same Resend key; display name still CrazzyCars.pk; `CONTACT_EMAIL` / Reply-To stays `info@crazzycars.pk`).
- Recreated `crazzycars-store` + `crazzycars-admin`; sites HTTP OK.
- Manually resent admin mail for `ORD-2026-00567` → Resend **200**; recorded in `emailHistory`.

## Permanent fix (owner)

1. Log into the Resend account that already owns **crazzycars.pk**.
2. Create API key; put it in `/data/crazzycars/runtime.env` as `RESEND_API_KEY` (store + admin recreate).
3. Set `FROM_EMAIL=info@crazzycars.pk` again.
4. Optional: set `RESEND_VERIFIED_FROM` only as emergency fallback (code supports it).
