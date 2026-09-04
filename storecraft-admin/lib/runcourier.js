/**
 * Run Courier merchant API client (courier aggregator).
 * Portal: https://portal.runcourier.com — Select API routes to Trax, M&P, TCS, etc.
 *
 * Endpoint paths are configurable via settings until official docs are wired.
 * Auth: Bearer token from RUN_COURIER_API_KEY or settings.courier.runCourierApiKey.
 */

import { storefrontTrackingUrl } from "@/lib/postex";

export { storefrontTrackingUrl };

/** Default Select API carriers shown in the portal dropdown. */
export const RUN_COURIER_APIS = [
  "Auto",
  "Trax",
  "M&P",
  "TCS",
  "Leopard2",
  "Daewoo",
  "Dastaq Logistics",
  "AHL",
];

export const RUN_COURIER_PRODUCT_TYPES = ["Overnight", "OverLand"];
export const RUN_COURIER_SERVICE_TYPES = ["Overnight", "OverLand"];

export const RUN_COURIER_DEFAULT_BASE = "https://portal.runcourier.com";

/** Default REST path suffixes — override via settings.courier.runCourier*Path */
export const RUN_COURIER_DEFAULT_PATHS = {
  create: "/api/v1/booking/create",
  track: "/api/v1/tracking",
  label: "/api/v1/label",
  cancel: "/api/v1/booking/cancel",
  cities: "/api/v1/cities",
  carriers: "/api/v1/carriers",
  test: "/api/v1/account",
};

export function resolveRunCourierApiKey(settingsCourier) {
  const fromEnv = String(process.env.RUN_COURIER_API_KEY || "").trim();
  if (fromEnv) return fromEnv;
  return String(settingsCourier?.runCourierApiKey || "").trim();
}

export function resolveRunCourierBaseUrl(settingsCourier) {
  const fromEnv = String(process.env.RUN_COURIER_BASE_URL || "").trim().replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  const fromDb = String(settingsCourier?.runCourierBaseUrl || "").trim().replace(/\/$/, "");
  if (fromDb) return fromDb;
  return RUN_COURIER_DEFAULT_BASE;
}

export function resolveRunCourierPath(settingsCourier, key) {
  const customKey = {
    create: "runCourierCreatePath",
    track: "runCourierTrackPath",
    label: "runCourierLabelPath",
    cancel: "runCourierCancelPath",
    cities: "runCourierCitiesPath",
    carriers: "runCourierCarriersPath",
    test: "runCourierTestPath",
  }[key];
  const custom = customKey ? String(settingsCourier?.[customKey] || "").trim() : "";
  if (custom) return custom.startsWith("/") ? custom : `/${custom}`;
  return RUN_COURIER_DEFAULT_PATHS[key] || "/";
}

export function normalizeRunCourierApi(raw, fallback = "Auto") {
  const v = String(raw || "").trim();
  if (!v) return fallback;
  const hit = RUN_COURIER_APIS.find((a) => a.toLowerCase() === v.toLowerCase());
  return hit || v;
}

export function runCourierPublicTrackingUrl(trackingNumber) {
  const id = String(trackingNumber || "").trim();
  if (!id) return "";
  return `https://portal.runcourier.com/tracking.php?code=${encodeURIComponent(id)}`;
}

function pick(obj, ...keys) {
  if (!obj || typeof obj !== "object") return "";
  for (const k of keys) {
    const v = obj[k];
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
}

function normalizeBookingOptions(bookingOptions) {
  if (typeof bookingOptions === "string") return { selectedApi: bookingOptions };
  return bookingOptions && typeof bookingOptions === "object" ? bookingOptions : {};
}

export function isPrepaidOrderForCod(order) {
  const pm = String(order?.paymentMethod || "").toLowerCase();
  if (pm === "stripe" || pm === "paypal") return true;
  if (String(order?.paymentStatus || "").toLowerCase() === "paid") return true;
  const advance = ["jazzcash", "easypaisa", "bank", "transfer", "hbl", "meezan", "ubl"];
  return advance.some((k) => pm.includes(k));
}

/**
 * COD amount for Run Courier booking.
 * Explicit override always wins; else remaining COD (partial) or order total.
 */
export function resolveRunCourierCodAmount(order, bookingOptions = {}) {
  const opts = normalizeBookingOptions(bookingOptions);
  const overrideRaw =
    opts.codAmount != null && opts.codAmount !== ""
      ? opts.codAmount
      : opts.invoicePayment != null && opts.invoicePayment !== ""
        ? opts.invoicePayment
        : null;
  if (overrideRaw != null) {
    const n = Math.max(0, Math.round(Number(overrideRaw)));
    if (Number.isFinite(n)) return n;
  }

  const paymentStatus = String(order?.paymentStatus || "").toLowerCase();
  if (paymentStatus === "partial") {
    const remaining = Number(order?.payment?.remainingCod);
    if (Number.isFinite(remaining) && remaining >= 0) return Math.round(remaining);
  }
  if (paymentStatus === "paid" || isPrepaidOrderForCod(order)) return 0;

  const pricing = order.pricing || {};
  return Math.round(Math.max(0, Number(pricing.total ?? order.total) || 0));
}

function buildCleanStreet(addr = {}) {
  const street = String(addr.street || addr.line1 || addr.address || "").trim();
  const area = String(addr.area || "").trim();
  if (street && area && !street.toLowerCase().includes(area.toLowerCase())) {
    return `${street}, ${area}`;
  }
  return street || area || "";
}

function itemDetailsFromOrder(order) {
  const items = Array.isArray(order?.items) ? order.items : [];
  if (!items.length) return "Car accessories";
  return items
    .slice(0, 8)
    .map((i) => `${i.quantity || 1}x ${i.name || "Item"}`)
    .join("; ")
    .slice(0, 480);
}

export function buildRunCourierPayload(order, bookingOptions = {}, settingsCourier = {}) {
  const opts = normalizeBookingOptions(bookingOptions);
  const courier = settingsCourier || {};
  const addr = order?.shippingAddress || {};
  const customer = order?.customer || {};
  const selectedApi = normalizeRunCourierApi(
    opts.selectedApi || opts.api || courier.runCourierDefaultApi,
    courier.runCourierDefaultApi || "Auto"
  );
  const productType = String(
    opts.productType || courier.runCourierProductType || "Overnight"
  ).trim();
  const serviceType = String(
    opts.serviceType || courier.runCourierServiceType || "Overnight"
  ).trim();
  const codAmount = resolveRunCourierCodAmount(order, opts);
  const weight = Math.max(0.5, Number(opts.weight) || Number(courier.defaultWeight) || 0.5);
  const pieces = Math.max(1, Math.round(Number(opts.pieces) || order?.items?.length || 1));
  const remarks =
    String(opts.remarks || courier.shipperRemarks || "").trim() ||
    "Call customer before delivery. Do not leave parcel unattended.";
  const city = String(opts.cityName || opts.city || addr.city || "").trim();
  const phone = String(
    opts.customerPhone || addr.phone || customer.phone || ""
  ).trim();
  const name = String(
    opts.customerName || addr.name || customer.name || `${customer.firstName || ""} ${customer.lastName || ""}`
  )
    .trim()
    .replace(/\s+/g, " ");
  const deliveryAddress = String(
    opts.deliveryAddress || buildCleanStreet(addr) || ""
  ).trim();

  return {
    selectedApi,
    api_name: selectedApi,
    courier_api: selectedApi,
    productType,
    product_type: productType,
    serviceType,
    service_type: serviceType,
    orderRef: String(order?.orderNumber || order?._id || "").trim(),
    order_reference: String(order?.orderNumber || order?._id || "").trim(),
    consigneeName: name || "Customer",
    consignee_name: name || "Customer",
    consigneePhone: phone,
    consignee_phone: phone,
    consigneeEmail: String(customer.email || "").trim(),
    consigneeAddress: deliveryAddress || city || "Address not provided",
    consignee_address: deliveryAddress || city || "Address not provided",
    consigneeCity: city,
    consignee_city: city,
    originCity: String(courier.runCourierOriginCity || courier.originCity || "Gujranwala").trim(),
    origin_city: String(courier.runCourierOriginCity || courier.originCity || "Gujranwala").trim(),
    codAmount,
    cod_amount: codAmount,
    collection_amount: codAmount,
    weight,
    pieces,
    quantity: pieces,
    itemDetail: itemDetailsFromOrder(order),
    item_detail: itemDetailsFromOrder(order),
    specialInstruction: remarks,
    special_instruction: remarks,
    remarks,
    shipperName: String(courier.runCourierShipperName || "").trim(),
    shipperPhone: String(courier.runCourierShipperPhone || "").trim(),
    shipperAddress: String(courier.runCourierShipperAddress || "").trim(),
    paymentMethod: codAmount > 0 ? "COD" : "Prepaid",
  };
}

async function runCourierFetch(path, { method = "GET", body, settingsCourier, query } = {}) {
  const apiKey = resolveRunCourierApiKey(settingsCourier);
  if (!apiKey) {
    return {
      ok: false,
      status: 0,
      json: null,
      error:
        "Run Courier API key missing. Set RUN_COURIER_API_KEY or Settings → Courier → Run Courier API Key.",
    };
  }

  const base = resolveRunCourierBaseUrl(settingsCourier);
  let url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  if (query && typeof query === "object") {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v != null && String(v).trim() !== "") qs.set(k, String(v));
    }
    const s = qs.toString();
    if (s) url += (url.includes("?") ? "&" : "?") + s;
  }

  try {
    const res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: body != null ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
    const text = await res.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = { raw: text };
    }
    if (!res.ok) {
      const errMsg =
        pick(json, "message", "error", "statusMessage", "msg") ||
        `Run Courier HTTP ${res.status}`;
      return { ok: false, status: res.status, json, error: errMsg, url };
    }
    return { ok: true, status: res.status, json, error: "", url };
  } catch (e) {
    return {
      ok: false,
      status: 0,
      json: null,
      error: e?.message || "Could not connect to Run Courier.",
      url,
    };
  }
}

function extractTrackingNumber(json) {
  if (!json || typeof json !== "object") return "";
  const nested = json.data || json.dist || json.result || json.booking || json.order || json;
  return (
    pick(
      nested,
      "trackingNumber",
      "tracking_number",
      "consignmentNo",
      "consignment_no",
      "cn",
      "CN",
      "awb",
      "AWB",
      "barcode",
      "order_code",
      "orderCode"
    ) || pick(json, "trackingNumber", "tracking_number", "consignmentNo", "cn")
  );
}

function extractLabel(json) {
  if (!json || typeof json !== "object") return "";
  const nested = json.data || json.dist || json.result || json;
  return pick(nested, "label", "labelBase64", "pdf", "airwayBill", "airway_bill", "invoice");
}

/**
 * Create a Run Courier shipment for an order.
 */
export async function createRunCourierShipment({ order, settings }, { bookingOptions } = {}) {
  const settingsCourier = settings?.courier || settings || {};
  if (settingsCourier.runCourierEnabled === false) {
    return { success: false, error: "Run Courier is disabled in Settings." };
  }

  const payload = buildRunCourierPayload(order, bookingOptions, settingsCourier);
  if (!payload.consigneePhone) {
    return { success: false, error: "Customer phone is required for Run Courier booking." };
  }
  if (!payload.consigneeCity) {
    return { success: false, error: "Destination city is required." };
  }

  const path = resolveRunCourierPath(settingsCourier, "create");
  const res = await runCourierFetch(path, {
    method: "POST",
    body: payload,
    settingsCourier,
  });

  if (!res.ok) {
    return {
      success: false,
      error: res.error || "Booking failed.",
      debugUrl: res.url,
      selectedApi: payload.selectedApi,
    };
  }

  const trackingNumber = extractTrackingNumber(res.json);
  if (!trackingNumber) {
    return {
      success: false,
      error:
        "Run Courier responded but no tracking/CN was returned. Check API path mapping in Settings or paste API docs.",
      raw: res.json,
      selectedApi: payload.selectedApi,
    };
  }

  const label = extractLabel(res.json);
  return {
    success: true,
    trackingNumber,
    orderReference: payload.orderRef,
    selectedApi: payload.selectedApi,
    label: label || "",
    codAmount: payload.codAmount,
    raw: res.json,
  };
}

export async function fetchRunCourierLabel(trackingNumber, { settingsCourier } = {}) {
  const tn = String(trackingNumber || "").trim();
  if (!tn) return { success: false, error: "Tracking number required." };
  const path = resolveRunCourierPath(settingsCourier, "label");
  const res = await runCourierFetch(path, {
    method: "GET",
    settingsCourier,
    query: { trackingNumber: tn, cn: tn, consignmentNo: tn },
  });
  if (!res.ok) return { success: false, error: res.error };
  const label = extractLabel(res.json);
  if (!label) return { success: false, error: "No label in Run Courier response." };
  return { success: true, label, trackingNumber: tn };
}

export async function fetchRunCourierTracking(trackingNumber, { settingsCourier } = {}) {
  const tn = String(trackingNumber || "").trim();
  if (!tn) return { success: false, error: "Tracking number required." };
  const path = resolveRunCourierPath(settingsCourier, "track");
  const res = await runCourierFetch(path, {
    method: "GET",
    settingsCourier,
    query: { trackingNumber: tn, cn: tn, code: tn },
  });
  if (!res.ok) return { success: false, error: res.error };
  const nested = res.json?.data || res.json?.dist || res.json || {};
  const status =
    pick(nested, "status", "orderStatus", "shipmentStatus", "currentStatus", "transactionStatus") ||
    "Unknown";
  return {
    success: true,
    trackingNumber: tn,
    status,
    location: pick(nested, "location", "city", "currentLocation", "cityName"),
    raw: res.json,
  };
}

export async function cancelRunCourierShipment(trackingNumber, { settingsCourier } = {}) {
  const tn = String(trackingNumber || "").trim();
  if (!tn) return { success: false, error: "Tracking number required." };
  const path = resolveRunCourierPath(settingsCourier, "cancel");
  const res = await runCourierFetch(path, {
    method: "POST",
    settingsCourier,
    body: { trackingNumber: tn, cn: tn, consignmentNo: tn },
  });
  if (!res.ok) return { success: false, error: res.error };
  return { success: true, trackingNumber: tn };
}

export async function fetchRunCourierCarriers({ settingsCourier } = {}) {
  const path = resolveRunCourierPath(settingsCourier, "carriers");
  const res = await runCourierFetch(path, { method: "GET", settingsCourier });
  if (!res.ok) {
    return { success: true, carriers: [...RUN_COURIER_APIS], source: "fallback" };
  }
  const nested = res.json?.data || res.json?.carriers || res.json;
  let list = [];
  if (Array.isArray(nested)) {
    list = nested.map((c) => (typeof c === "string" ? c : c?.name || c?.api || c?.code)).filter(Boolean);
  }
  if (!list.length) list = [...RUN_COURIER_APIS];
  return { success: true, carriers: list, source: list === RUN_COURIER_APIS ? "fallback" : "api" };
}

export async function fetchRunCourierCities({ settingsCourier } = {}) {
  const path = resolveRunCourierPath(settingsCourier, "cities");
  const res = await runCourierFetch(path, { method: "GET", settingsCourier });
  if (!res.ok) return { success: false, cities: [], error: res.error };
  const nested = res.json?.data || res.json?.cities || res.json;
  let cities = [];
  if (Array.isArray(nested)) {
    cities = nested
      .map((c) => (typeof c === "string" ? c : c?.name || c?.city || c?.cityName))
      .filter(Boolean);
  }
  return { success: true, cities };
}

export async function testRunCourierConnection({ settingsCourier } = {}) {
  const apiKey = resolveRunCourierApiKey(settingsCourier);
  if (!apiKey) {
    return { success: false, error: "API key not configured." };
  }
  const path = resolveRunCourierPath(settingsCourier, "test");
  const res = await runCourierFetch(path, { method: "GET", settingsCourier });
  if (res.ok) {
    return { success: true, message: "Run Courier API reachable.", status: res.status };
  }
  // Some accounts reject /account — key presence alone is OK for config check.
  if (res.status === 404 || res.status === 405) {
    return {
      success: true,
      message: `API key set; test path returned ${res.status} (update path in Settings when docs arrive).`,
      warning: true,
    };
  }
  return { success: false, error: res.error || "Connection failed." };
}

export function displayCourierName(selectedApi) {
  const api = normalizeRunCourierApi(selectedApi, "Auto");
  if (!api || api === "Auto") return "Run Courier";
  return api;
}
