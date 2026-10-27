/**
 * GET  /api/mobile/v1/orders — Bearer, own orders only, paginated (max 50).
 * POST /api/mobile/v1/orders — Place order (Idempotency-Key). Optional Bearer.
 * Enforces minimum order amount (enforceMinOrder:true) — web checkout unchanged.
 * Maps web {success:false,error} to mobile { error: { code, message } }.
 */
import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import IdempotencyKey from "@/lib/models/IdempotencyKey.model";
import Order from "@/lib/models/Order.model";
import Settings, { SETTINGS_SINGLETON_KEY } from "@/lib/models/Settings.model";
import { createStoreOrderFromRequest } from "@/lib/checkout/createStoreOrder";
import { optionalMobileAuth, requireMobileAuth } from "@/lib/mobile/auth";
import { ownOrdersFilter } from "@/lib/mobile/orderAccess";
import { buildOrderPaymentInstructions } from "@/lib/mobile/paymentInstructions";
import { mobileError } from "@/lib/mobile/response";
import { serializeMobileOrderSummary } from "@/lib/mobile/serializeMobileOrder";

export const dynamic = "force-dynamic";

const ORDERS_LIST_MAX = 50;
const ORDERS_LIST_DEFAULT = 20;

function parseOrdersListPagination(searchParams) {
  const page = Math.max(1, parseInt(searchParams.get("page"), 10) || 1);
  const limit = Math.min(
    ORDERS_LIST_MAX,
    Math.max(1, parseInt(searchParams.get("limit"), 10) || ORDERS_LIST_DEFAULT)
  );
  return { page, limit, skip: (page - 1) * limit };
}

function hashBody(text) {
  return createHash("sha256").update(String(text || "")).digest("hex");
}

function mapWebErrorCode(message, webCode) {
  if (webCode) return webCode;
  const m = String(message || "").toLowerCase();
  if (m.includes("cash on delivery is not available")) return "COD_NOT_AVAILABLE";
  if (m.includes("minimum order")) return "MIN_ORDER_NOT_MET";
  if (m.includes("insufficient stock")) return "OUT_OF_STOCK";
  if (m.includes("rate") || m.includes("too many")) return "RATE_LIMITED";
  if (m.includes("payment method is not available")) return "PAYMENT_METHOD_UNAVAILABLE";
  return "ORDER_ERROR";
}

export async function GET(request) {
  let authCtx;
  try {
    authCtx = await requireMobileAuth(request);
  } catch (err) {
    return mobileError(err.code || "UNAUTHORIZED", err.message, { status: err.statusCode || 401 });
  }

  const { searchParams } = new URL(request.url);
  const { page, limit, skip } = parseOrdersListPagination(searchParams);
  const customerId = authCtx.customer._id;

  await dbConnect();
  const filter = ownOrdersFilter(customerId);
  const [rows, total] = await Promise.all([
    Order.find(filter)
      .select(
        "orderNumber orderStatus paymentStatus paymentMethod pricing items createdAt shippingAddress trackingNumber tracking"
      )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Order.countDocuments(filter),
  ]);

  return NextResponse.json({
    orders: rows.map(serializeMobileOrderSummary),
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit) || 0,
      hasNext: page * limit < total,
    },
  });
}

export async function POST(request) {
  const idempotencyKeyHeader = request.headers.get("idempotency-key") || "";
  if (!idempotencyKeyHeader.trim()) {
    return mobileError("IDEMPOTENCY_KEY_REQUIRED", "Idempotency-Key header is required.", { status: 400 });
  }
  const idempotencyKey = idempotencyKeyHeader.trim().slice(0, 200);
  const scope = "mobile-orders";

  let bodyText;
  try {
    bodyText = await request.text();
  } catch {
    return mobileError("INVALID_BODY", "Could not read request body.", { status: 400 });
  }
  const requestHash = hashBody(bodyText);

  await dbConnect();

  const existing = await IdempotencyKey.findOne({ key: idempotencyKey, scope }).lean();
  if (existing) {
    if (existing.requestHash && existing.requestHash !== requestHash) {
      return mobileError(
        "IDEMPOTENCY_KEY_REUSED",
        "Idempotency-Key was already used with a different request body.",
        { status: 409 }
      );
    }
    if (existing.status === "completed" && existing.responseBody) {
      return NextResponse.json(existing.responseBody);
    }
    if (existing.status === "pending") {
      return mobileError("DUPLICATE_REQUEST", "Duplicate request in progress. Please retry in a moment.", {
        status: 409,
      });
    }
    // failed — allow retry by deleting and recreating
    await IdempotencyKey.deleteOne({ _id: existing._id });
  }

  let keyDoc;
  try {
    keyDoc = await IdempotencyKey.create({
      key: idempotencyKey,
      scope,
      status: "pending",
      requestHash,
    });
  } catch (err) {
    if (err.code === 11000) {
      const concurrentDoc = await IdempotencyKey.findOne({ key: idempotencyKey, scope }).lean();
      if (concurrentDoc?.status === "completed" && concurrentDoc.responseBody) {
        return NextResponse.json(concurrentDoc.responseBody);
      }
      return mobileError("DUPLICATE_REQUEST", "Duplicate request in progress. Please retry in a moment.", {
        status: 409,
      });
    }
    console.error("[mobile/orders] idempotency key error:", err);
    return mobileError("INTERNAL_ERROR", "Could not process request.", { status: 500 });
  }

  let linkedCustomerId = null;
  try {
    const authCtx = await optionalMobileAuth(request);
    linkedCustomerId = authCtx?.customer?._id ? String(authCtx.customer._id) : null;
  } catch {
    /* non-fatal */
  }

  const syntheticRequest = new Request(request.url, {
    method: "POST",
    headers: request.headers,
    body: bodyText,
  });

  let webResponse;
  try {
    webResponse = await createStoreOrderFromRequest(syntheticRequest, {
      orderSource: "mobile",
      enforceMinOrder: true,
      linkedCustomerId,
    });
  } catch (err) {
    console.error("[mobile/orders] createStoreOrderFromRequest threw:", err);
    await IdempotencyKey.updateOne({ _id: keyDoc._id }, { $set: { status: "failed" } });
    return mobileError("INTERNAL_ERROR", "Order processing failed. Please try again.", { status: 500 });
  }

  let webBody;
  try {
    webBody = await webResponse.clone().json();
  } catch {
    await IdempotencyKey.updateOne({ _id: keyDoc._id }, { $set: { status: "failed" } });
    return mobileError("INTERNAL_ERROR", "Order processing failed.", { status: 500 });
  }

  if (webBody.success === false) {
    const message = webBody.error || "Order could not be placed.";
    const code = mapWebErrorCode(message, webBody.code);
    await IdempotencyKey.updateOne({ _id: keyDoc._id }, { $set: { status: "failed" } });
    return NextResponse.json(
      { error: { code, message } },
      { status: webResponse.status || 400 }
    );
  }

  const settingsDoc =
    (await Settings.findOne({ singletonKey: SETTINGS_SINGLETON_KEY }).lean()) ||
    (await Settings.findOne({}).lean());

  let orderLean = null;
  try {
    orderLean = await Order.findById(webBody.orderId)
      .select(
        "orderNumber orderStatus paymentStatus paymentMethod pricing items payment shippingAddress publicAccessToken createdAt"
      )
      .lean();
  } catch {
    /* non-fatal — fall back to webBody fields */
  }

  const paymentInstructions = buildOrderPaymentInstructions(
    orderLean || {
      orderNumber: webBody.orderNumber,
      paymentMethod: orderLean?.paymentMethod || "cod",
      pricing: webBody.order?.pricing || { total: webBody.total },
      total: webBody.total,
      payment: orderLean?.payment,
    },
    settingsDoc
  );

  const responseBody = {
    orderId: webBody.orderId,
    orderNumber: webBody.orderNumber,
    accessToken: webBody.accessToken,
    total: webBody.total,
    paymentStatus: webBody.paymentStatus,
    paymentMethod: orderLean?.paymentMethod || paymentInstructions.paymentMethod,
    pricing: webBody.order?.pricing || null,
    paymentInstructions,
  };

  await IdempotencyKey.updateOne(
    { _id: keyDoc._id },
    { $set: { status: "completed", responseBody, requestHash } }
  );

  return NextResponse.json(responseBody, { status: 201 });
}
