#!/usr/bin/env node
/**
 * Backup Settings.storePayment + ShippingZones + product bulky-related fields.
 * Run inside store container with MONGODB_URI set.
 * Usage: node backup-shipping-advance.mjs [--out /tmp/shipping-advance-backup.json]
 */
import fs from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(
  fs.existsSync("/app/package.json") ? "/app/package.json" : process.cwd() + "/package.json"
);
const { MongoClient } = require("mongodb");

const outArg = process.argv.indexOf("--out");
const outPath =
  (outArg >= 0 && process.argv[outArg + 1]) || "/tmp/shipping-advance-backup.json";

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db();

  const collNames = (await db.listCollections().toArray()).map((c) => c.name);
  const zoneName =
    collNames.find((n) => n === "shippingzones") ||
    collNames.find((n) => /^shippingzones$/i.test(n)) ||
    collNames.find((n) => /shipping.?zone/i.test(n));

  const settings = await db
    .collection("settings")
    .find({})
    .project({ storePayment: 1, pakistaniPaymentMethods: 1, updatedAt: 1 })
    .toArray();

  const shippingZones = zoneName
    ? await db.collection(zoneName).find({}).toArray()
    : [];

  const products = await db
    .collection("products")
    .find(
      {},
      {
        projection: {
          articleNo: 1,
          slug: 1,
          name: 1,
          status: 1,
          isBulky: 1,
          categories: 1,
          codEnabled: 1,
          advancePercentRequired: 1,
        },
      }
    )
    .toArray();

  const payload = {
    createdAt: new Date().toISOString(),
    purpose: "tiered-shipping-advance-v1-prechange",
    collectionNames: collNames.filter((n) => /ship|zone|setting|product/i.test(n)),
    zoneCollection: zoneName || null,
    counts: {
      settings: settings.length,
      shippingZones: shippingZones.length,
      products: products.length,
      isBulkyTrue: products.filter((p) => p.isBulky === true).length,
    },
    settings,
    shippingZones,
    productsSnapshot: products.map((p) => ({
      _id: String(p._id),
      articleNo: p.articleNo || "",
      slug: p.slug || "",
      name: p.name || "",
      status: p.status || "",
      isBulky: p.isBulky === true,
      categories: (p.categories || []).map(String),
      codEnabled: p.codEnabled,
      advancePercentRequired: Number(p.advancePercentRequired) || 0,
    })),
  };

  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2));
  console.log(
    JSON.stringify(
      {
        ok: true,
        outPath,
        counts: payload.counts,
        zoneCollection: payload.zoneCollection,
      },
      null,
      2
    )
  );
  await client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
