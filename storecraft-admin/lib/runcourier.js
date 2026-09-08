/**
 * Run Courier merchant API client (iCargos / IT Vision).
 * Docs: https://www.icargos.com/api-integration
 * Portal: https://portal.runcourier.com
 *
 * Auth: JSON body fields auth_key + client_code (not Bearer-only).
 * Booking: POST /API/CreateOrder.php — requires `product` (e.g. "Overnight") + service_type.
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

export const RUN_COURIER_PRODUCT_TYPES = ["Overnight", "OverLand", "DETAINED"];
export const RUN_COURIER_SERVICE_TYPES = [
  "Overnight",
  "OverLand",
  "TCS Overnight",
  "TCS Overland",
  "Detained",
  "TCS Detained",
];

export const RUN_COURIER_DEFAULT_BASE = "https://portal.runcourier.com";

/** Official iCargos paths — case-sensitive `/API/` (lowercase `/api/` 404s). */
export const RUN_COURIER_DEFAULT_PATHS = {
  create: "/API/CreateOrder.php",
  track: "/API/TrackOrder.php",
  status: "/API/CurrentStatus.php",
  label: "/API/CreateOrder.php",
  cancel: "/API/CancelOrder.php",
  cities: "/API/GetCitiesList.php",
  carriers: "/API/getThirdpartyApiAndGateways.php",
  products: "/API/ProductAndService.php",
  test: "/API/ProductAndService.php",
};

let citiesCache = { at: 0, list: [] };

export function resolveRunCourierApiKey(settingsCourier) {
  const fromEnv = String(process.env.RUN_COURIER_API_KEY || "").trim();
  if (fromEnv) return fromEnv;
  return String(settingsCourier?.runCourierApiKey || "").trim();
}

export function resolveRunCourierClientCode(settingsCourier) {
  const fromEnv = String(process.env.RUN_COURIER_CLIENT_CODE || "").trim();
  if (fromEnv) return fromEnv;
  return String(settingsCourier?.runCourierClientCode || "").trim();
}

export function resolveRunCourierProfileId(settingsCourier) {
  const fromEnv = String(process.env.RUN_COURIER_PROFILE_ID || "").trim();
  if (fromEnv) return fromEnv;
  return String(settingsCourier?.runCourierProfileId || "").trim();
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
    status: "runCourierStatusPath",
    label: "runCourierLabelPath",
    cancel: "runCourierCancelPath",
    cities: "runCourierCitiesPath",
    carriers: "runCourierCarriersPath",
    products: "runCourierProductsPath",
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

export function displayCourierName(selectedApi) {
  const api = normalizeRunCourierApi(selectedApi, "Auto");
  if (!api || api.toLowerCase() === "auto") return "Run Courier";
  return `Run Courier (${api})`;
}

export function runCourierPublicTrackingUrl(trackingNumber) {
  const id = String(trackingNumber || "").trim();
  if (!id) return "";
  return `https://portal.runcourier.com/tracking.php?code=${encodeURIComponent(id)}`;
}

/** Carriers / display names that mean this shipment was booked via Run Courier. */
const RUN_COURIER_CARRIER_HINTS = [
  "run courier",
  "runcourier",
  "trax",
  "tcs",
  "m&p",
  "mnp",
  "leopard",
  "daewoo",
  "dastaq",
  "ahl",
  "bluex",
];

export function isRunCourierOrder(order) {
  if (!order) return false;
  if (String(order.runCourierApi || "").trim()) return true;
  if (String(order.runCourierLabel || "").trim()) return true;
  const carrier = String(order.courier || order.tracking?.carrier || "")
    .trim()
    .toLowerCase();
  if (!carrier) return false;
  if (carrier.includes("postex")) return false;
  return RUN_COURIER_CARRIER_HINTS.some((h) => carrier.includes(h));
}

export function isPostexOrder(order) {
  if (!order) return false;
  if (isRunCourierOrder(order)) return false;
  const carrier = String(order.courier || order.tracking?.carrier || "")
    .trim()
    .toLowerCase();
  if (!carrier || carrier === "postex") return true;
  return carrier.includes("postex");
}

function pick(obj, ...keys) {
  if (!obj || typeof obj !== "object") return "";
  for (const k of keys) {
    const v = obj[k];
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
}

function splitDateTime(raw) {
  const s = String(raw || "").trim();
  if (!s) return { date: "", time: "" };
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) {
    return {
      date: d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
      time: d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
    };
  }
  const [datePart, ...rest] = s.split(/\s+/);
  return { date: datePart || s, time: rest.join(" ") };
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
 * When runCourierPaidOrdersCodZero (or shared paidOrdersCodZero) is on, fully paid → 0.
 */
export function resolveRunCourierCodAmount(order, bookingOptions = {}, settingsCourier = {}) {
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

  const forcePaidZero =
    settingsCourier.runCourierPaidOrdersCodZero === true ||
    (settingsCourier.runCourierPaidOrdersCodZero == null &&
      Boolean(settingsCourier.paidOrdersCodZero));
  const paymentStatus = String(order?.paymentStatus || "").toLowerCase();
  if (forcePaidZero && (paymentStatus === "paid" || isPrepaidOrderForCod(order))) {
    return 0;
  }

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

function itemDetailsFromOrder(order, { withSku = false } = {}) {
  const items = Array.isArray(order?.items) ? order.items : [];
  if (!items.length) return "Car accessories";
  return items
    .slice(0, 8)
    .map((i) => {
      const qty = i.quantity || 1;
      const name = i.name || "Item";
      const sku = withSku && (i.articleNo || i.sku) ? ` [${i.articleNo || i.sku}]` : "";
      return `${qty}x ${name}${sku}`;
    })
    .join("; ")
    .slice(0, 480);
}

function parseIcargosBody(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function icargosErrorMessage(json) {
  if (typeof json === "string") return json;
  if (!json || typeof json !== "object") return "";
  if (typeof json.raw === "string") {
    try {
      const inner = JSON.parse(json.raw);
      if (typeof inner === "string") return inner;
    } catch {
      return json.raw.slice(0, 300);
    }
  }
  return pick(json, "message", "error", "alert_msg", "msg", "statusMessage");
}

/**
 * Low-level fetch. Auth credentials are merged into JSON body (POST) or query (GET).
 */
async function runCourierFetch(path, { method = "GET", body, settingsCourier, query } = {}) {
  const apiKey = resolveRunCourierApiKey(settingsCourier);
  const clientCode = resolveRunCourierClientCode(settingsCourier);
  if (!apiKey) {
    return {
      ok: false,
      status: 0,
      json: null,
      error:
        "Run Courier API key missing. Set Settings → Run Courier → TOKEN (API KEY).",
    };
  }
  if (!clientCode) {
    return {
      ok: false,
      status: 0,
      json: null,
      error:
        "Run Courier Client Code missing. Set Settings → Run Courier → Client Code (e.g. 991200).",
    };
  }

  const base = resolveRunCourierBaseUrl(settingsCourier);
  let url = `${base}${path.startsWith("/") ? path : `/${path}`}`;

  const authQuery = { auth_key: apiKey, client_code: clientCode };
  const mergedQuery = { ...authQuery, ...(query || {}) };
  if (method === "GET" || method === "DELETE") {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(mergedQuery)) {
      if (v != null && String(v).trim() !== "") qs.set(k, String(v));
    }
    const s = qs.toString();
    if (s) url += (url.includes("?") ? "&" : "?") + s;
  }

  const payload =
    method === "GET" || method === "DELETE"
      ? null
      : {
          auth_key: apiKey,
          client_code: clientCode,
          ...(body && typeof body === "object" ? body : {}),
        };

  try {
    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: payload != null ? JSON.stringify(payload) : undefined,
      cache: "no-store",
    });
    const text = await res.text();
    const json = parseIcargosBody(text);

    // iCargos often returns HTTP 200 with a JSON string error.
    if (typeof json === "string") {
      return { ok: false, status: res.status, json, error: json, url };
    }
    if (json && typeof json === "object" && json.busy) {
      return {
        ok: false,
        status: res.status,
        json,
        error: icargosErrorMessage(json) || "Run Courier server busy — try again.",
        url,
      };
    }
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        json,
        error:
          icargosErrorMessage(json) ||
          (res.status === 404
            ? `Run Courier booking URL not found (HTTP 404). Path tried: ${url}`
            : `Run Courier HTTP ${res.status}`),
        url,
      };
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

export async function fetchRunCourierCities({ settingsCourier } = {}) {
  const path = resolveRunCourierPath(settingsCourier, "cities");
  const res = await runCourierFetch(path, { method: "POST", body: {}, settingsCourier });
  if (!res.ok) return { success: false, cities: [], error: res.error };
  const nested = res.json?.data || res.json?.cities || res.json;
  let cities = [];
  if (Array.isArray(nested)) {
    cities = nested
      .map((c) => (typeof c === "string" ? c : c?.city_name || c?.name || c?.city || c?.cityName))
      .filter(Boolean);
  }
  if (cities.length) {
    citiesCache = { at: Date.now(), list: cities };
  }
  return { success: true, cities };
}

async function ensureCityList(settingsCourier) {
  if (citiesCache.list.length && Date.now() - citiesCache.at < 6 * 60 * 60 * 1000) {
    return citiesCache.list;
  }
  const loaded = await fetchRunCourierCities({ settingsCourier });
  return loaded.cities || [];
}

/** Match order city to an exact Run Courier city_name (case-sensitive API). */
export function matchRunCourierCity(rawCity, cityList = []) {
  const raw = String(rawCity || "").trim();
  if (!raw) return "";
  if (!cityList.length) return raw;
  const lower = raw.toLowerCase();
  const exact = cityList.find((c) => String(c).toLowerCase() === lower);
  if (exact) return exact;
  const starts = cityList.find((c) => String(c).toLowerCase().startsWith(lower));
  if (starts) return starts;
  const includes = cityList.find((c) => String(c).toLowerCase().includes(lower));
  if (includes) return includes;
  // Prefer shorter parent city when raw is longer (e.g. "Sahiwal City" → "Sahiwal")
  const reverse = cityList.find((c) => lower.includes(String(c).toLowerCase()));
  return reverse || raw;
}

export function buildRunCourierPayload(order, bookingOptions = {}, settingsCourier = {}, cityList = []) {
  const opts = normalizeBookingOptions(bookingOptions);
  const courier = settingsCourier || {};
  const addr = order?.shippingAddress || {};
  const customer = order?.customer || {};
  const selectedApi = normalizeRunCourierApi(
    opts.selectedApi || opts.api || courier.runCourierDefaultApi,
    courier.runCourierDefaultApi || "Auto"
  );
  const product = String(
    opts.product || opts.productType || courier.runCourierProductType || "Overnight"
  ).trim();
  const serviceType = String(
    opts.serviceType || courier.runCourierServiceType || product || "Overnight"
  ).trim();
  const codAmount = resolveRunCourierCodAmount(order, opts, courier);

  const autoWeight =
    courier.runCourierAutoCalculateWeight === true ||
    (courier.runCourierAutoCalculateWeight == null && Boolean(courier.autoCalculateWeight));
  const grams = Number(order?.pricing?.totalWeightGrams) || 0;
  const autoKg = grams > 0 ? Math.round((grams / 1000) * 100) / 100 : 0;
  const weight = Math.max(
    0.5,
    Number(opts.weight) ||
      (autoWeight && autoKg > 0 ? autoKg : 0) ||
      Number(courier.runCourierDefaultWeight) ||
      Number(courier.defaultWeight) ||
      0.5
  );

  const autoPieces =
    courier.runCourierAutoCalculatePieces === true ||
    (courier.runCourierAutoCalculatePieces == null && Boolean(courier.autoCalculatePieces));
  const pieces = Math.max(
    1,
    Math.round(
      Number(opts.pieces) ||
        (autoPieces ? order?.items?.length || 1 : 0) ||
        order?.items?.length ||
        1
    )
  );

  const printDetails =
    courier.runCourierPrintItemDetails === true ||
    (courier.runCourierPrintItemDetails == null && Boolean(courier.printItemDetails));
  const printSku =
    courier.runCourierPrintItemDetailsSku === true ||
    (courier.runCourierPrintItemDetailsSku == null && Boolean(courier.printItemDetailsSku));
  const details = printDetails
    ? itemDetailsFromOrder(order, { withSku: printSku })
    : itemDetailsFromOrder(order);

  let remarks =
    String(opts.remarks || courier.runCourierShipperRemarks || courier.shipperRemarks || "").trim() ||
    "Call customer before delivery. Do not leave parcel unattended.";
  const addNotes =
    courier.runCourierAddOrderNotesInRemarks === true ||
    (courier.runCourierAddOrderNotesInRemarks == null && Boolean(courier.addOrderNotesInRemarks));
  if (addNotes) {
    const notes = Array.isArray(order?.internalNotes)
      ? order.internalNotes
          .map((n) => n?.note || n)
          .filter(Boolean)
          .slice(0, 3)
          .join(" | ")
      : "";
    if (notes) remarks = `${remarks} | Notes: ${notes}`.slice(0, 500);
  }
  if (printDetails && details) {
    remarks = `${remarks} | Items: ${details}`.slice(0, 500);
  }

  const destRaw = String(opts.cityName || opts.city || addr.city || "").trim();
  const originRaw = String(
    opts.originCity || courier.runCourierOriginCity || courier.originCity || "Gujranwala"
  ).trim();
  const destination = matchRunCourierCity(destRaw, cityList);
  const origin = matchRunCourierCity(originRaw, cityList);

  const phone = String(opts.customerPhone || addr.phone || customer.phone || "").trim();
  const name = String(
    opts.customerName ||
      addr.name ||
      customer.name ||
      `${customer.firstName || ""} ${customer.lastName || ""}`
  )
    .trim()
    .replace(/\s+/g, " ");
  const deliveryAddress = String(opts.deliveryAddress || buildCleanStreet(addr) || "").trim();
  const profileId = String(
    opts.profileId || resolveRunCourierProfileId(courier) || ""
  ).trim();

  const payload = {
    origin,
    destination,
    receiver_name: name || "Customer",
    receiver_phone: phone,
    receiver_address: deliveryAddress || destination || "Address not provided",
    pieces,
    weight,
    service_type: serviceType,
    // Critical: iCargos tariffs require `product` (not only product_type).
    product,
    product_type: product,
    collection_amount: codAmount,
    product_description: details || "Car accessories",
    special_instruction: remarks,
  };
  if (profileId) payload.profile_id = profileId;

  // Keep UI/meta fields for our app (stripped before API send).
  return {
    ...payload,
    selectedApi,
    orderRef: String(order?.orderNumber || order?._id || "").trim(),
    consigneePhone: phone,
    consigneeCity: destination,
    codAmount,
  };
}

function extractTrackingNumber(json) {
  if (!json || typeof json !== "object") return "";
  return (
    pick(
      json,
      "tracking_no",
      "trackingNumber",
      "tracking_number",
      "consignmentNo",
      "cn",
      "awb"
    ) || ""
  );
}

/**
 * Create a Run Courier shipment for an order.
 */
export async function createRunCourierShipment({ order, settings }, { bookingOptions } = {}) {
  const settingsCourier = settings?.courier || settings || {};
  if (settingsCourier.runCourierEnabled === false) {
    return { success: false, error: "Run Courier is disabled in Settings." };
  }

  const cityList = await ensureCityList(settingsCourier);
  const built = buildRunCourierPayload(order, bookingOptions, settingsCourier, cityList);
  if (!built.consigneePhone) {
    return { success: false, error: "Customer phone is required for Run Courier booking." };
  }
  if (!built.consigneeCity) {
    return { success: false, error: "Destination city is required." };
  }

  const {
    selectedApi,
    orderRef,
    consigneePhone,
    consigneeCity,
    codAmount,
    ...apiBody
  } = built;

  const path = resolveRunCourierPath(settingsCourier, "create");
  const res = await runCourierFetch(path, {
    method: "POST",
    body: apiBody,
    settingsCourier,
  });

  if (!res.ok) {
    return {
      success: false,
      error: res.error || "Booking failed.",
      debugUrl: res.url,
      selectedApi,
      origin: apiBody.origin,
      destination: apiBody.destination,
    };
  }

  const trackingNumber = extractTrackingNumber(res.json);
  if (!trackingNumber) {
    return {
      success: false,
      error:
        icargosErrorMessage(res.json) ||
        "Run Courier responded but no tracking number was returned.",
      raw: res.json,
      selectedApi,
    };
  }

  const thirdParty = pick(res.json, "thirdparty_name", "thirdpartyName", "carrier") || selectedApi;
  const invoiceLink = pick(res.json, "invoice_link", "invoiceLink", "label_url", "labelUrl");

  return {
    success: true,
    trackingNumber,
    orderReference: orderRef,
    selectedApi: thirdParty || selectedApi,
    label: "",
    invoiceLink,
    orderId: res.json?.id || "",
    codAmount,
    raw: res.json,
  };
}

export async function fetchRunCourierTracking(trackingNumber, { settingsCourier } = {}) {
  const tn = String(trackingNumber || "").trim();
  if (!tn) return { success: false, error: "Tracking number required." };

  const apiKey = resolveRunCourierApiKey(settingsCourier);
  const clientCode = resolveRunCourierClientCode(settingsCourier);

  if (apiKey && clientCode) {
    for (const key of ["track", "status"]) {
      const path = resolveRunCourierPath(settingsCourier, key);
      const res = await runCourierFetch(path, {
        method: "POST",
        settingsCourier,
        body: { tracking_no: tn },
      });
      if (!res.ok) continue;
      const parsed = parseTrackResponse(res.json, tn);
      if (parsed?.success) return { ...parsed, raw: res.json };
    }
  }

  const scraped = await scrapeRunCourierPortal(tn);
  if (scraped?.success) return scraped;

  if (!apiKey || !clientCode) {
    return {
      success: false,
      error:
        "Run Courier API credentials missing and portal lookup found no status. Set API key + Client Code in Settings.",
    };
  }
  return { success: false, error: "Tracking number not found on Run Courier." };
}

function parseTrackResponse(json, trackingNumber) {
  const rows = Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : null;
  if (rows?.length) {
    const events = rows.map((entry, idx) => {
      const { date, time } = splitDateTime(entry.created || entry.date || entry.timestamp || "");
      const status = pick(entry, "status", "orderStatus", "transactionStatus") || "Update";
      return {
        date,
        time,
        status,
        location: pick(entry, "location", "city", "hub"),
        description: status,
        sortAt: Date.now() - idx,
      };
    });
    const status = events[0]?.status || "Unknown";
    return {
      success: true,
      trackingNumber: pick(rows[0], "tracking_no", "trackingNumber") || trackingNumber,
      status,
      statusCode: status.slice(0, 2).toUpperCase(),
      courier: "Run Courier",
      events,
      estimatedDelivery: "",
      origin: "",
      destination: "",
      currentLocation: events[0]?.location || "",
      destinationReceived: false,
      source: "api",
    };
  }

  if (json && typeof json === "object" && !Array.isArray(json)) {
    const status = pick(json, "status", "orderStatus", "currentStatus");
    if (!status) return null;
    return {
      success: true,
      trackingNumber: pick(json, "tracking_no", "trackingNumber") || trackingNumber,
      status,
      statusCode: status.slice(0, 2).toUpperCase(),
      courier: pick(json, "thirdparty_name", "courier") || "Run Courier",
      events: [{ date: "", time: "", status, location: "", description: status }],
      estimatedDelivery: "",
      origin: "",
      destination: "",
      currentLocation: "",
      destinationReceived: false,
      source: "api",
    };
  }
  return null;
}

async function scrapeRunCourierPortal(tn) {
  try {
    const url = runCourierPublicTrackingUrl(tn);
    const res = await fetch(url, {
      headers: { Accept: "text/html", "User-Agent": "CrazzycarsTrack/1.0" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const text = await res.text();
    let status = "";
    const statusMatch =
      text.match(/current\s*status[^<]*<\/[^>]+>\s*<[^>]+>([^<]+)/i) ||
      text.match(/status\s*[:\-]\s*([^<\n]{3,60})/i);
    if (statusMatch) status = statusMatch[1].replace(/\s+/g, " ").trim();
    if (!status) return null;
    if (/tracking-form/i.test(text) && /please enter|enter tracking/i.test(text)) return null;
    return {
      success: true,
      trackingNumber: tn,
      status,
      statusCode: status.slice(0, 2).toUpperCase(),
      courier: "Run Courier",
      events: [{ date: "", time: "", status, location: "", description: status }],
      estimatedDelivery: "",
      origin: "",
      destination: "",
      currentLocation: "",
      destinationReceived: false,
      source: "portal",
    };
  } catch {
    return null;
  }
}

export async function fetchRunCourierLabel(trackingNumber, { settingsCourier, invoiceLink } = {}) {
  const link = String(invoiceLink || "").trim();
  if (link.startsWith("http")) {
    return { success: true, label: "", invoiceLink: link, trackingNumber };
  }
  // No dedicated label PDF API — airbill is the portal invoice HTML.
  const tn = String(trackingNumber || "").trim();
  if (!tn) return { success: false, error: "Tracking number required." };
  return {
    success: false,
    error: "Open the Run Courier invoice link to print the airbill.",
    trackingNumber: tn,
  };
}

export async function cancelRunCourierShipment(trackingNumber, { settingsCourier } = {}) {
  const tn = String(trackingNumber || "").trim();
  if (!tn) return { success: false, error: "Tracking number required." };
  const path = resolveRunCourierPath(settingsCourier, "cancel");
  const res = await runCourierFetch(path, {
    method: "GET",
    settingsCourier,
    query: { tracking_no: tn, cn: tn },
  });
  if (!res.ok) return { success: false, error: res.error };
  if (typeof res.json === "string") return { success: false, error: res.json };
  return { success: true, trackingNumber: tn, raw: res.json };
}

export async function fetchRunCourierCarriers({ settingsCourier } = {}) {
  const path = resolveRunCourierPath(settingsCourier, "carriers");
  const res = await runCourierFetch(path, { method: "GET", settingsCourier });
  if (!res.ok) {
    return { success: true, carriers: [...RUN_COURIER_APIS], source: "fallback" };
  }
  const nested = res.json?.API || res.json?.data || res.json?.carriers || res.json;
  let list = [];
  if (Array.isArray(nested)) {
    list = nested
      .map((c) => (typeof c === "string" ? c : c?.title || c?.name || c?.api || c?.id))
      .filter(Boolean);
  }
  // Prefer human titles; ensure Auto first
  const unique = [...new Set(list.map((x) => String(x)))];
  if (!unique.some((x) => String(x).toLowerCase() === "auto")) unique.unshift("Auto");
  if (!unique.length) return { success: true, carriers: [...RUN_COURIER_APIS], source: "fallback" };
  return { success: true, carriers: unique, source: "api" };
}

export async function testRunCourierConnection({ settingsCourier } = {}) {
  const apiKey = resolveRunCourierApiKey(settingsCourier);
  const clientCode = resolveRunCourierClientCode(settingsCourier);
  if (!apiKey) return { success: false, error: "API key not configured." };
  if (!clientCode) return { success: false, error: "Client Code not configured." };

  const path = resolveRunCourierPath(settingsCourier, "products");
  const res = await runCourierFetch(path, { method: "POST", body: {}, settingsCourier });
  if (!res.ok) return { success: false, error: res.error || "Connection failed." };

  const profile = res.json?.default_profile || {};
  return {
    success: true,
    message: `Connected. Profile: ${profile.fname || profile.bname || profile.id || "ok"}`,
    profileId: profile.id || "",
    services: (res.json?.services || []).map((s) => s.service_type || s.name).filter(Boolean),
  };
}
