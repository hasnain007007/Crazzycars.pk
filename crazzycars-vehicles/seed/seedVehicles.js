/**
 * Seed CrazzyCars vehicles (Shop by Car) into MongoDB
 * ---------------------------------------------------
 * Usage:  node seed/seedVehicles.js   (needs MONGO_URI in .env)
 * Safe to run multiple times — upserts by slug.
 */
require("dotenv").config();
const mongoose = require("mongoose");
const Vehicle = require("../models/Vehicle");
const { vehicles } = require("../data/vehicles");

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

async function run() {
  if (!MONGO_URI) {
    console.error("❌ Set MONGO_URI in your .env file first.");
    process.exit(1);
  }

  await mongoose.connect(MONGO_URI);
  console.log("✅ Connected to MongoDB");

  for (const v of vehicles) {
    const doc = await Vehicle.findOneAndUpdate(
      { slug: v.slug },
      { $set: v },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    console.log(`  🚗 ${doc.displayName}`);
  }

  const total = await Vehicle.countDocuments();
  console.log(`\n🎉 Done. ${vehicles.length} vehicles seeded (total in DB: ${total})`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("❌ Seed failed:", err.message);
  process.exit(1);
});
