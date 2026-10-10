# Shipping notes (mobile + web shared libs)

Read-only operational notes — **no code changes** implied by this file.

## Province-set quotes ignore weight tiers

When a quote/order request includes a **province** (or `state`), zone selection uses
`quoteShippingByProvince`. In the live catalog both active zones (`KG` and
`Pujab Zone`) list **all** provinces, so the first matching non-default zone
(`KG`) wins.

That province path takes the zone’s **first weight-tier rate** and does **not**
walk higher weight bands. Practical effect: a heavy cart with
`province=Punjab` still ships at the light KG tier (Rs.250), while a city-only
lookup (no province) can hit weight tiers on the default zone.

This behavior is shared by local and production — not a mobile-only drift.

## Bulky floor Rs.500: quote/order only

`applyShippingRules` / `shippingFloorPKR(hasBulky)` apply the **Rs.500 bulky
floor** on:

- `POST /api/mobile/v1/cart/quote`
- store checkout / `createStoreOrder`

They are **not** applied in `GET/POST /api/shipping/calculate`, which returns
the raw zone quote only. Comparing calculate vs cart quote for a bulky cart
will differ by design (e.g. calculate 250 vs quote/order 500).
