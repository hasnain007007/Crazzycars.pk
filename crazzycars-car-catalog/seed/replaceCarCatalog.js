/**
 * REPLACE the Car Catalog: delete all makes/models, insert real CrazzyCars catalog.
 *
 * YOUR SCHEMA (discovered): single `CarCatalog` collection —
 *   Make document: { name, slug, country, logo, isActive, order, models: [...] }
 *   Embedded model: { name, slug, generation, yearFrom, yearTo, years, bodyStyle,
 *                     image, nickname, isPopular, isActive }
 * There are NO separate Make / CarModel collections.
 *
 * Prefer running from the Next app (has mongoose installed):
 *   cd storecraft-store && npm run seed:car-catalog:replace
 *
 * Field mapping from data/carCatalog.js → CarCatalog:
 *   make.sortOrder  → order
 *   model.bodyType  → bodyStyle
 *   model.popular   → isPopular
 *   model.generation → generation + nickname
 */
console.log(`
This pack's seed is adapted for StoreCraft's embedded CarCatalog schema.
Run:

  cd storecraft-store
  npm run seed:car-catalog:replace

That executes: scripts/vehicles/replaceCarCatalog.mjs
`);
