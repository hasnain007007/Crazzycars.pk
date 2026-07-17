// One-off migration: rename brand strings in the settings document.
// Run: node scripts/rename-brand.mjs
import mongoose from "../storecraft-store/node_modules/mongoose/index.js";
import { readFileSync } from "node:fs";

const env = readFileSync(new URL("../storecraft-store/.env.local", import.meta.url), "utf8");
const uri = env.match(/^MONGODB_URI=(.+)$/m)?.[1]?.trim();
if (!uri) throw new Error("MONGODB_URI not found in storecraft-store/.env.local");

const OLD_PATTERNS = [
  [/sialkot\s*motorsports\.com/gi, "crazzycars.pk"],
  [/sialkot\s+motorsports/gi, "Crazzycars.pk"],
  [/sialkotmotorsports/gi, "crazzycars"],
];

function replaceDeep(value) {
  if (typeof value === "string") {
    let out = value;
    for (const [re, to] of OLD_PATTERNS) out = out.replace(re, to);
    return out;
  }
  if (Array.isArray(value)) return value.map(replaceDeep);
  if (value && typeof value === "object" && value.constructor === Object) {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = replaceDeep(v);
    return out;
  }
  return value;
}

await mongoose.connect(uri);
for (const name of ["settings", "banners", "homepagesettings", "pages"]) {
  const coll = mongoose.connection.db.collection(name);
  const docs = await coll.find({}).toArray();
  for (const doc of docs) {
    const { _id, ...rest } = doc;
    const updated = replaceDeep(rest);
    if (JSON.stringify(updated) !== JSON.stringify(rest)) {
      await coll.replaceOne({ _id }, updated);
      console.log(`Updated ${name} doc ${_id}`);
    }
  }
}
await mongoose.disconnect();
console.log("Done.");
