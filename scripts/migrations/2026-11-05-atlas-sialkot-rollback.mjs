#!/usr/bin/env node
/**
 * Targeted rollback for the accidental --apply against Atlas sialkot_motorsports
 * (cluster0.yg8dcwr) performed 2026-11-04 during website-issues work.
 *
 * Context:
 * - Live CrazzyCars uses VPS sialkot-mongo / crazzycars_motorsports (UNTOUCHED by that apply).
 * - Live sialkot-store uses VPS sialkot-mongo / sialkot_motorsports (also UNTOUCHED).
 * - Local storecraft-store/.env.local pointed at Atlas sialkot_motorsports — that is what was written.
 * - Atlas sialkot_motorsports is NOT the intended CrazzyCars test DB for this task.
 *
 * Default: dry-run. Apply: --apply
 * Only restores the 6 known records to pre-apply values. No other documents touched.
 */
import { readFileSync, existsSync } from "fs";
import { resolve, dirname, join } from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const requireFromStore = createRequire(join(ROOT, "storecraft-store/package.json"));
const mongoose = requireFromStore("mongoose");

const APPLY = process.argv.includes("--apply");
const uriArg = process.argv.find((a) => a.startsWith("--uri="))?.slice(6);

function loadEnvUri() {
  const p = join(ROOT, "storecraft-store/.env.local");
  if (!existsSync(p)) return process.env.MONGODB_URI || "";
  const line = readFileSync(p, "utf8").split("\n").find((l) => l.startsWith("MONGODB_URI="));
  return line ? line.slice(12).replace(/^["']|["']$/g, "") : "";
}

/** Exact pre-apply values captured from migration dry-run / apply log. */
const ROLLBACK = {
  vehicles: [
    {
      slug: "toyota-prius-2004-2009",
      metaDescription:
        "Shop Toyota Prius accessories in Pakistan at CrazzyCars.pk — Cash on Delivery nationwide.",
    },
    {
      slug: "toyota-prius-2009-2015",
      metaDescription:
        "Shop Toyota Prius accessories in Pakistan at CrazzyCars.pk — Cash on Delivery nationwide.",
    },
    {
      slug: "toyota-prius-2016-2022",
      metaDescription: "Shop Toyota Prius accessories in Pakistan. Cash on Delivery.",
    },
  ],
  settingsAdvanceMessage:
    "Important: You must pay the delivery charges of {amount} in advance to confirm your Cash on Delivery order.\n\nAfter paying, send the payment screenshot on WhatsApp: {whatsapp}",
  /** Re-attach door-handle-covers (exterior child) that was removed. */
  productsRestoreDoorHandleCovers: [
    "toyota-corolla-x-carbon-fiber-interior-door-handle-panels-2014-2026",
    "toyota-corolla-carbon-fiber-interior-door-panels-4pcs-2014-2026",
  ],
};

const URI = uriArg || loadEnvUri();
if (!URI) {
  console.error("No MONGODB_URI");
  process.exit(1);
}

await mongoose.connect(URI, { serverSelectionTimeoutMS: 20000 });
const db = mongoose.connection.db;
const hostDb = URI.replace(/\/\/[^@]+@/, "//***@").split("?")[0];
console.log(JSON.stringify({ mode: APPLY ? "APPLY" : "DRY-RUN", db: db.databaseName, hostDb }, null, 2));

if (db.databaseName !== "sialkot_motorsports") {
  console.error("Refusing: expected database sialkot_motorsports, got", db.databaseName);
  await mongoose.disconnect();
  process.exit(2);
}

const report = { vehicles: [], products: [], settings: null };

for (const row of ROLLBACK.vehicles) {
  const v = await db.collection("vehicles").findOne({ slug: row.slug });
  if (!v) {
    report.vehicles.push({ slug: row.slug, status: "missing" });
    continue;
  }
  const change = String(v.metaDescription || "") !== row.metaDescription;
  report.vehicles.push({
    slug: row.slug,
    change,
    current: String(v.metaDescription || "").slice(0, 120),
    restoreTo: row.metaDescription.slice(0, 120),
  });
  if (APPLY && change) {
    await db.collection("vehicles").updateOne(
      { _id: v._id },
      { $set: { metaDescription: row.metaDescription, updatedAt: new Date() } }
    );
  }
}

const dhc = await db.collection("categories").findOne({ slug: "door-handle-covers" });
for (const slug of ROLLBACK.productsRestoreDoorHandleCovers) {
  const p = await db.collection("products").findOne({ slug });
  if (!p || !dhc) {
    report.products.push({ slug, status: "missing" });
    continue;
  }
  const ids = (p.categories || []).map(String);
  const has = ids.includes(String(dhc._id));
  report.products.push({
    slug,
    change: !has,
    action: has ? "already-has-door-handle-covers" : "add-door-handle-covers",
  });
  if (APPLY && !has) {
    await db.collection("products").updateOne(
      { _id: p._id },
      { $addToSet: { categories: dhc._id }, $set: { updatedAt: new Date() } }
    );
  }
}

const settings = await db.collection("settings").findOne({});
if (settings) {
  const cur = String(settings.storePayment?.advancePaymentMessage || "");
  const change = cur !== ROLLBACK.settingsAdvanceMessage;
  report.settings = {
    change,
    current: cur.slice(0, 140),
    restoreTo: ROLLBACK.settingsAdvanceMessage.slice(0, 140),
  };
  if (APPLY && change) {
    await db.collection("settings").updateOne(
      { _id: settings._id },
      {
        $set: {
          "storePayment.advancePaymentMessage": ROLLBACK.settingsAdvanceMessage,
          updatedAt: new Date(),
        },
      }
    );
  }
}

console.log(JSON.stringify(report, null, 2));
console.log(APPLY ? "\nRollback applied." : "\nDry-run only. Re-run with --apply to restore Atlas sialkot_motorsports.");
await mongoose.disconnect();
