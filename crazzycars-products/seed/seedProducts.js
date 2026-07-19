/**
 * Seed all 234 CrazzyCars products into MongoDB.
 * REQUIRES categories + vehicles to be seeded FIRST.
 *
 * StoreCraft: use the adapted runner (has mongoose + field mapping):
 *   cd storecraft-store && npm run seed:products
 *
 * That script maps pack fields onto the real Product schema and resolves
 * Category / Vehicle ObjectIds by slug.
 */
console.log(`
Use the StoreCraft-adapted seed:

  cd storecraft-store
  npm run seed:categories
  npm run seed:vehicles
  npm run seed:car-catalog:replace   # optional — admin Car Catalog (embedded)
  npm run seed:products
`);
