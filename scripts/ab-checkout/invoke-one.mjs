/**
 * Invoke HEAD checkout or adapter once. Prints one JSON line to stdout.
 * Args: <head|adapter> <mongodbUri> <payloadJsonPath>
 */
import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import mongoose from "mongoose";
import { assertThrowawayMongoUri } from "./safe-uri.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const storeRoot = path.resolve(__dirname, "../../storecraft-store");

const mode = process.argv[2];
const uri = process.argv[3];
const payloadPath = process.argv[4];

if (!mode || !uri || !payloadPath) {
  console.error("Usage: invoke-one.mjs <head|adapter> <uri> <payload.json>");
  process.exit(2);
}
try {
  assertThrowawayMongoUri(uri, "invoke-one");
} catch (e) {
  console.error(e.message || e);
  process.exit(2);
}

process.env.MONGODB_URI = uri;
delete process.env.RESEND_API_KEY;
delete process.env.META_CAPI_ACCESS_TOKEN;
delete process.env.META_PIXEL_ID;
delete process.env.META_CAPI_TEST_EVENT_CODE;
delete process.env.FROM_EMAIL;

const body = JSON.parse(fs.readFileSync(payloadPath, "utf8"));

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

async function main() {
  let httpStatus = 200;
  let responseBody;
  let orderDoc = null;

  if (mode === "adapter") {
    const { createStoreOrderFromRequest } = await import(
      pathToFileURL(path.join(storeRoot, "lib/checkout/createStoreOrder.js")).href
    );
    const res = await createStoreOrderFromRequest(makeRequest(body), {
      orderSource: "site",
      enforceMinOrder: false,
    });
    httpStatus = res.status || 200;
    responseBody = await res.json();
  } else if (mode === "head") {
    const headSrcPath = path.join(__dirname, "head-checkout-route.js");
    const tmp = path.join(__dirname, `.tmp-head-checkout-${process.pid}.mjs`);
    let src = fs.readFileSync(headSrcPath, "utf8");
    src += `\nexport async function runHeadCheckout(request) { return POST(request); }\n`;
    fs.writeFileSync(tmp, src);
    try {
      const mod = await import(pathToFileURL(tmp).href + `?t=${Date.now()}`);
      const res = await mod.runHeadCheckout(makeRequest(body));
      httpStatus = res.status || 200;
      responseBody = await res.json();
    } finally {
      try {
        fs.unlinkSync(tmp);
      } catch {
        /* ignore */
      }
    }
  } else {
    throw new Error(`Unknown mode ${mode}`);
  }

  if (httpStatus === 200 && responseBody?.orderId) {
    // Fresh connection — avoid stale model cache across modes in parent
    await mongoose.disconnect().catch(() => {});
    const { dbConnect } = await import(pathToFileURL(path.join(storeRoot, "lib/db.js")).href);
    await dbConnect();
    const Order = (await import(pathToFileURL(path.join(storeRoot, "lib/models/Order.model.js")).href))
      .default;
    orderDoc = await Order.findById(responseBody.orderId).lean();
    await mongoose.disconnect().catch(() => {});
  }

  process.stdout.write(JSON.stringify({ httpStatus, body: responseBody, orderDoc }));
  // Force exit — mongoose/next keep event-loop handles open under plain Node.
  process.exit(0);
}

main().catch((e) => {
  console.error(e?.stack || e);
  process.exit(1);
});
