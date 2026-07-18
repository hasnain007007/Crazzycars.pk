// One-off: set the product image watermark to the new small/subtle defaults.
// Run: node scripts/update-watermark-defaults.mjs
import mongoose from "../storecraft-store/node_modules/mongoose/index.js";
import { readFileSync } from "node:fs";

const env = readFileSync(new URL("../storecraft-store/.env.local", import.meta.url), "utf8");
const uri = env.match(/^MONGODB_URI=(.+)$/m)?.[1]?.trim();
if (!uri) throw new Error("MONGODB_URI not found in storecraft-store/.env.local");

await mongoose.connect(uri);
const res = await mongoose.connection.db.collection("settings").updateMany(
  {},
  {
    $set: {
      "productImageWatermark.opacity": 0.25,
      "productImageWatermark.fontSize": 13,
      "productImageWatermark.color": "#8A8A8A",
    },
  }
);
console.log(`Updated ${res.modifiedCount} settings doc(s).`);
await mongoose.disconnect();
