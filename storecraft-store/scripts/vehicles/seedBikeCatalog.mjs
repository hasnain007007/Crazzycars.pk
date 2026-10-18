/**
 * Seed the Bikes store: motorcycle vehicles (Shop by Bike) and top-level bike categories.
 * Everything is written with segment: "bike", so the car store is untouched.
 *
 * Usage (from storecraft-store):
 *   node --env-file=.env.local scripts/vehicles/seedBikeCatalog.mjs           # dry run
 *   node --env-file=.env.local scripts/vehicles/seedBikeCatalog.mjs --apply   # write
 *
 * Upserts by slug; safe to run again. Categories stay hidden in the app until they have
 * products (the category API prunes empty ones), and the Bikes tab stays hidden until
 * settings.mobileApp.bikesLive is switched on.
 *
 * Models follow Pakistan sales (PAMA, Jul–Oct 2025: Honda ≈85% of units, then United,
 * Suzuki, Road Prince, Yamaha). Start years are when each model's current shape launched in
 * Pakistan; the owner should confirm them before going live. yearTo null = still on sale.
 */
import mongoose from "mongoose";
import Vehicle from "../../lib/models/Vehicle.model.js";
import Category from "../../lib/models/Category.model.js";

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
const APPLY = process.argv.includes("--apply");

export const BIKES = [
  { make: "Honda", model: "CD 70", yearFrom: 2004 },
  { make: "Honda", model: "CD 70 Dream", yearFrom: 2019 },
  { make: "Honda", model: "Pridor", yearFrom: 2012 },
  { make: "Honda", model: "CG 125", yearFrom: 2004 },
  { make: "Honda", model: "CG 125S Gold", yearFrom: 2020 },
  { make: "Honda", model: "CB 125F", yearFrom: 2021 },
  { make: "Honda", model: "CB 150F", yearFrom: 2016 },
  { make: "United", model: "US 70", yearFrom: 2010 },
  { make: "United", model: "US 125", yearFrom: 2015 },
  { make: "Suzuki", model: "GD 110S", yearFrom: 2015 },
  { make: "Suzuki", model: "GS 150", yearFrom: 2006 },
  { make: "Suzuki", model: "GR 150", yearFrom: 2017 },
  { make: "Road Prince", model: "RP 70", yearFrom: 2010 },
  { make: "Yamaha", model: "YB 125Z", yearFrom: 2016 },
  { make: "Yamaha", model: "YBR 125", yearFrom: 2015 },
  { make: "Yamaha", model: "YBR 125G", yearFrom: 2016 },
];

export const BIKE_CATEGORIES = [
  "Helmets & Riding Gear",
  "Bike Lights & Indicators",
  "Bike Mirrors",
  "Seat & Tank Covers",
  "Crash Guards & Frame Sliders",
  "Bike Mobile Holders & Chargers",
  "Chain & Engine Care",
  "Bike Covers",
  "Bike Body Kits & Stickers",
  "Bike Security & Locks",
];

export function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function bikeVehicleDoc(b, i) {
  const slug = `bike-${slugify(b.make)}-${slugify(b.model)}`;
  return {
    segment: "bike",
    make: b.make,
    model: b.model,
    generation: "",
    displayName: `${b.make} ${b.model} (${b.yearFrom}–present)`,
    yearFrom: b.yearFrom,
    yearTo: null,
    slug,
    sortOrder: i,
    isActive: true,
  };
}

async function main() {
  if (!MONGO_URI) throw new Error("MONGODB_URI is not set");
  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db.databaseName;
  console.log(`${APPLY ? "APPLY" : "DRY RUN"} on database "${db}"`);

  let vNew = 0;
  for (const [i, b] of BIKES.entries()) {
    const doc = bikeVehicleDoc(b, i);
    const exists = await Vehicle.exists({ slug: doc.slug, segment: "bike" });
    if (!exists) vNew += 1;
    console.log(`${exists ? "update" : "create"} vehicle ${doc.slug}`);
    if (APPLY) await Vehicle.updateOne({ slug: doc.slug }, { $set: doc }, { upsert: true });
  }

  let cNew = 0;
  for (const [i, name] of BIKE_CATEGORIES.entries()) {
    const slug = slugify(name);
    const exists = await Category.exists({ slug });
    if (!exists) cNew += 1;
    console.log(`${exists ? "update" : "create"} category ${slug}`);
    if (APPLY) {
      await Category.updateOne(
        { slug },
        { $set: { name, slug, segment: "bike", status: "active", sortOrder: 100 + i } },
        { upsert: true }
      );
    }
  }

  console.log(`vehicles: ${BIKES.length} (${vNew} new) · categories: ${BIKE_CATEGORIES.length} (${cNew} new)`);
  if (!APPLY) console.log("Nothing written. Re-run with --apply.");
  await mongoose.disconnect();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
