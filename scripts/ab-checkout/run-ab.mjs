/**
 * A/B: HEAD checkout route vs createStoreOrder adapter on two throwaway DBs.
 * Runs in-process (no child spawn) against mongodb-memory-server by default.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { register } from "node:module";
import mongoose from "mongoose";
import { seedAbFixture } from "./seed-fixture.mjs";
import { assertThrowawayMongoUri } from "./safe-uri.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
register(pathToFileURL(path.join(__dirname, "alias-loader.mjs")).href);

const storeRoot = path.resolve(__dirname, "../../storecraft-store");
const outPath = path.join(__dirname, "AB_RESULTS.json");

// lib/db.js reads MONGODB_URI at import time — set a placeholder until real URIs exist.
if (!process.env.MONGODB_URI) process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/cc_ab_placeholder";
delete process.env.RESEND_API_KEY;
delete process.env.META_CAPI_ACCESS_TOKEN;
delete process.env.META_PIXEL_ID;
delete process.env.META_CAPI_TEST_EVENT_CODE;
delete process.env.FROM_EMAIL;

function withDbName(baseUri, dbName) {
  const u = new URL(baseUri);
  u.pathname = `/${dbName}`;
  return u.toString();
}

function scrubOrderNumbersInStrings(value) {
  if (typeof value === "string") {
    return value
      .replace(/Order #[A-Z0-9-]+/gi, "Order #<ORDER_NUMBER>")
      .replace(/\bORD-\d{4}-\d+\b/g, "<ORDER_NUMBER>")
      .replace(/\bAB-\d+\b/g, "<ORDER_NUMBER>");
  }
  if (Array.isArray(value)) return value.map(scrubOrderNumbersInStrings);
  if (value && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = scrubOrderNumbersInStrings(v);
    return out;
  }
  return value;
}

function stripVolatile(doc) {
  if (!doc || typeof doc !== "object") return doc;
  const o = scrubOrderNumbersInStrings(JSON.parse(JSON.stringify(doc)));
  for (const k of [
    "_id",
    "__v",
    "createdAt",
    "updatedAt",
    "orderNumber",
    "publicAccessToken",
    "metaPurchaseEventId",
  ]) {
    delete o[k];
  }
  if (Array.isArray(o.items)) {
    o.items = o.items.map((it) => {
      const x = { ...it };
      delete x._id;
      return x;
    });
  }
  if (Array.isArray(o.statusHistory)) {
    o.statusHistory = o.statusHistory.map((h) => {
      const x = { ...h };
      delete x.changedAt;
      delete x._id;
      return x;
    });
  }
  if (Array.isArray(o.timeline)) {
    o.timeline = o.timeline.map((t) => {
      const x = { ...t };
      delete x.timestamp;
      delete x._id;
      return x;
    });
  }
  if (o.customer && typeof o.customer === "object") {
    delete o.customer.customerId;
  }
  return o;
}

function deepDiff(a, b, prefix = "") {
  const diffs = [];
  const keys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
  for (const k of keys) {
    const pathK = prefix ? `${prefix}.${k}` : k;
    const av = a?.[k];
    const bv = b?.[k];
    if (JSON.stringify(av) === JSON.stringify(bv)) continue;
    if (
      av &&
      bv &&
      typeof av === "object" &&
      typeof bv === "object" &&
      !Array.isArray(av) &&
      !Array.isArray(bv)
    ) {
      diffs.push(...deepDiff(av, bv, pathK));
    } else {
      diffs.push({ path: pathK, a: av, b: bv });
    }
  }
  return diffs;
}

function baseCartBody({ productId, quantity = 1, variantId, couponCode, paymentMethod = "cod", email, phone, name }) {
  return {
    items: [{ productId, quantity, ...(variantId ? { variantId } : {}) }],
    customer: {
      name: name || "AB Test User",
      phone: phone || "03001234567",
      email: email || "",
    },
    shippingAddress: {
      street: "123 Test Street",
      city: "Lahore",
      state: "Punjab",
      province: "Punjab",
      country: "Pakistan",
    },
    paymentMethod,
    ...(couponCode ? { couponCode } : {}),
  };
}

function makeRequest(jsonBody) {
  const map = {
    "content-type": "application/json",
    "user-agent": "ab-checkout/1.0",
    "x-forwarded-for": "127.0.0.1",
  };
  return {
    headers: {
      get: (k) => map[String(k || "").toLowerCase()] || null,
    },
    cookies: { get: () => undefined },
    json: async () => jsonBody,
    nextUrl: { searchParams: new URLSearchParams() },
  };
}

async function cloneDb(sourceUri, destUri) {
  assertThrowawayMongoUri(sourceUri, "cloneDb.source");
  assertThrowawayMongoUri(destUri, "cloneDb.dest");
  const src = await mongoose.createConnection(sourceUri).asPromise();
  const dst = await mongoose.createConnection(destUri).asPromise();
  const names = (await src.db.listCollections().toArray()).map((c) => c.name);
  for (const name of names) {
    const docs = await src.db.collection(name).find({}).toArray();
    await dst.db.collection(name).deleteMany({});
    if (docs.length) await dst.db.collection(name).insertMany(docs);
  }
  await src.close();
  await dst.close();
}

async function resetMongoose() {
  await mongoose.disconnect().catch(() => {});
  // Clear cached default connection promise used by lib/db.js
  if (global.mongoose) {
    global.mongoose.conn = null;
    global.mongoose.promise = null;
  }
}

async function runOne(handler, uri, body, label) {
  assertThrowawayMongoUri(uri, label || "runOne");
  await resetMongoose();
  process.env.MONGODB_URI = uri;
  delete process.env.RESEND_API_KEY;
  delete process.env.META_CAPI_ACCESS_TOKEN;
  delete process.env.META_PIXEL_ID;
  delete process.env.META_CAPI_TEST_EVENT_CODE;
  delete process.env.FROM_EMAIL;

  const res = await handler(makeRequest(body));
  const httpStatus = res.status || 200;
  const responseBody = await res.json();
  let orderDoc = null;
  if (httpStatus === 200 && responseBody?.orderId) {
    const { dbConnect } = await import(pathToFileURL(path.join(storeRoot, "lib/db.js")).href);
    await dbConnect();
    const Order = (await import(pathToFileURL(path.join(storeRoot, "lib/models/Order.model.js")).href))
      .default;
    orderDoc = await Order.findById(responseBody.orderId).lean();
  }
  await resetMongoose();
  return { label, httpStatus, body: responseBody, orderDoc };
}

async function main() {
  let uriA = process.env.MONGODB_URI_A;
  let uriB = process.env.MONGODB_URI_B;
  let mem;
  let fixture;
  let seedUri;

  if (!uriA || !uriB) {
    const { MongoMemoryServer } = await import("mongodb-memory-server");
    mem = await MongoMemoryServer.create();
    const base = mem.getUri();
    seedUri = withDbName(base, "cc_ab_seed");
    assertThrowawayMongoUri(seedUri, "seed");
    fixture = await seedAbFixture(seedUri);
    uriA = withDbName(base, "cc_ab_head");
    uriB = withDbName(base, "cc_ab_adapter");
    assertThrowawayMongoUri(uriA, "MONGODB_URI_A");
    assertThrowawayMongoUri(uriB, "MONGODB_URI_B");
    await cloneDb(seedUri, uriA);
    await cloneDb(seedUri, uriB);
    console.error(`[ab] memory mongo ready\n  A=${uriA}\n  B=${uriB}`);
  } else {
    assertThrowawayMongoUri(uriA, "MONGODB_URI_A");
    assertThrowawayMongoUri(uriB, "MONGODB_URI_B");
    await mongoose.connect(uriA);
    const products = mongoose.connection.db.collection("products");
    const simple =
      (await products.findOne({ slug: "ab-simple-splitter" })) ||
      (await products.findOne({ status: "active", isBulky: { $ne: true }, name: { $not: /body[-\s]?kit/i } }));
    const bulky =
      (await products.findOne({ slug: "ab-bulky-spoiler" })) || (await products.findOne({ isBulky: true }));
    const bodyKit = await products.findOne({ name: /body[-\s]?kit/i });
    const variant = await products.findOne({ "variants.0": { $exists: true } });
    const coupon = await mongoose.connection.db.collection("coupons").findOne({});
    await mongoose.disconnect();
    fixture = {
      simpleId: String(simple._id),
      bulkyId: bulky ? String(bulky._id) : null,
      bodyKitId: bodyKit ? String(bodyKit._id) : null,
      variantId: variant ? String(variant._id) : null,
      variantOptId: variant?.variants?.[0]?._id ? String(variant.variants[0]._id) : null,
      couponCode: coupon?.code || "ABTEST10",
    };
  }

  // Load handlers once (lib/db.js throws at import if MONGODB_URI missing)
  process.env.MONGODB_URI = uriA;
  delete process.env.RESEND_API_KEY;
  delete process.env.META_CAPI_ACCESS_TOKEN;
  delete process.env.META_PIXEL_ID;
  delete process.env.META_CAPI_TEST_EVENT_CODE;
  delete process.env.FROM_EMAIL;

  const { createStoreOrderFromRequest } = await import(
    pathToFileURL(path.join(storeRoot, "lib/checkout/createStoreOrder.js")).href
  );
  const headSrc = fs.readFileSync(path.join(__dirname, "head-checkout-route.js"), "utf8");
  const tmpHead = path.join(__dirname, `.tmp-head-${process.pid}.mjs`);
  fs.writeFileSync(
    tmpHead,
    headSrc + `\nexport async function runHeadCheckout(request) { return POST(request); }\n`
  );
  const headMod = await import(pathToFileURL(tmpHead).href + `?t=${Date.now()}`);
  const runHead = (req) => headMod.runHeadCheckout(req);
  const runAdapter = (req) =>
    createStoreOrderFromRequest(req, { orderSource: "site", enforceMinOrder: false });

  const cases = [
    {
      name: "simple_cod",
      body: baseCartBody({ productId: fixture.simpleId, email: "ab-guest@example.com" }),
      expectHttp: 200,
    },
    {
      name: "with_coupon",
      body: baseCartBody({
        productId: fixture.simpleId,
        couponCode: fixture.couponCode || "ABTEST10",
        email: "ab-coupon@example.com",
        phone: "03001234568",
      }),
      expectHttp: 200,
    },
    {
      name: "bulky_item",
      body: baseCartBody({
        productId: fixture.bulkyId,
        email: "ab-bulky@example.com",
        phone: "03001234569",
      }),
      expectHttp: 200,
      skip: !fixture.bulkyId,
    },
    {
      name: "body_kit_cod_block",
      body: baseCartBody({
        productId: fixture.bodyKitId,
        email: "ab-kit@example.com",
        phone: "03001234570",
      }),
      expectHttp: 400,
      skip: !fixture.bodyKitId,
    },
    {
      name: "variant_low_stock",
      body: baseCartBody({
        productId: fixture.variantId,
        variantId: fixture.variantOptId,
        quantity: 5,
        email: "ab-variant@example.com",
        phone: "03001234571",
      }),
      expectHttp: 400,
      skip: !fixture.variantId || !fixture.variantOptId,
    },
    {
      name: "guest_checkout",
      body: baseCartBody({
        productId: fixture.simpleId,
        email: "",
        phone: "03009876543",
        name: "Guest Only",
      }),
      expectHttp: 200,
    },
    {
      name: "existing_customer",
      body: baseCartBody({
        productId: fixture.simpleId,
        email: "existing-ab@example.com",
        phone: "03001112233",
        name: "Existing Customer",
      }),
      expectHttp: 200,
    },
  ];

  const results = [];
  for (const c of cases) {
    if (c.skip) {
      results.push({ name: c.name, status: "SKIP", reason: "fixture missing" });
      continue;
    }
    if (seedUri) {
      await cloneDb(seedUri, uriA);
      await cloneDb(seedUri, uriB);
    }
    console.error(`[ab] case ${c.name}…`);
    let a;
    let b;
    try {
      a = await runOne(runHead, uriA, c.body, "head");
      b = await runOne(runAdapter, uriB, c.body, "adapter");
    } catch (e) {
      results.push({ name: c.name, status: "ERROR", reason: String(e?.stack || e) });
      continue;
    }

    if (a.httpStatus !== c.expectHttp || b.httpStatus !== c.expectHttp) {
      results.push({
        name: c.name,
        status: "DIFF",
        reason: `HTTP A=${a.httpStatus} B=${b.httpStatus} expected=${c.expectHttp}`,
        aBody: a.body,
        bBody: b.body,
      });
      continue;
    }

    if (c.expectHttp !== 200) {
      const ae = a.body?.error ?? a.body;
      const be = b.body?.error ?? b.body;
      const same = JSON.stringify(ae) === JSON.stringify(be);
      results.push({
        name: c.name,
        status: same ? "PASS" : "DIFF",
        reason: same ? "error payloads match" : "error payloads differ",
        diffs: same ? [] : deepDiff({ error: ae }, { error: be }),
        a: ae,
        b: be,
      });
      continue;
    }

    const sa = stripVolatile(a.orderDoc);
    const sb = stripVolatile(b.orderDoc);
    const diffs = deepDiff(sa, sb);
    results.push({
      name: c.name,
      status: diffs.length === 0 ? "PASS" : "DIFF",
      reason:
        diffs.length === 0
          ? "order docs match (ids/timestamps/orderNumber/tokens ignored)"
          : `${diffs.length} field difference(s)`,
      diffs,
    });
  }

  try {
    fs.unlinkSync(tmpHead);
  } catch {
    /* ignore */
  }

  const report = {
    generatedAt: new Date().toISOString(),
    note: "Resend + Meta CAPI env vars cleared for both sides; Settings.seo CAPI tokens empty in fixture. Confirms order creation succeeds when unconfigured.",
    results,
  };
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));

  if (mem) await mem.stop();
  const failed = results.filter((r) => r.status === "DIFF" || r.status === "ERROR");
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
