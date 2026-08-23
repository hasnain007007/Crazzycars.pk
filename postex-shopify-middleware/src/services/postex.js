"use strict";

/**
 * PostEx Merchant API client (v4.x family — paths adjustable below).
 *
 * ============================================================
 * ADJUSTING POSTEX ENDPOINTS
 * ============================================================
 * All endpoint paths and default payload field names live in ENDPOINTS
 * and CREATE_ORDER_FIELDS below. If your official PostEx PDF differs,
 * change ONLY this config object — do not edit call sites elsewhere.
 * ============================================================
 */

const { z } = require("zod");
const { prisma } = require("../utils/db");
const { logger, maskSecrets } = require("../utils/logger");

/** ---- CONFIG: edit to match your PostEx API PDF ---- */
const ENDPOINTS = {
  // GET — list operational cities
  getOperationalCities: "/services/integration/api/order/v2/get-operational-city",
  // POST — create / book a parcel
  createOrder: "/services/integration/api/order/v3/create-order",
  // GET — track one CN (append /{trackingNumber})
  trackOrder: "/services/integration/api/order/v1/track-order",
  // GET — list orders in a date range
  listOrders: "/services/integration/api/order/v1/get-all-order",
  // PUT — cancel a booked parcel
  cancelOrder: "/services/integration/api/order/v1/cancel-order",
  // GET — airway bill / invoice PDF (?trackingNumbers=CN1,CN2)
  getAirwayBill: "/services/integration/api/order/v1/get-invoice",
};

/** Field names used when building create-order payloads (for docs / sanity). */
const CREATE_ORDER_FIELDS = [
  "orderRefNumber",
  "invoicePayment",
  "orderDetail",
  "customerName",
  "customerPhone",
  "deliveryAddress",
  "transactionNotes",
  "cityName",
  "invoiceDivision",
  "items",
  "pickupAddressCode",
  "orderType",
];

const createOrderSchema = z.object({
  orderRefNumber: z.string().min(1),
  invoicePayment: z.number().min(0),
  orderDetail: z.string().min(1),
  customerName: z.string().min(1),
  customerPhone: z.string().min(10),
  deliveryAddress: z.string().min(10),
  transactionNotes: z.string().optional().default(""),
  cityName: z.string().min(1),
  invoiceDivision: z.number().optional().default(0),
  items: z.number().int().positive(),
  pickupAddressCode: z.string().min(1),
  orderType: z.string().optional().default("Normal"),
});

function baseUrl() {
  return String(process.env.POSTEX_BASE_URL || "https://api.postex.pk").replace(/\/$/, "");
}

function apiKey() {
  return String(process.env.POSTEX_API_KEY || "").trim();
}

/**
 * Low-level HTTP helper. Logs every request/response (token masked).
 * Returns { ok, status, data, error, rawText }.
 */
async function postexRequest(method, path, { query, body, expectBinary } = {}) {
  const started = Date.now();
  const url = new URL(baseUrl() + path);
  if (query && typeof query === "object") {
    for (const [k, v] of Object.entries(query)) {
      if (v != null && v !== "") url.searchParams.set(k, String(v));
    }
  }

  const headers = {
    token: apiKey(),
    Accept: expectBinary ? "application/pdf,*/*" : "application/json",
  };
  if (body != null) headers["Content-Type"] = "application/json";

  logger.info(
    {
      direction: "outbound",
      method,
      url: url.toString(),
      body: body ? maskSecrets(body) : undefined,
    },
    "PostEx request"
  );

  let status = 0;
  let rawText = "";
  let data = null;
  let error = null;

  try {
    const res = await fetch(url.toString(), {
      method,
      headers,
      body: body != null ? JSON.stringify(body) : undefined,
    });
    status = res.status;
    const durationMs = Date.now() - started;

    if (expectBinary) {
      const buf = Buffer.from(await res.arrayBuffer());
      rawText = `[binary ${buf.length} bytes]`;
      data = buf;
      const ok = res.ok;
      await safeLogApi(method, url.pathname + url.search, body, rawText, status, durationMs);
      if (!ok) {
        error = `PostEx HTTP ${status}`;
        return { ok: false, status, data: null, error, rawText };
      }
      return { ok: true, status, data: buf, error: null, rawText };
    }

    rawText = await res.text();
    try {
      data = rawText ? JSON.parse(rawText) : null;
    } catch {
      data = { raw: rawText };
    }

    await safeLogApi(method, url.pathname + url.search, body, data, status, durationMs);

    logger.info(
      {
        direction: "inbound",
        status,
        durationMs,
        body: maskSecrets(data),
      },
      "PostEx response"
    );

    if (!res.ok) {
      error =
        (data && (data.message || data.error || data.statusMessage)) ||
        `PostEx HTTP ${status}`;
      return { ok: false, status, data, error, rawText };
    }

    return { ok: true, status, data, error: null, rawText };
  } catch (e) {
    error = e.message || "Network error";
    const durationMs = Date.now() - started;
    await safeLogApi(method, path, body, { error }, status || 0, durationMs);
    logger.error({ err: e.message, path }, "PostEx network failure");
    return { ok: false, status: 0, data: null, error, rawText };
  }
}

async function safeLogApi(method, endpoint, requestBody, responseBody, statusCode, durationMs) {
  try {
    await prisma.apiLog.create({
      data: {
        direction: "outbound",
        endpoint: `${method} ${endpoint}`,
        requestBody: maskSecrets(requestBody || ""),
        responseBody: maskSecrets(responseBody || ""),
        statusCode,
        durationMs,
      },
    });
  } catch (e) {
    logger.warn({ err: e.message }, "Failed to write ApiLog");
  }
}

/** Defensive extract of tracking number from create-order response. */
function extractTrackingNumber(payload) {
  if (!payload || typeof payload !== "object") return "";
  const candidates = [
    payload?.dist?.trackingNumber,
    payload?.data?.trackingNumber,
    payload?.trackingNumber,
    payload?.dist?.trackingNo,
    payload?.data?.trackingNo,
  ];
  for (const c of candidates) {
    if (c != null && String(c).trim()) return String(c).trim();
  }
  return "";
}

async function getOperationalCities() {
  const result = await postexRequest("GET", ENDPOINTS.getOperationalCities);
  if (!result.ok) return result;

  const list =
    result.data?.dist ||
    result.data?.data ||
    result.data?.cities ||
    (Array.isArray(result.data) ? result.data : []);

  const cities = (Array.isArray(list) ? list : []).map((c) => ({
    name: String(c.operationalCityName || c.cityName || c.name || "").trim(),
    isPickup: Boolean(c.isPickupCity ?? c.isPickup),
    isDelivery: c.isDeliveryCity !== false && c.isDelivery !== false,
  })).filter((c) => c.name);

  return { ...result, data: cities };
}

async function createOrder(payload) {
  const parsed = createOrderSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false,
      status: 400,
      data: null,
      error: parsed.error.errors.map((e) => e.message).join("; "),
    };
  }
  const result = await postexRequest("POST", ENDPOINTS.createOrder, { body: parsed.data });
  if (result.ok) {
    const tn = extractTrackingNumber(result.data);
    result.trackingNumber = tn;
    if (!tn) {
      result.ok = false;
      result.error = "PostEx accepted the order but no tracking number was found in the response.";
    }
  }
  return result;
}

async function trackOrder(trackingNumber) {
  const tn = String(trackingNumber || "").trim();
  if (!tn) return { ok: false, status: 400, data: null, error: "Missing tracking number" };
  const path = `${ENDPOINTS.trackOrder}/${encodeURIComponent(tn)}`;
  return postexRequest("GET", path);
}

async function listOrders(fromDate, toDate, statusCode) {
  return postexRequest("GET", ENDPOINTS.listOrders, {
    query: {
      fromDate,
      toDate,
      statusCode: statusCode != null ? statusCode : undefined,
    },
  });
}

async function cancelOrder(trackingNumber) {
  const tn = String(trackingNumber || "").trim();
  if (!tn) return { ok: false, status: 400, data: null, error: "Missing tracking number" };
  return postexRequest("PUT", ENDPOINTS.cancelOrder, {
    body: { trackingNumber: tn },
  });
}

async function getAirwayBill(trackingNumbers) {
  const list = (Array.isArray(trackingNumbers) ? trackingNumbers : [trackingNumbers])
    .map((t) => String(t || "").trim())
    .filter(Boolean);
  if (!list.length) return { ok: false, status: 400, data: null, error: "No tracking numbers" };
  return postexRequest("GET", ENDPOINTS.getAirwayBill, {
    query: { trackingNumbers: list.join(",") },
    expectBinary: true,
  });
}

module.exports = {
  ENDPOINTS,
  CREATE_ORDER_FIELDS,
  getOperationalCities,
  createOrder,
  trackOrder,
  listOrders,
  cancelOrder,
  getAirwayBill,
  extractTrackingNumber,
  createOrderSchema,
};
