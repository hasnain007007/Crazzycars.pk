# CrazzyCars.pk — Vehicles (Shop by Car) + SEO Pack

All 17 vehicle generations from your live Shopify store, with SEO meta built in.

## Structure
- `models/Vehicle.js` — Make → Model → Generation schema with year ranges
- `data/vehicles.js` — 17 vehicles + 5 makes, real images, Shopify IDs for product mapping
- `seed/seedVehicles.js` — run `node seed/seedVehicles.js` (needs MONGO_URI in .env)
- `routes/vehicleRoutes.js` — API for cascading dropdowns:
  - GET /api/vehicles/makes
  - GET /api/vehicles/models?make=Honda
  - GET /api/vehicles/generations?make=Honda&model=Civic
  - GET /api/vehicles/find?make=Honda&model=Civic&year=2018  ← resolves year → generation
  - GET /api/vehicles  |  GET /api/vehicles/:slug
- `seo/SEO-PLAN.md` — the full Google-ranking implementation plan
- `seo/jsonld.js` — Product / Breadcrumb / Organization / WebSite structured data
- `seo/next-sitemap-example.js` — dynamic sitemap.xml + robots.txt for Next.js

## How the filter works
User picks Honda → Civic → 2018. `/find` resolves 2018 to "Civic X (2016–2021)".
Products query: `{ $or: [{ compatibleVehicles: vehicleId }, { isUniversal: true }] }`

## Product schema fields to add (for the CSV import, next step)
```js
compatibleVehicles: [{ type: ObjectId, ref: "Vehicle" }],
isUniversal: { type: Boolean, default: false },
categories: [{ type: ObjectId, ref: "Category" }],
metaTitle: String, metaDescription: String,
```
