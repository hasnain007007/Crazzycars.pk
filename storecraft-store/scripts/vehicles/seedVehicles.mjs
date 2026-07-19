/**
 * Seed vehicles into MongoDB (StoreCraft).
 * Usage: node --env-file=.env.local scripts/vehicles/seedVehicles.mjs
 */
import mongoose from "mongoose";
import { createRequire } from "module";
import Vehicle from "../../lib/models/Vehicle.model.js";

const require = createRequire(import.meta.url);
const { vehicles } = require("./vehiclesData.cjs");

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

async function run() {
  if (!MONGO_URI) {
    console.error("Set MONGO_URI or MONGODB_URI in .env.local first.");
    process.exit(1);
  }
  if (!Array.isArray(vehicles) || vehicles.length === 0) {
    console.error("No vehicles in data file.");
    process.exit(1);
  }

  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB");

  for (const v of vehicles) {
    const doc = await Vehicle.findOneAndUpdate(
      { slug: v.slug },
      { $set: { ...v, isActive: true } },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );
    console.log(`  ${doc.displayName}`);
  }

  const total = await Vehicle.countDocuments({ isActive: true });
  console.log(`\nDone. ${vehicles.length} vehicles seeded (active in DB: ${total})`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
