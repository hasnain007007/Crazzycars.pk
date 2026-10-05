# Account deletion — manual ops (email / contact requests)

Operational checklist for humans. **Not legal text.**

Public page: `/account-deletion` (explains in-app steps + how to email).

## When a request arrives (email, contact form, WhatsApp)

1. **Verify identity** — match sender email to customer account email, or match phone used on orders. If unclear, reply asking for order number + phone (do not ask for passwords).  
2. **Prefer in-app** — if they can still sign in, ask them to use Settings → Delete account (calls `DELETE /api/mobile/v1/me`).  
3. **If they cannot use the app** — sign in to admin, locate the customer, and perform the same outcome the API would: deactivate/anonymize per current `DELETE /me` behaviour, revoke refresh tokens, remove `mobiledevices` rows for that customer. If no admin UI exists yet, use a controlled script/shell against production only after backup, or temporarily have them reset password and use the app.  
4. **Orders** — do not delete historical orders needed for fulfilment/accounting; confirm they understand orders may remain as records (point them at Privacy Policy).  
5. **Confirm** — reply that the account is closed (or explain what is still retained).  
6. **Log** — keep a short internal note (date, customer id, channel) for support history.

## Do not

- Publish passwords or tokens in email threads.  
- Run destructive Mongo updates without a recent `mongodump`.  
- Promise legal outcomes beyond what the Privacy Policy states.
