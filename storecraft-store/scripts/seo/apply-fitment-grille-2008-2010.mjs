#!/usr/bin/env node
/**
 * Grille fitment: clamp ONE product to Toyota Corolla 2008–2010.
 * Default --dry-run. --apply writes only this slug (never global clamp flag).
 *
 * Usage:
 *   node --env-file=storecraft-store/.env.local scripts/seo/apply-fitment-grille-2008-2010.mjs
 *   node --env-file=storecraft-store/.env.local scripts/seo/apply-fitment-grille-2008-2010.mjs --apply
 */
import mongoose from "mongoose";

const SLUG = "toyota-corolla-2008-2010-diamond-style-chrome-front-grille";
const PROPOSED = [{ make: "Toyota", model: "Corolla", yearFrom: 2008, yearTo: 2010 }];
const apply = process.argv.includes("--apply");

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI required");
  process.exit(1);
}

await mongoose.connect(uri);
const products = mongoose.connection.collection("products");
const doc = await products.findOne(
  { slug: SLUG },
  {
    projection: {
      slug: 1,
      name: 1,
      "vehicleCompatibility.vehicles": 1,
      compatibleCars: 1,
      status: 1,
      "pricing.regularPrice": 1,
      "pricing.salePrice": 1,
      "inventory.quantity": 1,
    },
  }
);

if (!doc) {
  console.error("Product not found:", SLUG);
  await mongoose.disconnect();
  process.exit(1);
}

const before = {
  slug: doc.slug,
  name: doc.name,
  status: doc.status,
  pricing: doc.pricing,
  inventory: doc.inventory,
  vehicles: doc.vehicleCompatibility?.vehicles || [],
  compatibleCars: doc.compatibleCars || [],
};

const afterVehicles = PROPOSED.map((v) => ({
  make: v.make,
  model: v.model,
  yearFrom: v.yearFrom,
  yearTo: v.yearTo,
}));

console.log(
  JSON.stringify(
    {
      apply,
      dryRun: !apply,
      slug: SLUG,
      before: {
        vehicleCount: before.vehicles.length,
        vehicles: before.vehicles,
        pricing: before.pricing,
        inventory: before.inventory,
        status: before.status,
      },
      after: { vehicles: afterVehicles },
      safeguards: "slug/price/stock/status untouched",
    },
    null,
    2
  )
);

if (apply) {
  const res = await products.updateOne(
    { _id: doc._id, slug: SLUG },
    {
      $set: {
        "vehicleCompatibility.vehicles": afterVehicles,
        "vehicleCompatibility.fitmentType": "specific",
      },
    }
  );
  // Verify slug/price/stock/status unchanged
  const again = await products.findOne(
    { _id: doc._id },
    {
      projection: {
        slug: 1,
        status: 1,
        "pricing.regularPrice": 1,
        "pricing.salePrice": 1,
        "inventory.quantity": 1,
        "vehicleCompatibility.vehicles": 1,
      },
    }
  );
  const ok =
    again.slug === before.slug &&
    again.status === before.status &&
    Number(again.pricing?.regularPrice) === Number(before.pricing?.regularPrice) &&
    Number(again.pricing?.salePrice || 0) === Number(before.pricing?.salePrice || 0) &&
    Number(again.inventory?.quantity ?? NaN) === Number(before.inventory?.quantity ?? NaN);
  console.log({ matched: res.matchedCount, modified: res.modifiedCount, unchangedCritical: ok, vehicles: again.vehicleCompatibility?.vehicles });
  if (!ok) {
    console.error("CRITICAL fields changed — investigate");
    process.exit(2);
  }
}

await mongoose.disconnect();
