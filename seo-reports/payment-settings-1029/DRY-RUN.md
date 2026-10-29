# PAYMENT-SETTINGS dry-run → apply

**GRANTED:** `PAYMENT-SETTINGS`  
**Live DB:** `crazzycars_motorsports` (store container URI FP `187aad8c44fe3a84`)  
**Docs FP `84143ac0cb2c3085`:** `mongodb://sialkot-mongo:27017/sialkot_motorsports` (legacy name on same VPS host — not written)  
**Atlas never:** `317ae4de8eb24f84`

## Planned `$set` (field-level only)

```js
{
  "storePayment.advancePaymentDiscountPercent": 4,  // was 2
  "pakistaniPaymentMethods.easypaisa.enabled": true,
  "pakistaniPaymentMethods.easypaisa.accountNumber": "<owner number>",
  "pakistaniPaymentMethods.easypaisa.accountName": "Hussnain Kamran"
}
```

## Applied

| field | before | after |
|---|---|---|
| `storePayment.advancePaymentDiscountPercent` | 2 | **4** |
| `pakistaniPaymentMethods.easypaisa.*` | — | **BLOCKED** — owner message used literal `<EASYPAISA_NUMBER>` (no digits). Will not invent. |

## Dump / scratch

- Dump: `/data/crazzycars/mongo/payment-settings-20261029T091235Z/crazzycars_motorsports.archive.gz`
- Scratch restore: OK (95052 docs), then dropped
