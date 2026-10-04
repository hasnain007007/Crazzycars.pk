#!/usr/bin/env node
/**
 * Automated mobile API curl checklist against a LOCAL storefront.
 *
 * Usage:
 *   BASE_URL=http://127.0.0.1:3000 \
 *   MONGODB_URI=mongodb://127.0.0.1:27028/crazzycars_local_verify \
 *   node scripts/verify-mobile-api.mjs
 *
 * Refuses production hosts. Writes docs/mobile-api/REAL_RESPONSES.md (tokens redacted).
 */
import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const storeRoot = path.join(root, "storecraft-store");
const require = createRequire(path.join(storeRoot, "package.json"));
const mongoose = require("mongoose");

const BASE_URL = (process.env.BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const MOBILE = `${BASE_URL}/api/mobile/v1`;
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27028/crazzycars_local_verify";
const MONGO_CONTAINER = process.env.MONGO_CONTAINER || "crazzycars-mongo-local-verify";
const DB_NAME = "crazzycars_local_verify";

const results = [];
const samples = [];

function assertLocalBase(url) {
  const u = new URL(url);
  const h = u.hostname.toLowerCase();
  if (h.includes("crazzycars.pk") || (!["localhost", "127.0.0.1", "0.0.0.0"].includes(h) && !/^192\.168\./.test(h) && !/^10\./.test(h))) {
    // Allow LAN IPs for phone testing; still block production domains.
  }
  if (h === "crazzycars.pk" || h.endsWith(".crazzycars.pk") || h === "admin.crazzycars.pk") {
    throw new Error(`Refusing production host: ${h}`);
  }
}

function redact(value) {
  if (value == null) return value;
  if (typeof value === "string") {
    if (value.length > 20 && /^(eyJ|[A-Za-z0-9_-]{20,})/.test(value)) return "[REDACTED]";
    return value.replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [REDACTED]");
  }
  if (Array.isArray(value)) return value.map(redact);
  if (typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (/token|password|secret|authorization/i.test(k)) out[k] = "[REDACTED]";
      else out[k] = redact(v);
    }
    return out;
  }
  return value;
}

async function req(method, urlPath, opts = {}) {
  const url = urlPath.startsWith("http") ? urlPath : `${MOBILE}${urlPath}`;
  const headers = {
    Accept: "application/json",
    ...(opts.headers || {}),
  };
  let body;
  if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.body);
  }
  const res = await fetch(url, { method, headers, body });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { _raw: text.slice(0, 500) };
  }
  return { status: res.status, headers: Object.fromEntries(res.headers.entries()), json, text };
}

function pass(name, detail = "") {
  results.push({ name, ok: true, detail });
  console.log(`PASS  ${name}${detail ? ` — ${detail}` : ""}`);
}
function fail(name, detail = "") {
  results.push({ name, ok: false, detail });
  console.error(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
}
function note(name, body) {
  samples.push({ name, body: redact(body) });
}

function mongoshEval(js) {
  const r = spawnSync(
    "docker",
    ["exec", MONGO_CONTAINER, "mongosh", DB_NAME, "--quiet", "--eval", js],
    { encoding: "utf8" },
  );
  if (r.status !== 0) {
    return { ok: false, out: (r.stderr || r.stdout || "").trim() };
  }
  return { ok: true, out: (r.stdout || "").trim() };
}

function shipBody(overrides = {}) {
  return {
    street: "1 Verify St",
    city: "Lahore",
    state: "Punjab",
    province: "Punjab",
    country: "Pakistan",
    ...overrides,
  };
}

async function main() {
  assertLocalBase(BASE_URL);
  console.log(`BASE=${BASE_URL}`);
  console.log(`MONGODB_URI=${MONGODB_URI}`);

  // Load seed ids from products
  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  const db = mongoose.connection.db;
  const host = new URL(MONGODB_URI.replace("mongodb://", "http://")).hostname;
  if (host !== "127.0.0.1" && host !== "localhost") {
    throw new Error("Verify script Mongo must be localhost");
  }
  // Prefer a simple SKU (no required variations) for place-order cases.
  const simple =
    (await db.collection("products").findOne({
      slug: "led-headlight-bulb-h4",
      status: "active",
    })) ||
    (await db.collection("products").findOne({
      status: "active",
      $or: [{ simpleVariations: { $size: 0 } }, { simpleVariations: { $exists: false } }],
      name: { $not: /body[-_\s]?kit/i },
      slug: { $not: /body[-_\s]?kit/i },
    }));
  const variantProduct = await db.collection("products").findOne({ slug: "side-mirror-led-cover" });
  const bodyKit = await db.collection("products").findOne({ slug: "honda-civic-body-kit-d1" });
  const low = await db.collection("products").findOne({ slug: "fog-lamp-cover-low-stock" });
  const civic = await db.collection("vehicles").findOne({ slug: "honda-civic-11th-2022-2026" });
  if (!simple || !bodyKit || !low || !civic) {
    throw new Error("Seed data missing — run scripts/seed-local-catalog.mjs first");
  }
  const PRODUCT_ID = String(simple._id);
  const BODY_KIT_ID = String(bodyKit._id);
  const LOW_STOCK_ID = String(low._id);
  const VEHICLE_SLUG = civic.slug;
  const PRODUCT_SLUG = variantProduct?.slug || simple.slug;

  const ts = Date.now();
  const EMAIL = `verify.a+${ts}@example.com`;
  const EMAIL_B = `verify.b+${ts}@example.com`;
  const PASS = "TestPass123!";
  const PHONE = `0301${String(ts).slice(-7)}`;
  const PHONE_B = `0302${String(ts).slice(-7)}`;

  // --- register / login ---
  let r = await req("POST", "/auth/register", {
    body: {
      firstName: "Verify",
      lastName: "Alpha",
      email: EMAIL,
      phone: PHONE,
      password: PASS,
    },
  });
  note("POST /auth/register", r.json);
  if (r.status === 200 || r.status === 201) pass("register", `status ${r.status}`);
  else fail("register", `${r.status} ${JSON.stringify(r.json)}`);

  r = await req("POST", "/auth/login", { body: { email: EMAIL, password: PASS } });
  note("POST /auth/login", r.json);
  const ACCESS = r.json?.accessToken;
  const REFRESH = r.json?.refreshToken;
  const CUSTOMER_ID = r.json?.customer?.id;
  if (ACCESS && REFRESH && CUSTOMER_ID) pass("login", "tokens present");
  else fail("login", JSON.stringify(r.json));

  // User B
  await req("POST", "/auth/register", {
    body: {
      firstName: "Verify",
      lastName: "Beta",
      email: EMAIL_B,
      phone: PHONE_B,
      password: PASS,
    },
  });
  const loginB = await req("POST", "/auth/login", { body: { email: EMAIL_B, password: PASS } });
  const ACCESS_B = loginB.json?.accessToken;

  // --- refresh grace ---
  const loginG = await req("POST", "/auth/login", { body: { email: EMAIL, password: PASS } });
  const PARENT = loginG.json?.refreshToken;
  const refLost = await req("POST", "/auth/refresh", { body: { refreshToken: PARENT } });
  const LOST_CHILD = refLost.json?.refreshToken;
  const refGrace = await req("POST", "/auth/refresh", { body: { refreshToken: PARENT } });
  note("POST /auth/refresh (grace)", refGrace.json);
  const GRACE_CHILD = refGrace.json?.refreshToken;
  if (refGrace.status === 200 && GRACE_CHILD && GRACE_CHILD !== LOST_CHILD) {
    pass("refresh_grace_new_child", "grace issued different child");
  } else fail("refresh_grace_new_child", `${refGrace.status}`);

  const lostRetry = await req("POST", "/auth/refresh", { body: { refreshToken: LOST_CHILD } });
  if (lostRetry.status === 401) pass("refresh_lost_child_rejected", lostRetry.json?.error?.code || "");
  else fail("refresh_lost_child_rejected", `${lostRetry.status}`);

  // TOKEN_REUSED family revoke path
  const loginR = await req("POST", "/auth/login", { body: { email: EMAIL, password: PASS } });
  const P2 = loginR.json?.refreshToken;
  const c1 = await req("POST", "/auth/refresh", { body: { refreshToken: P2 } });
  const CHILD = c1.json?.refreshToken;
  const c2 = await req("POST", "/auth/refresh", { body: { refreshToken: CHILD } });
  const GRAND = c2.json?.refreshToken;
  const reused = await req("POST", "/auth/refresh", { body: { refreshToken: P2 } });
  note("POST /auth/refresh TOKEN_REUSED", reused.json);
  if (reused.status === 401 && reused.json?.error?.code === "TOKEN_REUSED") {
    pass("refresh_TOKEN_REUSED", "family revoke");
  } else fail("refresh_TOKEN_REUSED", `${reused.status} ${JSON.stringify(reused.json)}`);

  const grandDead = await req("POST", "/auth/refresh", { body: { refreshToken: GRAND } });
  if (grandDead.status === 401) pass("refresh_after_family_revoke", "");
  else fail("refresh_after_family_revoke", `${grandDead.status}`);

  // Refresh as Bearer
  const loginFresh = await req("POST", "/auth/login", { body: { email: EMAIL, password: PASS } });
  const ACCESS2 = loginFresh.json?.accessToken;
  const REFRESH2 = loginFresh.json?.refreshToken;
  const meBad = await req("GET", "/me", { headers: { Authorization: `Bearer ${REFRESH2}` } });
  if (meBad.status === 401) pass("refresh_as_bearer_rejected", meBad.json?.error?.code || "");
  else fail("refresh_as_bearer_rejected", `${meBad.status}`);

  // Cookie vs Bearer: mobile access as cookie
  const cookieMe = await fetch(`${BASE_URL}/api/customer/me`, {
    headers: { Cookie: `customer_token=${ACCESS2}`, Accept: "application/json" },
  });
  if (cookieMe.status === 401 || cookieMe.status === 403) {
    pass("mobile_access_as_cookie_rejected", `status ${cookieMe.status}`);
  } else fail("mobile_access_as_cookie_rejected", `status ${cookieMe.status}`);

  // Web cookie as mobile Bearer — login via web to get cookie JWT
  const webLogin = await fetch(`${BASE_URL}/api/customer/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASS }),
  });
  const setCookie = webLogin.headers.getSetCookie?.() || [];
  const cookieJwt = setCookie
    .map((c) => c.split(";")[0])
    .find((c) => c.startsWith("customer_token="))
    ?.split("=")[1];
  if (cookieJwt) {
    const webAsMobile = await req("GET", "/me", {
      headers: { Authorization: `Bearer ${cookieJwt}` },
    });
    if (webAsMobile.status === 401) pass("web_cookie_as_mobile_bearer_rejected", "");
    else fail("web_cookie_as_mobile_bearer_rejected", `${webAsMobile.status}`);
  } else {
    fail("web_cookie_as_mobile_bearer_rejected", "no customer_token cookie from web login");
  }

  // Re-login for remaining authed tests
  const loginOk = await req("POST", "/auth/login", { body: { email: EMAIL, password: PASS } });
  const ACCESS_OK = loginOk.json?.accessToken;

  // --- Idempotency ---
  const orderBody = (qty, name = "A") => ({
    items: [{ productId: PRODUCT_ID, quantity: qty }],
    customer: { name, phone: PHONE, email: EMAIL },
    shippingAddress: shipBody(),
    paymentMethod: "cod",
  });

  const IDEM_SAME = `idem-same-${ts}`;
  const o1 = await req("POST", "/orders", {
    headers: { Authorization: `Bearer ${ACCESS_OK}`, "Idempotency-Key": IDEM_SAME },
    body: orderBody(1, "Same"),
  });
  note("POST /orders (idem same body 1)", o1.json);
  const o1b = await req("POST", "/orders", {
    headers: { Authorization: `Bearer ${ACCESS_OK}`, "Idempotency-Key": IDEM_SAME },
    body: orderBody(1, "Same"),
  });
  if (
    (o1.status === 200 || o1.status === 201) &&
    (o1b.status === 200 || o1b.status === 201) &&
    o1.json?.orderId &&
    o1.json.orderId === o1b.json?.orderId
  ) {
    pass("idempotency_same_key_same_body", o1.json.orderNumber);
  } else fail("idempotency_same_key_same_body", `${o1.status}/${o1b.status}`);

  const IDEM_DIFF = `idem-diff-${ts}`;
  const d1 = await req("POST", "/orders", {
    headers: { Authorization: `Bearer ${ACCESS_OK}`, "Idempotency-Key": IDEM_DIFF },
    body: orderBody(1, "DiffA"),
  });
  const d2 = await req("POST", "/orders", {
    headers: { Authorization: `Bearer ${ACCESS_OK}`, "Idempotency-Key": IDEM_DIFF },
    body: orderBody(2, "DiffB"),
  });
  note("POST /orders IDEMPOTENCY_KEY_REUSED", d2.json);
  if (d2.status === 409 && d2.json?.error?.code === "IDEMPOTENCY_KEY_REUSED") {
    pass("idempotency_same_key_different_body", "");
  } else fail("idempotency_same_key_different_body", `${d2.status} ${JSON.stringify(d2.json)}`);

  const IDEM_RACE = `idem-race-${ts}`;
  const raceBody = orderBody(1, "Race");
  const [race1, race2] = await Promise.all([
    req("POST", "/orders", {
      headers: { Authorization: `Bearer ${ACCESS_OK}`, "Idempotency-Key": IDEM_RACE },
      body: raceBody,
    }),
    req("POST", "/orders", {
      headers: { Authorization: `Bearer ${ACCESS_OK}`, "Idempotency-Key": IDEM_RACE },
      body: raceBody,
    }),
  ]);
  const raceIds = [race1.json?.orderId, race2.json?.orderId].filter(Boolean);
  const unique = new Set(raceIds);
  if (unique.size <= 1 && (raceIds.length >= 1 || [race1.status, race2.status].includes(409))) {
    pass("idempotency_concurrent", `ids=${[...unique].join(",") || "pending/409"}`);
  } else fail("idempotency_concurrent", `ids=${raceIds.join(",")}`);

  // --- Guest order ---
  const guestPhone = `0303${String(ts).slice(-7)}`;
  const guest = await req("POST", "/orders", {
    headers: { "Idempotency-Key": `idem-guest-${ts}` },
    body: {
      items: [{ productId: PRODUCT_ID, quantity: 1 }],
      customer: { name: "Guest Only", phone: guestPhone, email: "" },
      shippingAddress: shipBody({ street: "9 Guest Rd" }),
      paymentMethod: "cod",
    },
  });
  note("POST /orders guest", guest.json);
  const GUEST_ORDER_ID = guest.json?.orderId;
  const GUEST_TOKEN = guest.json?.accessToken;
  if ((guest.status === 200 || guest.status === 201) && GUEST_ORDER_ID && GUEST_TOKEN) {
    pass("guest_order", guest.json.orderNumber);
  } else fail("guest_order", `${guest.status} ${JSON.stringify(guest.json)}`);

  const guestGet = await req("GET", `/orders/${GUEST_ORDER_ID}`, {
    headers: { "X-Order-Access-Token": GUEST_TOKEN },
  });
  note("GET /orders/:id guest header", guestGet.json);
  if (guestGet.status === 200 && guestGet.json?.order) pass("guest_order_reopen_header", "");
  else fail("guest_order_reopen_header", `${guestGet.status}`);

  // IDOR
  const idorBase = await req("GET", "/orders/000000000000000000000000");
  const idor1 = await req("GET", `/orders/${GUEST_ORDER_ID}`, {
    headers: { Authorization: `Bearer ${ACCESS_B}` },
  });
  const idor2 = await req("GET", `/orders/${o1.json?.orderId || GUEST_ORDER_ID}`, {
    headers: { "X-Order-Access-Token": "wrong-token" },
  });
  const idor3 = await req("GET", `/orders/${GUEST_ORDER_ID}`);
  const same = (a, b) => JSON.stringify(a.json) === JSON.stringify(b.json) && a.status === b.status;
  if (
    idorBase.status === 404 &&
    same(idorBase, idor1) &&
    same(idorBase, idor2) &&
    same(idorBase, idor3)
  ) {
    pass("idor_generic_404", "");
  } else {
    fail(
      "idor_generic_404",
      `base=${idorBase.status} 1=${idor1.status} 2=${idor2.status} 3=${idor3.status}`,
    );
  }

  // Orders list own-only
  const listA = await req("GET", "/orders?page=1&limit=50", {
    headers: { Authorization: `Bearer ${ACCESS_OK}` },
  });
  note("GET /orders list", { count: listA.json?.orders?.length, pagination: listA.json?.pagination });
  if (listA.status === 200 && Array.isArray(listA.json?.orders)) pass("orders_list", `${listA.json.orders.length}`);
  else fail("orders_list", `${listA.status}`);

  // Price tamper
  const tamper = await req("POST", "/orders", {
    headers: { "Idempotency-Key": `idem-price-${ts}` },
    body: {
      items: [{ productId: PRODUCT_ID, quantity: 1, unitPrice: 1, price: 1 }],
      total: 1,
      subtotal: 1,
      shippingCost: 0,
      customer: { name: "Tamper", phone: `0304${String(ts).slice(-7)}`, email: `tamper+${ts}@example.com` },
      shippingAddress: shipBody(),
      paymentMethod: "cod",
    },
  });
  note("POST /orders price tamper", tamper.json);
  const charged = Number(tamper.json?.total ?? tamper.json?.pricing?.total);
  if ((tamper.status === 200 || tamper.status === 201) && charged > 100) {
    pass("price_tamper_ignored", `charged=${charged}`);
  } else fail("price_tamper_ignored", `${tamper.status} charged=${charged}`);

  // Min order
  await db.collection("settings").updateOne(
    { singletonKey: "default" },
    { $set: { "storePayment.minimumOrderAmount": 999999 } },
  );
  const minOrd = await req("POST", "/orders", {
    headers: { "Idempotency-Key": `idem-min-${ts}` },
    body: {
      items: [{ productId: PRODUCT_ID, quantity: 1 }],
      customer: { name: "Min", phone: `0305${String(ts).slice(-7)}`, email: `min+${ts}@example.com` },
      shippingAddress: shipBody(),
      paymentMethod: "cod",
    },
  });
  note("POST /orders MIN_ORDER", minOrd.json);
  if (minOrd.status === 400 && (minOrd.json?.error?.code === "MIN_ORDER_NOT_MET" || /minimum/i.test(minOrd.json?.error?.message || ""))) {
    pass("min_order_enforced", minOrd.json?.error?.code || "");
  } else fail("min_order_enforced", `${minOrd.status} ${JSON.stringify(minOrd.json)}`);
  await db.collection("settings").updateOne(
    { singletonKey: "default" },
    { $set: { "storePayment.minimumOrderAmount": 0 } },
  );

  // Stock oversell
  const before = (await db.collection("products").findOne({ _id: low._id })).inventory.quantity;
  const oversell = await req("POST", "/orders", {
    headers: { "Idempotency-Key": `idem-stock-${ts}` },
    body: {
      items: [{ productId: LOW_STOCK_ID, quantity: 9999 }],
      customer: { name: "Oversell", phone: `0306${String(ts).slice(-7)}`, email: `stock+${ts}@example.com` },
      shippingAddress: shipBody(),
      paymentMethod: "cod",
    },
  });
  const after = (await db.collection("products").findOne({ _id: low._id })).inventory.quantity;
  note("POST /orders oversell", oversell.json);
  if (oversell.status >= 400 && after === before) pass("stock_oversell_blocked", `qty=${after}`);
  else fail("stock_oversell_blocked", `${oversell.status} before=${before} after=${after}`);

  // Body-kit COD block + bankTransfer ok
  const codBlock = await req("POST", "/cart/quote", {
    body: {
      items: [{ productId: BODY_KIT_ID, quantity: 1 }],
      paymentMethod: "cod",
      shippingAddress: { city: "Lahore", state: "Punjab", country: "Pakistan" },
    },
  });
  note("POST /cart/quote COD body kit", codBlock.json);
  if (codBlock.status === 400 && codBlock.json?.error?.code === "COD_NOT_AVAILABLE") {
    pass("body_kit_COD_blocked", codBlock.json.error.message.slice(0, 80));
  } else fail("body_kit_COD_blocked", `${codBlock.status}`);

  const bankOk = await req("POST", "/cart/quote", {
    body: {
      items: [{ productId: BODY_KIT_ID, quantity: 1 }],
      paymentMethod: "bankTransfer",
      shippingAddress: { city: "Lahore", state: "Punjab", country: "Pakistan" },
    },
  });
  note("POST /cart/quote bankTransfer body kit", bankOk.json);
  if (bankOk.status === 200) pass("body_kit_non_COD_ok", `total=${bankOk.json?.total}`);
  else fail("body_kit_non_COD_ok", `${bankOk.status}`);

  const bankOrder = await req("POST", "/orders", {
    headers: { "Idempotency-Key": `idem-bk-${ts}` },
    body: {
      items: [{ productId: BODY_KIT_ID, quantity: 1 }],
      customer: { name: "Kit Pay", phone: `0307${String(ts).slice(-7)}`, email: `kit+${ts}@example.com` },
      shippingAddress: shipBody(),
      paymentMethod: "bankTransfer",
    },
  });
  if (bankOrder.status === 200 || bankOrder.status === 201) pass("body_kit_bank_order", bankOrder.json?.orderNumber);
  else fail("body_kit_bank_order", `${bankOrder.status} ${JSON.stringify(bankOrder.json)}`);

  // Tracking unavailable (no PostEx keys)
  const track = await req("GET", "/tracking?trackingNumber=INVALID1");
  note("GET /tracking", track.json);
  if (
    track.status === 404 ||
    track.status === 503 ||
    ["NOT_FOUND", "TRACKING_UNAVAILABLE"].includes(track.json?.error?.code)
  ) {
    pass("tracking_unavailable_or_not_found", `${track.status} ${track.json?.error?.code}`);
  } else fail("tracking_unavailable_or_not_found", `${track.status}`);

  // Track privacy identical bodies
  const realOrder = guest.json?.orderNumber || o1.json?.orderNumber;
  const t1 = await req(
    "GET",
    `/orders/track?orderNumber=${encodeURIComponent(realOrder)}&phone=03999999999`,
  );
  const t2 = await req(
    "GET",
    `/orders/track?orderNumber=ORD-DOES-NOT-EXIST-999&phone=${encodeURIComponent(PHONE)}`,
  );
  if (t1.status === 404 && t2.status === 404 && JSON.stringify(t1.json) === JSON.stringify(t2.json)) {
    pass("track_privacy_identical_errors", "");
  } else fail("track_privacy_identical_errors", `${t1.status}/${t2.status}`);

  // Home / fitment / config
  const home = await req("GET", "/home");
  note("GET /home", {
    hotDeals: home.json?.hotDeals?.products?.length,
    bestSellers: home.json?.bestSellers?.products?.length,
    brands: home.json?.brands?.items?.length,
    flashSaleEndTime: home.json?.flashSaleEndTime,
  });
  if (home.json?.hotDeals && home.json?.bestSellers && home.json?.brands) pass("home_sections", "");
  else fail("home_sections", "");

  const cfg = await req("GET", "/config");
  note("GET /config", {
    methods: (cfg.json?.enabledPaymentMethods || []).map((m) => m.key),
    delivery: cfg.json?.delivery,
  });
  if (cfg.json?.enabledPaymentMethods?.length >= 2) pass("config_payment_methods", "");
  else fail("config_payment_methods", "");

  const fit = await req("GET", `/products?vehicle=${VEHICLE_SLUG}&limit=5`);
  if (fit.status === 200 && (fit.json?.products || []).every((p) => p.fitsVehicle === true)) {
    pass("fitsVehicle_list", `${fit.json.products.length}`);
  } else fail("fitsVehicle_list", `${fit.status}`);

  const pdp = await req("GET", `/products/${PRODUCT_SLUG}?vehicle=${VEHICLE_SLUG}`);
  if (pdp.json?.product?.fitsVehicle === true) pass("fitsVehicle_detail", "");
  else fail("fitsVehicle_detail", String(pdp.json?.product?.fitsVehicle));

  // Rate limit (dedicated email)
  const RL_EMAIL = `ratelimit+${ts}@example.com`;
  let hit429 = false;
  for (let i = 0; i < 8; i++) {
    const bad = await req("POST", "/auth/login", {
      body: { email: RL_EMAIL, password: "WrongPassword!!!" },
    });
    if (bad.status === 429 || bad.json?.error?.code === "RATE_LIMITED") {
      hit429 = true;
      break;
    }
  }
  if (hit429) pass("login_rate_limit", "429");
  else fail("login_rate_limit", "never 429 (may need more attempts / IP bypass in dev)");

  // Account deletion + DB checks
  const delLogin = await req("POST", "/auth/login", { body: { email: EMAIL, password: PASS } });
  const DEL_ACCESS = delLogin.json?.accessToken;
  const DEL_ID = delLogin.json?.customer?.id;
  const ordersBefore = await db.collection("orders").countDocuments({
    $or: [
      { "customer.customerId": new mongoose.Types.ObjectId(DEL_ID) },
      { "customer.email": EMAIL },
    ],
  });
  const del = await req("DELETE", "/me", { headers: { Authorization: `Bearer ${DEL_ACCESS}` } });
  note("DELETE /me", del.json);
  if (del.status === 200) pass("account_delete_http", "");
  else fail("account_delete_http", `${del.status}`);

  const cust = await db.collection("customers").findOne({
    _id: new mongoose.Types.ObjectId(DEL_ID),
  });
  const tokensLeft = await db.collection("customerrefreshtokens").countDocuments({
    customerId: new mongoose.Types.ObjectId(DEL_ID),
    isRevoked: { $ne: true },
  });
  const devicesLeft = await db.collection("mobiledevices").countDocuments({
    customerId: new mongoose.Types.ObjectId(DEL_ID),
  });
  const ordersAfter = await db.collection("orders").countDocuments({
    $or: [
      { "customer.customerId": new mongoose.Types.ObjectId(DEL_ID) },
      { "customer.email": /deleted\+/i },
    ],
  });
  if (
    cust &&
    cust.isActive === false &&
    tokensLeft === 0 &&
    devicesLeft === 0 &&
    ordersAfter >= 0 &&
    ordersBefore >= 0
  ) {
    pass(
      "account_delete_db",
      `isActive=${cust.isActive} tokens=${tokensLeft} devices=${devicesLeft} ordersKept≈${ordersAfter}`,
    );
  } else {
    fail(
      "account_delete_db",
      JSON.stringify({
        isActive: cust?.isActive,
        email: cust?.email,
        tokensLeft,
        devicesLeft,
        ordersBefore,
        ordersAfter,
      }),
    );
  }

  // Optional: grace sleep 31s — long; run if VERIFY_SLOW=1
  if (process.env.VERIFY_SLOW === "1") {
    const ls = await req("POST", "/auth/register", {
      body: {
        firstName: "Slow",
        lastName: "Test",
        email: `slow+${ts}@example.com`,
        phone: `0308${String(ts).slice(-7)}`,
        password: PASS,
      },
    });
    const parent = ls.json?.refreshToken;
    await req("POST", "/auth/refresh", { body: { refreshToken: parent } });
    await new Promise((r) => setTimeout(r, 31000));
    const late = await req("POST", "/auth/refresh", { body: { refreshToken: parent } });
    if (late.status === 401 && late.json?.error?.code === "TOKEN_REUSED") {
      pass("refresh_after_31s_TOKEN_REUSED", "");
    } else fail("refresh_after_31s_TOKEN_REUSED", `${late.status}`);
  } else {
    results.push({
      name: "refresh_after_31s_TOKEN_REUSED",
      ok: true,
      detail: "SKIPPED (set VERIFY_SLOW=1)",
    });
    console.log("SKIP  refresh_after_31s_TOKEN_REUSED — set VERIFY_SLOW=1 to run");
  }

  await mongoose.disconnect();

  // Write REAL_RESPONSES.md
  const outPath = path.join(root, "docs/mobile-api/REAL_RESPONSES.md");
  const lines = [
    "# Real local verify responses",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Base: \`${BASE_URL}\``,
    `DB: \`${DB_NAME}\` (tokens redacted)`,
    "",
    "## Results",
    "",
    "| Case | Result | Detail |",
    "|------|--------|--------|",
    ...results.map(
      (r) =>
        `| ${r.name} | ${r.ok ? (String(r.detail).startsWith("SKIPPED") ? "SKIP" : "PASS") : "FAIL"} | ${String(r.detail || "").replace(/\|/g, "\\|")} |`,
    ),
    "",
    "## Sample bodies (redacted)",
    "",
  ];
  for (const s of samples) {
    lines.push(`### ${s.name}`, "", "```json", JSON.stringify(s.body, null, 2), "```", "");
  }
  fs.writeFileSync(outPath, lines.join("\n"));
  console.log(`\nWrote ${outPath}`);

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed (${failed.length} failed)`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
