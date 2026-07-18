/**
 * Postex Merchant API — order tracking (v3).
 * @see https://api.postex.pk/services/integration/api/order/v3/
 */

export const POSTEX_ORDER_API_BASE =
  "https://api.postex.pk/services/integration/api/order/v3";

export const POSTEX_CITIES_API_BASE =
  "https://api.postex.pk/services/integration/api/order/v2";

export function resolvePostexApiKey(settingsCourier) {
  const fromEnv = String(process.env.POSTEX_API_KEY || "").trim();
  if (fromEnv) return fromEnv;
  const fromDb = String(settingsCourier?.postexApiKey || "").trim();
  return fromDb;
}

export function resolvePostexPickupAddressCode(settingsCourier) {
  const fromDb = String(settingsCourier?.postexAddressCode || "").trim();
  if (fromDb) return fromDb;
  return String(process.env.POSTEX_ADDRESS_CODE || "").trim();
}

export function postexPublicTrackingUrl(trackingNumber) {
  const id = String(trackingNumber || "").trim();
  if (!id) return "";
  return `https://www.postex.pk/tracking?trackingId=${encodeURIComponent(id)}`;
}

function pick(obj, ...keys) {
  if (!obj || typeof obj !== "object") return "";
  for (const k of keys) {
    const v = obj[k];
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
}

function formatEventDateTime(raw) {
  if (!raw) return { date: "", time: "" };
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) {
    const s = String(raw).trim();
    const parts = s.split(/\s+/);
    return { date: parts[0] || s, time: parts[1] || "" };
  }
  return {
    date: d.toLocaleDateString("en-CA"),
    time: d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false }),
  };
}

function normalizeEvent(entry) {
  if (!entry || typeof entry !== "object") return null;
  const { date, time } = formatEventDateTime(
    entry.transactionDateTime || entry.statusDateTime || entry.dateTime || entry.timestamp || entry.date
  );
  const status =
    pick(entry, "transactionStatus", "orderStatus", "status", "statusName", "transactionStatusName") ||
    "Update";
  return {
    date: entry.date || date,
    time: entry.time || time,
    status,
    location: pick(entry, "cityName", "location", "operationalCity", "city"),
    description:
      pick(entry, "remarks", "description", "transactionStatusMessage", "message", "comment") ||
      status,
    sortAt: new Date(entry.transactionDateTime || entry.statusDateTime || entry.dateTime || Date.now()).getTime(),
  };
}

function extractOrderPayload(json) {
  if (!json || typeof json !== "object") return null;
  if (json.dist && typeof json.dist === "object") return json.dist;
  if (json.data && typeof json.data === "object") return json.data;
  if (json.order && typeof json.order === "object") return json.order;
  if (json.trackingNumber || json.orderStatus || json.transactionStatus) return json;
  return null;
}

function extractHistory(dist) {
  const lists = [
    dist?.transactionStatusHistory,
    dist?.orderStatusHistory,
    dist?.statusHistory,
    dist?.trackingHistory,
    dist?.history,
  ].filter(Array.isArray);

  const events = [];
  for (const list of lists) {
    for (const item of list) {
      const ev = normalizeEvent(item);
      if (ev) events.push(ev);
    }
  }
  if (!events.length) {
    const status = pick(dist, "transactionStatus", "orderStatus", "status", "currentStatus");
    if (status) {
      events.push({
        date: "",
        time: "",
        status,
        location: pick(dist, "cityName", "deliveryCity", "operationalCity"),
        description: status,
        sortAt: Date.now(),
      });
    }
  }
  events.sort((a, b) => (b.sortAt || 0) - (a.sortAt || 0));
  return events.map(({ date, time, status, location, description }) => ({
    date,
    time,
    status,
    location,
    description,
  }));
}

function mapStatusLabel(dist) {
  const raw =
    pick(dist, "transactionStatus", "orderStatus", "status", "currentStatus", "transactionStatusName") ||
    "Pending";
  const code = pick(dist, "transactionStatusId", "orderStatusId", "statusCode", "statusId") || "";
  return { status: raw, statusCode: code || raw.slice(0, 2).toUpperCase() };
}

export function parsePostexOrderDetail(json, trackingNumber) {
  const dist = extractOrderPayload(json);
  if (!dist) return null;

  const tn = pick(dist, "trackingNumber", "trackingNo") || String(trackingNumber || "").trim();
  const { status, statusCode } = mapStatusLabel(dist);
  const weightRaw = dist.weight ?? dist.orderWeight ?? dist.totalWeight;
  const weight =
    weightRaw != null && weightRaw !== ""
      ? `${weightRaw}${String(weightRaw).includes("kg") ? "" : "kg"}`
      : "";

  return {
    success: true,
    trackingNumber: tn,
    status,
    statusCode,
    courier: "Postex",
    events: extractHistory(dist),
    estimatedDelivery: pick(
      dist,
      "expectedDeliveryDate",
      "orderDeliveryDate",
      "deliveryDate",
      "edd"
    ),
    origin: pick(dist, "pickupCity", "originCity", "merchantCity", "pickupAddress") || "Gujranwala",
    destination: pick(dist, "deliveryCity", "cityName", "destinationCity", "deliveryAddress"),
    weight,
    pieces: Number(dist.items ?? dist.pieces ?? dist.itemCount) || 1,
  };
}

export function classifyPostexError(status, json, networkError) {
  if (networkError) {
    return { success: false, error: "Could not connect to courier" };
  }
  if (status === 401 || status === 403) {
    return { success: false, error: "Tracking unavailable" };
  }
  const msg = String(json?.message || json?.error || json?.statusMessage || "").toLowerCase();
  if (
    status === 404 ||
    msg.includes("not found") ||
    msg.includes("invalid") ||
    msg.includes("no record")
  ) {
    return { success: false, error: "Invalid tracking number" };
  }
  if (status >= 400) {
    return { success: false, error: "Invalid tracking number" };
  }
  return { success: false, error: "Invalid tracking number" };
}

export async function fetchPostexTracking(trackingNumber, options = {}) {
  const id = String(trackingNumber || "").trim();
  if (!id) {
    return { success: false, error: "Invalid tracking number" };
  }

  const apiKey = resolvePostexApiKey(options.settingsCourier);
  if (!apiKey) {
    return { success: false, error: "Tracking unavailable" };
  }

  const url = new URL(`${POSTEX_ORDER_API_BASE}/get-order-detail`);
  url.searchParams.set("trackingNumber", id);

  let res;
  try {
    res = await fetch(url.toString(), {
      method: "GET",
      headers: {
        token: apiKey,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });
  } catch {
    return { success: false, error: "Could not connect to courier" };
  }

  let json = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }

  const apiStatus = String(json?.status || "").toUpperCase();
  if (apiStatus === "ERROR" || apiStatus === "FAILED") {
    return classifyPostexError(res.status, json, false);
  }

  const parsed = parsePostexOrderDetail(json, id);
  if (parsed?.trackingNumber) {
    return parsed;
  }

  if (res.ok && json) {
    return classifyPostexError(res.status, json, false);
  }

  return classifyPostexError(res.status, json, false);
}

export function buildTrackingWhatsAppMessage({
  storeName = "Crazzycars.pk",
  orderNumber,
  trackingNumber,
  storeUrl = "",
}) {
  const postexLink = postexPublicTrackingUrl(trackingNumber);
  const siteBase = String(storeUrl || process.env.NEXT_PUBLIC_STORE_URL || "").replace(/\/$/, "");
  const storeTrack = siteBase
    ? `${siteBase}/track-order?tracking=${encodeURIComponent(trackingNumber)}`
    : "";

  let msg = `Your ${storeName} order #${orderNumber} has been shipped!\n\nTrack your order:\n${postexLink}`;
  if (storeTrack) {
    msg += `\n\nOr track on our website:\n${storeTrack}`;
  }
  return msg;
}

function formatPostexOrderDate(date) {
  const d = new Date(date || Date.now());
  if (Number.isNaN(d.getTime())) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

/** Read phone from order using every known field (shipping first). */
export function resolveOrderPhone(order) {
  const o = order && typeof order === "object" ? order : {};
  const addr = o.shippingAddress && typeof o.shippingAddress === "object" ? o.shippingAddress : {};
  const candidates = [
    addr.phone,
    addr.phoneNumber,
    o.customer?.phone,
    o.phone,
  ];
  for (const c of candidates) {
    if (c == null || c === "") continue;
    const s = String(c).trim();
    if (s) return s;
  }
  return "";
}

export function normalizePkMobile(phone) {
  const raw = String(phone ?? "").trim();
  if (!raw) return null;

  let digits = raw.replace(/\D/g, "");

  if (digits.startsWith("0092")) {
    digits = "0" + digits.slice(4);
  } else if (digits.startsWith("92") && digits.length >= 12) {
    digits = "0" + digits.slice(2);
  }

  if (digits.startsWith("3") && digits.length === 10) {
    digits = "0" + digits;
  }

  if (digits.length === 11 && digits.startsWith("03")) {
    return digits;
  }

  return digits.length ? digits : null;
}

function invalidPhoneError(rawPhone, normalized) {
  const raw = String(rawPhone ?? "").trim() || "(empty)";
  const norm = normalized == null || normalized === "" ? "(null)" : String(normalized);
  return `Invalid phone number: raw="${raw}" normalized="${norm}". Please use format 03XXXXXXXXX`;
}

function isValidPostexMobile(mobile) {
  const m = String(mobile ?? "").trim();
  return m.length === 11 && m.startsWith("03");
}

export const DEFAULT_POSTEX_REMARKS =
  "Call customer before delivery. Do not leave parcel unattended.";

export function isPrepaidOrder(order) {
  const pm = String(order?.paymentMethod || "").toLowerCase();
  if (pm === "stripe" || pm === "paypal") return true;
  if (String(order?.paymentStatus || "").toLowerCase() === "paid") return true;
  const advance = ["jazzcash", "easypaisa", "bank", "transfer", "hbl", "meezan", "ubl"];
  return advance.some((k) => pm.includes(k));
}

export function isCodOrder(order, bookingOptions = {}) {
  const pm = String(bookingOptions.paymentMethod || "").trim();
  if (pm) return pm.toUpperCase() === "COD";
  return !isPrepaidOrder(order);
}

function normalizeBookingOptions(bookingOptions) {
  if (typeof bookingOptions === "string") {
    return { pickupAddressCode: bookingOptions };
  }
  return bookingOptions && typeof bookingOptions === "object" ? bookingOptions : {};
}

export function buildPostexCreatePayload(order, settings = {}, bookingOptions = {}) {
  const courier = settings.courier || {};
  const opts = normalizeBookingOptions(bookingOptions);
  const pickupAddressCode =
    String(opts.pickupAddressCode || "").trim() || resolvePostexPickupAddressCode(courier);
  const general = settings.general || {};
  const addr = order.shippingAddress || {};
  const customer = order.customer || {};
  const pricing = order.pricing || {};
  const total = Math.max(0, Number(pricing.total ?? order.total) || 0);
  const cod = isCodOrder(order, opts);
  const items = Array.isArray(order.items) ? order.items : [];
  const itemCount = items.reduce((s, i) => s + Math.max(1, Number(i.quantity) || 1), 0) || 1;
  const pieces = Math.max(1, Math.round(Number(opts.pieces) || itemCount));
  const quantity = pieces;
  const orderDetail =
    items.map((i) => `${i.quantity}x ${i.name}`).join(", ").slice(0, 500) || "Order items";
  const grams = Number(pricing.totalWeightGrams) || 0;
  const defaultWeightKg = grams > 0 ? Math.round((grams / 1000) * 100) / 100 : 0.5;
  const weight = Math.max(0.5, Number(opts.weight) || defaultWeightKg);
  const handling =
    String(opts.handling || "").trim() === "Fragile" ? "Fragile" : "Normal";
  const invoiceDivision = Math.max(1, Math.round(Number(opts.invoiceDivision) || 1));
  const codAmount =
    opts.codAmount !== undefined && opts.codAmount !== null && opts.codAmount !== ""
      ? Math.max(0, Math.round(Number(opts.codAmount) || 0))
      : Math.round(total);

  const customerName =
    String(addr.name || "").trim() ||
    [customer.firstName, customer.lastName].filter(Boolean).join(" ").trim() ||
    String(customer.name || "").trim() ||
    "Customer";

  const street = [addr.street, addr.line1, addr.address].filter(Boolean).join(" ").trim();
  const city = String(addr.city || addr.state || addr.province || "").trim();
  const deliveryAddress = [street, city, addr.zip || addr.postcode].filter(Boolean).join(", ");

  const internalNotes = (order.internalNotes || [])
    .map((n) => String(n?.note || "").trim())
    .filter(Boolean)
    .slice(-2)
    .join(" | ");

  const remarksInput = String(opts.remarks ?? "").trim();
  const specialInstructions = (
    remarksInput ||
    [DEFAULT_POSTEX_REMARKS, internalNotes].filter(Boolean).join(" ")
  ).slice(0, 500);

  const originCity =
    String(courier.originCity || "").trim() ||
    String(general.address || "").split(",")[0]?.trim() ||
    "Gujranwala";

  const rawPhone = resolveOrderPhone(order);
  const normalized = normalizePkMobile(rawPhone);
  const orderRef = String(order.orderNumber || order._id || "").trim();

  return {
    orderRefNumber: orderRef,
    invoicePayment: cod ? codAmount : 0,
    orderDetail,
    customerName,
    customerPhone: normalized || "",
    deliveryAddress: deliveryAddress || city || "Address not provided",
    originCityName: originCity,
    cityName: city,
    quantity,
    weight,
    orderType: "Normal",
    airwayBillCopies: 1,
    pickupAddressCode: pickupAddressCode || "",
    handling,
    pieces,
    invoiceDivision,
    paymentMethod: cod ? "COD" : "Prepaid",
    specialInstructions,
  };
}

function classifyCreateError(status, json, networkError) {
  if (networkError) {
    return { success: false, error: "Could not connect to Postex. Please try again." };
  }
  const raw = String(
    json?.message || json?.statusMessage || json?.error || json?.dist?.message || ""
  ).trim();
  const msg = raw.toLowerCase();

  if (msg.includes("city") && (msg.includes("service") || msg.includes("operational") || msg.includes("invalid"))) {
    return {
      success: false,
      error: "Destination city is not serviceable by Postex. Check the city name and try again.",
    };
  }
  if (
    msg.includes("phone") ||
    msg.includes("mobile") ||
    msg.includes("mobile number") ||
    msg.includes("phone number")
  ) {
    return {
      success: false,
      error: raw || "Postex rejected the phone number. Please use format 03XXXXXXXXX",
    };
  }
  if (status === 401 || status === 403) {
    return { success: false, error: "Postex API key is invalid or unauthorized." };
  }
  if (raw) return { success: false, error: raw };
  return { success: false, error: "Postex could not book this shipment." };
}

function parseCreateOrderResponse(json) {
  const dist = json?.dist || json?.data || json;
  const trackingNumber = pick(
    dist,
    "trackingNumber",
    "trackingNo",
    "trackNumber",
    "consignmentNo"
  );
  if (!trackingNumber) return null;

  const label =
    pick(dist, "label", "airwayBill", "airwayBillPdf", "labelPdf") ||
    (typeof dist?.labelData === "string" ? dist.labelData : "");

  return {
    success: true,
    trackingNumber,
    orderReference: pick(dist, "orderReference", "orderRefNumber", "referenceNumber"),
    label: label || "",
  };
}

async function postexFetch(url, { apiKey, method = "GET", body }) {
  const init = {
    method,
    headers: {
      token: apiKey,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  };
  if (body && method !== "GET") {
    init.body = JSON.stringify(body);
  }
  return fetch(url, init);
}

let citiesCache = { at: 0, list: null };

export async function fetchPostexOperationalCities(apiKey) {
  if (!apiKey) return [];
  const now = Date.now();
  if (citiesCache.list && now - citiesCache.at < 60 * 60 * 1000) {
    return citiesCache.list;
  }
  const url = `${POSTEX_CITIES_API_BASE}/get-operational-cities`;
  try {
    const res = await postexFetch(url, { apiKey });
    const json = await res.json().catch(() => ({}));
    const raw =
      json?.dist ||
      json?.data ||
      json?.operationalCities ||
      json?.cities ||
      (Array.isArray(json) ? json : []);
    const list = (Array.isArray(raw) ? raw : [])
      .map((c) => {
        if (typeof c === "string") return c.trim();
        return String(c?.cityName || c?.name || c?.operationalCityName || "").trim();
      })
      .filter(Boolean);
    citiesCache = { at: now, list };
    return list;
  } catch {
    return [];
  }
}

export async function validatePostexDestinationCity(cityName, apiKey) {
  const city = String(cityName || "").trim();
  if (!city) {
    return { ok: false, error: "Shipping city is required for Postex booking." };
  }
  const cities = await fetchPostexOperationalCities(apiKey);
  if (!cities.length) {
    return { ok: true, matched: city };
  }
  const lower = city.toLowerCase();
  const matched = cities.find((c) => c.toLowerCase() === lower || c.toLowerCase().includes(lower) || lower.includes(c.toLowerCase()));
  if (!matched) {
    return {
      ok: false,
      error: `"${city}" is not a Postex serviceable city. Choose a valid operational city.`,
    };
  }
  return { ok: true, matched };
}

export async function createPostexShipment(orderData, options = {}) {
  const order = orderData?.order || orderData;
  const settings = orderData?.settings || options.settings || {};
  const apiKey = resolvePostexApiKey(settings.courier);
  if (!apiKey) {
    return { success: false, error: "Postex API key not configured. Set POSTEX_API_KEY or add it in Settings → Courier." };
  }

  const rawPhone = resolveOrderPhone(order);
  const normalized = normalizePkMobile(rawPhone);
  if (!normalized || !isValidPostexMobile(normalized)) {
    return {
      success: false,
      error: invalidPhoneError(rawPhone, normalized),
    };
  }

  const bookingOptions = options.bookingOptions || {};
  const payload = buildPostexCreatePayload(order, settings, bookingOptions);
  payload.customerPhone = normalized;

  if (!payload.pickupAddressCode) {
    return {
      success: false,
      error:
        "Postex Pickup Address Code is required. Add it in Settings → Courier (from Postex portal → Pickup Addresses).",
    };
  }
  if (!payload.cityName) {
    return { success: false, error: "Shipping city is required for Postex booking." };
  }

  const cityCheck = await validatePostexDestinationCity(payload.cityName, apiKey);
  if (!cityCheck.ok) {
    return { success: false, error: cityCheck.error };
  }
  if (cityCheck.matched) {
    payload.cityName = cityCheck.matched;
  }

  const createUrl = `${POSTEX_ORDER_API_BASE}/create-order`;

  async function attempt(allowRetry) {
    try {
      const res = await postexFetch(createUrl, { apiKey, method: "POST", body: payload });
      const json = await res.json().catch(() => ({}));
      const apiStatus = String(json?.status || "").toUpperCase();
      if (apiStatus === "ERROR" || apiStatus === "FAILED") {
        return classifyCreateError(res.status, json, false);
      }
      const parsed = parseCreateOrderResponse(json);
      if (parsed) return parsed;
      if (!res.ok) return classifyCreateError(res.status, json, false);
      return classifyCreateError(res.status, json, false);
    } catch (err) {
      if (allowRetry) return attempt(false);
      return classifyCreateError(0, null, true);
    }
  }

  return attempt(true);
}

export async function fetchPostexLabel(trackingNumber, options = {}) {
  const id = String(trackingNumber || "").trim();
  if (!id) return { success: false, error: "Tracking number required." };

  const apiKey = resolvePostexApiKey(options.settingsCourier);
  if (!apiKey) return { success: false, error: "Postex API key not configured." };

  const endpoints = [
    `${POSTEX_ORDER_API_BASE}/get-airway-bill?trackingNumber=${encodeURIComponent(id)}`,
    `${POSTEX_ORDER_API_BASE}/print-label?trackingNumber=${encodeURIComponent(id)}`,
    `${POSTEX_CITIES_API_BASE}/get-airway-bill?trackingNumber=${encodeURIComponent(id)}`,
  ];

  for (const url of endpoints) {
    try {
      const res = await postexFetch(url, { apiKey });
      const json = await res.json().catch(() => ({}));
      const dist = json?.dist || json?.data || json;
      const label =
        (typeof dist === "string" ? dist : "") ||
        pick(dist, "label", "airwayBill", "pdf", "base64") ||
        pick(json, "label", "airwayBill");
      if (label) {
        return { success: true, label, contentType: "application/pdf" };
      }
      if (res.ok && json?.status === "OK" && json?.dist) {
        const asStr = JSON.stringify(json.dist);
        if (asStr.length > 100) {
          return { success: true, label: pick(json.dist, "label", "airwayBill") || asStr, contentType: "application/pdf" };
        }
      }
    } catch {
      /* try next endpoint */
    }
  }

  return { success: false, error: "Label not available from Postex for this tracking number." };
}
