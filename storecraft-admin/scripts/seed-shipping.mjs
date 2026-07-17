import mongoose from "mongoose";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env.local") });

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("Missing MONGODB_URI");
  process.exit(1);
}

const WeightRangeSchema = new mongoose.Schema(
  {
    minWeight: { type: Number, required: true },
    maxWeight: { type: Number, required: true },
    price: { type: Number, required: true },
  },
  { _id: false }
);

const FreeShippingSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: false },
    threshold: { type: Number, default: 0 },
  },
  { _id: false }
);

const ShippingSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    countries: [{ type: String, trim: true }],
    cities: [{ type: String, trim: true }],
    isDefault: { type: Boolean, default: false },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    freeShipping: { type: FreeShippingSchema, default: () => ({ enabled: false, threshold: 0 }) },
    freeShippingThreshold: { type: Number, default: 0 },
    weightRanges: { type: [WeightRangeSchema], default: [] },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const ShippingZone = mongoose.models.ShippingZone || mongoose.model("ShippingZone", ShippingSchema);

const zones = [
  {
    name: "United Kingdom",
    cities: [],
    countries: ["GB", "UK", "United Kingdom", "England", "Scotland", "Wales", "Northern Ireland"],
    isDefault: false,
    status: "active",
    // €50 free shipping threshold (display symbol); numeric values unchanged
    freeShipping: { enabled: true, threshold: 50 },
    freeShippingThreshold: 50,
    sortOrder: 1,
    weightRanges: [
      { minWeight: 0, maxWeight: 100, price: 3.99 },
      { minWeight: 101, maxWeight: 250, price: 4.99 },
      { minWeight: 251, maxWeight: 500, price: 6.99 },
      { minWeight: 501, maxWeight: 1000, price: 9.99 },
      { minWeight: 1001, maxWeight: 2000, price: 14.99 },
      { minWeight: 2001, maxWeight: 99999, price: 19.99 },
    ],
  },
  {
    name: "Europe - Zone 1",
    countries: [
      "France",
      "FR",
      "Germany",
      "DE",
      "Netherlands",
      "NL",
      "Belgium",
      "BE",
      "Ireland",
      "IE",
      "Luxembourg",
      "LU",
      "Denmark",
      "DK",
      "Austria",
      "AT",
      "Switzerland",
      "CH",
      "Portugal",
      "PT",
    ],
    cities: [],
    isDefault: false,
    status: "active",
    freeShipping: { enabled: true, threshold: 75 },
    freeShippingThreshold: 75,
    sortOrder: 2,
    weightRanges: [
      { minWeight: 0, maxWeight: 100, price: 6.99 },
      { minWeight: 101, maxWeight: 250, price: 9.99 },
      { minWeight: 251, maxWeight: 500, price: 12.99 },
      { minWeight: 501, maxWeight: 1000, price: 16.99 },
      { minWeight: 1001, maxWeight: 2000, price: 22.99 },
      { minWeight: 2001, maxWeight: 99999, price: 29.99 },
    ],
  },
  {
    name: "Europe - Zone 2",
    countries: [
      "Spain",
      "ES",
      "Italy",
      "IT",
      "Sweden",
      "SE",
      "Norway",
      "NO",
      "Finland",
      "FI",
      "Poland",
      "PL",
      "Czech Republic",
      "CZ",
      "Hungary",
      "HU",
      "Romania",
      "RO",
      "Greece",
      "GR",
      "Croatia",
      "HR",
      "Slovakia",
      "SK",
      "Slovenia",
      "SI",
      "Bulgaria",
      "BG",
      "Estonia",
      "EE",
      "Latvia",
      "LV",
      "Lithuania",
      "LT",
    ],
    cities: [],
    isDefault: false,
    status: "active",
    freeShipping: { enabled: true, threshold: 100 },
    freeShippingThreshold: 100,
    sortOrder: 3,
    weightRanges: [
      { minWeight: 0, maxWeight: 100, price: 9.99 },
      { minWeight: 101, maxWeight: 250, price: 13.99 },
      { minWeight: 251, maxWeight: 500, price: 17.99 },
      { minWeight: 501, maxWeight: 1000, price: 22.99 },
      { minWeight: 1001, maxWeight: 2000, price: 29.99 },
      { minWeight: 2001, maxWeight: 99999, price: 39.99 },
    ],
  },
  {
    name: "United States",
    countries: ["US", "USA", "United States", "United States of America"],
    cities: [],
    isDefault: false,
    status: "active",
    freeShipping: { enabled: true, threshold: 75 },
    freeShippingThreshold: 75,
    sortOrder: 4,
    weightRanges: [
      { minWeight: 0, maxWeight: 100, price: 8.99 },
      { minWeight: 101, maxWeight: 250, price: 12.99 },
      { minWeight: 251, maxWeight: 500, price: 16.99 },
      { minWeight: 501, maxWeight: 1000, price: 22.99 },
      { minWeight: 1001, maxWeight: 2000, price: 29.99 },
      { minWeight: 2001, maxWeight: 99999, price: 39.99 },
    ],
  },
  {
    name: "Canada",
    countries: ["CA", "Canada"],
    cities: [],
    isDefault: false,
    status: "active",
    freeShipping: { enabled: true, threshold: 100 },
    freeShippingThreshold: 100,
    sortOrder: 5,
    weightRanges: [
      { minWeight: 0, maxWeight: 100, price: 9.99 },
      { minWeight: 101, maxWeight: 250, price: 13.99 },
      { minWeight: 251, maxWeight: 500, price: 17.99 },
      { minWeight: 501, maxWeight: 1000, price: 24.99 },
      { minWeight: 1001, maxWeight: 2000, price: 32.99 },
      { minWeight: 2001, maxWeight: 99999, price: 44.99 },
    ],
  },
  {
    name: "Australia & New Zealand",
    countries: ["AU", "Australia", "NZ", "New Zealand"],
    cities: [],
    isDefault: false,
    status: "active",
    freeShipping: { enabled: true, threshold: 100 },
    freeShippingThreshold: 100,
    sortOrder: 6,
    weightRanges: [
      { minWeight: 0, maxWeight: 100, price: 11.99 },
      { minWeight: 101, maxWeight: 250, price: 15.99 },
      { minWeight: 251, maxWeight: 500, price: 19.99 },
      { minWeight: 501, maxWeight: 1000, price: 26.99 },
      { minWeight: 1001, maxWeight: 2000, price: 35.99 },
      { minWeight: 2001, maxWeight: 99999, price: 49.99 },
    ],
  },
  {
    name: "Rest of World",
    countries: [],
    cities: [],
    isDefault: true,
    status: "active",
    freeShipping: { enabled: false, threshold: 0 },
    freeShippingThreshold: 0,
    sortOrder: 99,
    weightRanges: [
      { minWeight: 0, maxWeight: 100, price: 14.99 },
      { minWeight: 101, maxWeight: 250, price: 19.99 },
      { minWeight: 251, maxWeight: 500, price: 24.99 },
      { minWeight: 501, maxWeight: 1000, price: 32.99 },
      { minWeight: 1001, maxWeight: 2000, price: 44.99 },
      { minWeight: 2001, maxWeight: 99999, price: 59.99 },
    ],
  },
];

await mongoose.connect(MONGODB_URI);
console.log("Connected to MongoDB");

const del = await ShippingZone.deleteMany({});
console.log("Removed existing shipping zones:", del.deletedCount);

for (const zone of zones) {
  await ShippingZone.create(zone);
  console.log("Created zone:", zone.name);
}

console.log("International shipping zones seeded!");
await mongoose.disconnect();
process.exit(0);
