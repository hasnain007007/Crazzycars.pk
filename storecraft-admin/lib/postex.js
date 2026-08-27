/**
 * Postex Merchant API — order tracking (v3).
 * @see https://api.postex.pk/services/integration/api/order/v3/
 */

export const POSTEX_ORDER_API_BASE =
  "https://api.postex.pk/services/integration/api/order/v3";

export const POSTEX_CITIES_API_BASE =
  "https://api.postex.pk/services/integration/api/order/v2";

/** Single-parcel tracking lives on v1 (not v3 get-order-detail). */
export const POSTEX_TRACK_API_BASE =
  "https://api.postex.pk/services/integration/api/order/v1";

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

/**
 * Customer-facing tracking page (preferred in WhatsApp / emails).
 *
 * Priority:
 * 1. NEXT_PUBLIC_TRACKING_PAGE_URL (full page URL without query, e.g. https://admin…/track-order)
 * 2. NEXT_PUBLIC_ADMIN_URL + /track-order (works while crazzycars.pk is still on Shopify)
 * 3. storeUrl / NEXT_PUBLIC_STORE_URL + /track-order (after storefront cutover)
 */
export function storefrontTrackingUrl(trackingNumber, storeUrl = "") {
  const id = String(trackingNumber || "").trim();
  if (!id) return "";

  const dedicated = String(process.env.NEXT_PUBLIC_TRACKING_PAGE_URL || "")
    .trim()
    .replace(/\/$/, "");
  if (dedicated) {
    return `${dedicated}?tracking=${encodeURIComponent(id)}`;
  }

  const adminBase = String(process.env.NEXT_PUBLIC_ADMIN_URL || "")
    .trim()
    .replace(/\/$/, "");
  if (adminBase) {
    return `${adminBase}/track-order?tracking=${encodeURIComponent(id)}`;
  }

  const siteBase = String(
    storeUrl || process.env.NEXT_PUBLIC_STORE_URL || process.env.NEXT_PUBLIC_APP_URL || ""
  )
    .trim()
    .replace(/\/$/, "");
  if (siteBase) {
    return `${siteBase}/track-order?tracking=${encodeURIComponent(id)}`;
  }

  // Last resort — branded production admin host
  return `https://admin.crazzycars.pk/track-order?tracking=${encodeURIComponent(id)}`;
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

  // Correct endpoint: GET /order/v1/track-order/{trackingNumber}
  const url = `${POSTEX_TRACK_API_BASE}/track-order/${encodeURIComponent(id)}`;

  let res;
  try {
    res = await fetch(url, {
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

  const apiStatus = String(json?.statusCode || json?.status || "").toUpperCase();
  if (apiStatus === "ERROR" || apiStatus === "FAILED") {
    return classifyPostexError(res.status, json, false);
  }
  if (apiStatus && apiStatus !== "200" && !json?.dist) {
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
  const storeTrack = storefrontTrackingUrl(trackingNumber, storeUrl);
  return `Your ${storeName} order #${orderNumber} has been shipped!\n\nTrack your order:\n${storeTrack || postexPublicTrackingUrl(trackingNumber)}`;
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

/** PostEx create-order `orderType` values (shipment type, not handling). */
export const POSTEX_SHIP_TYPES = ["Normal", "Reversed", "Replacement", "Overland"];

export function normalizePostexShipType(raw, fallback = "Normal") {
  const v = String(raw || fallback || "Normal").trim();
  return POSTEX_SHIP_TYPES.includes(v) ? v : fallback || "Normal";
}

export function isPrepaidOrder(order) {
  const pm = String(order?.paymentMethod || "").toLowerCase();
  if (pm === "stripe" || pm === "paypal") return true;
  if (String(order?.paymentStatus || "").toLowerCase() === "paid") return true;
  const advance = ["jazzcash", "easypaisa", "bank", "transfer", "hbl", "meezan", "ubl"];
  return advance.some((k) => pm.includes(k));
}

export function isCodOrder(order, bookingOptions = {}, settingsCourier = {}) {
  const pm = String(bookingOptions.paymentMethod || "").trim();
  if (pm) return pm.toUpperCase() === "COD";
  // When enabled, paid / prepaid orders are booked with invoicePayment 0.
  if (settingsCourier.paidOrdersCodZero !== false && isPrepaidOrder(order)) {
    return false;
  }
  return !isPrepaidOrder(order);
}

/**
 * COD amount sent to PostEx as invoicePayment.
 * Uses explicit override when provided; otherwise partial remaining COD or order total.
 */
export function resolvePostexCodAmount(order, bookingOptions = {}, settingsCourier = {}) {
  const opts = normalizeBookingOptions(bookingOptions);
  const cod = isCodOrder(order, opts, settingsCourier);
  const forcePaidZero = Boolean(settingsCourier.paidOrdersCodZero) && isPrepaidOrder(order);
  if (forcePaidZero || !cod) return 0;

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
    if (Number.isFinite(remaining) && remaining >= 0) {
      return Math.round(remaining);
    }
  }

  const pricing = order.pricing || {};
  const total = Math.max(0, Number(pricing.total ?? order.total) || 0);
  return Math.round(total);
}

function normalizeBookingOptions(bookingOptions) {
  if (typeof bookingOptions === "string") {
    return { pickupAddressCode: bookingOptions };
  }
  return bookingOptions && typeof bookingOptions === "object" ? bookingOptions : {};
}

/** Collapse whitespace + lowercase for address duplicate detection. */
function normalizeAddressCompare(raw) {
  return String(raw || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Checkout mirrors street into line1 + address — never join those raw.
 * Keep the longest unique line; append only truly different parts (e.g. street2).
 */
export function buildCleanStreetAddress(addr = {}) {
  const candidates = [addr.street, addr.line1, addr.address, addr.street2, addr.line2]
    .map((s) => String(s || "").trim())
    .filter(Boolean);

  let result = "";
  for (const part of candidates) {
    const n = normalizeAddressCompare(part);
    if (!n) continue;
    if (!result) {
      result = part;
      continue;
    }
    const rn = normalizeAddressCompare(result);
    if (rn === n) continue;
    if (rn.includes(n)) continue;
    if (n.includes(rn)) {
      result = part;
      continue;
    }
    result = `${result}, ${part}`;
  }
  return result.trim();
}

/**
 * PostEx deliveryAddress = street (+ area/zip if distinct).
 * City stays in cityName only — do not re-append it (avoids double/triple text).
 */
export function buildPostexDeliveryAddress(addr = {}, cityName = "") {
  const street = buildCleanStreetAddress(addr);
  const area = String(addr.area || "").trim();
  const zip = String(addr.zip || addr.postcode || "").trim();
  const parts = [];
  let blob = "";

  function pushUnique(part) {
    const p = String(part || "").trim();
    if (!p) return;
    const n = normalizeAddressCompare(p);
    if (!n) return;
    if (normalizeAddressCompare(blob).includes(n)) return;
    parts.push(p);
    blob = parts.join(", ");
  }

  pushUnique(street);
  pushUnique(area);
  pushUnique(zip);

  // Last resort only — prefer empty street over repeating city into address.
  if (!parts.length) {
    const city = String(cityName || addr.city || "").trim();
    if (city) return city;
  }
  return parts.join(", ");
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
  const invoicePayment = resolvePostexCodAmount(order, opts, courier);
  const items = Array.isArray(order.items) ? order.items : [];
  const itemCount = items.reduce((s, i) => s + Math.max(1, Number(i.quantity) || 1), 0) || 1;
  const pieces = Math.max(1, Math.round(Number(opts.pieces) || itemCount));
  const quantity = pieces;
  const orderDetail =
    items.map((i) => `${i.quantity}x ${i.name}`).join(", ").slice(0, 500) || "Order items";
  const grams = Number(pricing.totalWeightGrams) || 0;
  const defaultWeightFromSettings = Number(courier.defaultWeight) || 0.5;
  const defaultWeightKg =
    grams > 0 ? Math.round((grams / 1000) * 100) / 100 : defaultWeightFromSettings;
  const weight = Math.max(0.5, Number(opts.weight) || defaultWeightKg);
  const handlingRaw = String(opts.handling || courier.defaultHandling || "").trim();
  const handling = handlingRaw === "Fragile" ? "Fragile" : "Normal";
  const invoiceDivision = Math.max(1, Math.round(Number(opts.invoiceDivision) || 1));

  const customerName =
    String(opts.customerName || "").trim() ||
    String(addr.name || "").trim() ||
    [customer.firstName, customer.lastName].filter(Boolean).join(" ").trim() ||
    String(customer.name || "").trim() ||
    "Customer";

  const overrideCity = String(opts.cityName || opts.city || "").trim();
  const city = overrideCity || String(addr.city || addr.state || addr.province || "").trim();
  const overrideDelivery = String(opts.deliveryAddress || "").trim();
  const deliveryAddress =
    overrideDelivery ||
    buildPostexDeliveryAddress(addr, city) ||
    city ||
    "Address not provided";

  const internalNotes = (order.internalNotes || [])
    .map((n) => String(n?.note || "").trim())
    .filter(Boolean)
    .slice(-2)
    .join(" | ");

  const remarksInput = String(opts.remarks ?? "").trim();
  const shipperRemarks =
    String(courier.shipperRemarks || "").trim() || DEFAULT_POSTEX_REMARKS;
  const includeOrderNotes = Boolean(courier.addOrderNotesInRemarks);
  // PostEx label "Remarks" maps to create-order field `transactionNotes` (not specialInstructions).
  const transactionNotes = [
    remarksInput || shipperRemarks,
    includeOrderNotes ? internalNotes : "",
  ]
    .filter(Boolean)
    .join(" | ")
    .slice(0, 500);

  const originCity =
    String(courier.originCity || "").trim() ||
    String(general.address || "").split(",")[0]?.trim() ||
    "Gujranwala";

  const rawPhone = resolveOrderPhone(order);
  const normalized = normalizePkMobile(rawPhone);
  const orderRef = String(order.orderNumber || order._id || "").trim();

  return {
    orderRefNumber: orderRef,
    invoicePayment,
    orderDetail,
    customerName,
    customerPhone: normalized || "",
    deliveryAddress: deliveryAddress || city || "Address not provided",
    originCityName: originCity,
    cityName: city,
    quantity,
    weight,
    orderType: normalizePostexShipType(opts.type || courier.defaultShipperType, "Normal"),
    airwayBillCopies: 1,
    pickupAddressCode: pickupAddressCode || "",
    handling,
    pieces,
    invoiceDivision,
    paymentMethod: invoicePayment > 0 ? "COD" : "Prepaid",
    /** Official PostEx field shown as Remarks on airway bill / invoice PDF */
    transactionNotes,
    /** Kept for older integrations / debugging — PostEx label uses transactionNotes */
    specialInstructions: transactionNotes,
    remarks: transactionNotes,
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

/** PostEx uses singular `get-operational-city` (v1 raw array, v2 `{ dist: [] }`). */
const POSTEX_CITY_ENDPOINTS = [
  `${POSTEX_CITIES_API_BASE}/get-operational-city`,
  `${POSTEX_TRACK_API_BASE}/get-operational-city`,
];

function parseOperationalCitiesPayload(json) {
  const raw =
    json?.dist ||
    json?.data ||
    json?.operationalCities ||
    json?.cities ||
    (Array.isArray(json) ? json : []);
  return (Array.isArray(raw) ? raw : [])
    .map((c) => {
      if (typeof c === "string") return c.trim();
      return String(c?.operationalCityName || c?.cityName || c?.name || "").trim();
    })
    .filter(Boolean);
}

export async function fetchPostexOperationalCities(apiKey) {
  if (!apiKey) return [];
  const now = Date.now();
  if (citiesCache.list?.length && now - citiesCache.at < 60 * 60 * 1000) {
    return citiesCache.list;
  }
  for (const url of POSTEX_CITY_ENDPOINTS) {
    try {
      const res = await postexFetch(url, { apiKey });
      if (!res.ok) continue;
      const json = await res.json().catch(() => ({}));
      const list = parseOperationalCitiesPayload(json);
      if (list.length) {
        citiesCache = { at: now, list };
        return list;
      }
    } catch {
      /* try next */
    }
  }
  return citiesCache.list?.length ? citiesCache.list : [];
}

const CITY_STOPWORDS = new Set([
  "pakistan",
  "pk",
  "district",
  "dist",
  "tehsil",
  "tehseel",
  "tahsil",
  "city",
  "town",
  "village",
  "near",
  "mohalla",
  "muhalla",
  "colony",
  "phase",
  "street",
  "road",
  "rd",
  "house",
  "no",
  "number",
  "plot",
  "block",
  "sector",
  "the",
  "and",
  "of",
  "area",
  "uc",
  "union",
  "council",
]);

const CITY_ALIASES = {
  lhr: "LAHORE",
  khi: "KARACHI",
  isb: "ISLAMABAD",
  rwp: "RAWALPINDI",
  fsd: "FAISALABAD",
  gwr: "GUJRANWALA",
  gujranwala: "GUJRANWALA",
  "gujran wala": "GUJRANWALA",
  "lahore city": "LAHORE",
  "karachi city": "KARACHI",
  "islamabad capital": "ISLAMABAD",
  "rawalpindi cantt": "RAWALPINDI",
  "fatehjang": "FATEH JANG",
  "fateh jang": "FATEH JANG",
  "fateh jung": "FATEH JANG",
  "tehseel fatehjang": "FATEH JANG",
  "tehsil fatehjang": "FATEH JANG",
  "tehsil fateh jang": "FATEH JANG",
  attock: "ATTOCK",
  "attock city": "ATTOCK",
  "district attock": "ATTOCK",
  bahawalnagar: "BAHAWALNAGAR",
  "bahawal nagar": "BAHAWALNAGAR",
};

export function normalizeCityKey(raw) {
  return String(raw || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compactCityKey(raw) {
  return normalizeCityKey(raw).replace(/\s+/g, "");
}

function stripCityNoise(raw) {
  const tokens = normalizeCityKey(raw)
    .split(" ")
    .filter((t) => t && !CITY_STOPWORDS.has(t) && !/^\d+$/.test(t));
  return tokens.join(" ");
}

function levenshtein(a, b) {
  const s = String(a || "");
  const t = String(b || "");
  if (s === t) return 0;
  if (!s.length) return t.length;
  if (!t.length) return s.length;
  const rows = s.length + 1;
  const cols = t.length + 1;
  const prev = new Array(cols);
  const curr = new Array(cols);
  for (let j = 0; j < cols; j++) prev[j] = j;
  for (let i = 1; i < rows; i++) {
    curr[0] = i;
    const sc = s.charCodeAt(i - 1);
    for (let j = 1; j < cols; j++) {
      const cost = sc === t.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j < cols; j++) prev[j] = curr[j];
  }
  return prev[t.length];
}

function findCityByAliasOrExact(needle, cities) {
  const key = normalizeCityKey(needle);
  const compact = compactCityKey(needle);
  if (!key) return "";

  const aliasTarget = CITY_ALIASES[key] || CITY_ALIASES[compact];
  if (aliasTarget) {
    const hit = cities.find((c) => normalizeCityKey(c) === normalizeCityKey(aliasTarget));
    if (hit) return hit;
  }

  const exact = cities.find((c) => normalizeCityKey(c) === key || compactCityKey(c) === compact);
  return exact || "";
}

/**
 * Map messy customer city/address text → PostEx operational city name.
 * Uses exact, alias, substring, token, and fuzzy (edit-distance) matching.
 */
export function resolvePostexCityName(input, cities, extras = {}) {
  const list = Array.isArray(cities) ? cities.filter(Boolean) : [];
  const rawCity = String(input || "").trim();
  const haystack = [
    rawCity,
    extras.street,
    extras.state,
    extras.province,
    extras.address,
  ]
    .map((v) => String(v || "").trim())
    .filter(Boolean)
    .join(" ");

  if (!rawCity && !haystack) {
    return { ok: false, matched: "", reason: "CITY_EMPTY", suggestions: [] };
  }
  if (!list.length) {
    return { ok: true, matched: rawCity, reason: "NO_CITY_LIST", suggestions: [] };
  }

  const forced = findCityByAliasOrExact(rawCity, list);
  if (forced) return { ok: true, matched: forced, reason: "EXACT", suggestions: [] };

  const cleanedCity = stripCityNoise(rawCity);
  const cleanedCityHit = findCityByAliasOrExact(cleanedCity, list);
  if (cleanedCityHit) {
    return { ok: true, matched: cleanedCityHit, reason: "CLEANED", suggestions: [] };
  }

  const hayKey = stripCityNoise(haystack) || normalizeCityKey(haystack);
  const hayCompact = compactCityKey(hayKey);
  const hayTokens = hayKey.split(" ").filter((t) => t.length >= 3);

  let best = null;
  const scored = [];

  for (const city of list) {
    const cityKey = normalizeCityKey(city);
    const cityCompact = compactCityKey(city);
    if (!cityCompact || cityCompact.length < 3) continue;

    let score = 0;
    let reason = "";

    if (hayCompact === cityCompact) {
      score = 10000 + cityCompact.length;
      reason = "COMPACT_EXACT";
    } else if (hayCompact.includes(cityCompact)) {
      // Prefer longer city names (FATEH JANG over ATTOCK when both appear).
      score = 8000 + cityCompact.length * 10;
      reason = "CONTAINS";
    } else if (cityCompact.includes(hayCompact) && hayCompact.length >= 4) {
      score = 7000 + hayCompact.length;
      reason = "CITY_CONTAINS_INPUT";
    } else {
      const cityTokens = cityKey.split(" ").filter(Boolean);
      const allTokensPresent =
        cityTokens.length > 0 &&
        cityTokens.every((ct) =>
          hayTokens.some(
            (ht) =>
              ht === ct ||
              compactCityKey(ht) === compactCityKey(ct) ||
              (ct.length >= 4 && ht.includes(ct)) ||
              (ht.length >= 4 && ct.includes(ht))
          )
        );
      if (allTokensPresent) {
        score = 6000 + cityCompact.length * 8;
        reason = "TOKENS";
      } else {
        // Fuzzy: compare compact city to each hay token / sliding join
        let minDist = Infinity;
        for (const ht of hayTokens) {
          const hc = compactCityKey(ht);
          if (hc.length < 4) continue;
          minDist = Math.min(minDist, levenshtein(hc, cityCompact));
          if (cityTokens.length > 1) {
            minDist = Math.min(minDist, levenshtein(hc, compactCityKey(cityTokens.join(""))));
          }
        }
        // Also compare cleaned city string alone
        const cleanedCompact = compactCityKey(cleanedCity);
        if (cleanedCompact.length >= 4) {
          minDist = Math.min(minDist, levenshtein(cleanedCompact, cityCompact));
        }
        const maxLen = Math.max(cityCompact.length, cleanedCompact.length || 1);
        const threshold = cityCompact.length <= 5 ? 1 : cityCompact.length <= 9 ? 2 : 3;
        if (minDist <= threshold && minDist < Infinity) {
          score = 4000 + Math.round((1 - minDist / maxLen) * 500) + cityCompact.length;
          reason = "FUZZY";
        }
      }
    }

    if (score > 0) {
      scored.push({ city, score, reason });
      if (!best || score > best.score) best = { city, score, reason };
    }
  }

  scored.sort((a, b) => b.score - a.score);
  const suggestions = [...new Set(scored.slice(0, 5).map((s) => s.city))];

  if (best && best.score >= 4000) {
    return {
      ok: true,
      matched: best.city,
      reason: best.reason,
      suggestions,
      original: rawCity,
    };
  }

  return {
    ok: false,
    matched: "",
    reason: "CITY_MISMATCH",
    suggestions,
    original: rawCity,
  };
}

let merchantAddressCache = { at: 0, list: null };

/**
 * Merchant pickup / return addresses registered in PostEx portal.
 */
export async function fetchPostexMerchantAddresses(apiKey) {
  if (!apiKey) return [];
  const now = Date.now();
  if (merchantAddressCache.list && now - merchantAddressCache.at < 30 * 60 * 1000) {
    return merchantAddressCache.list;
  }
  const url = `${POSTEX_TRACK_API_BASE}/get-merchant-address`;
  try {
    const res = await postexFetch(url, { apiKey });
    const json = await res.json().catch(() => ({}));
    const raw = json?.dist || json?.data || [];
    const list = (Array.isArray(raw) ? raw : [])
      .map((a) => ({
        addressCode: String(a?.addressCode || "").trim(),
        address: String(a?.address || "").trim(),
        cityName: String(a?.cityName || "").trim(),
        contactPersonName: String(a?.contactPersonName || "").trim(),
        phone1: String(a?.phone1 || "").trim(),
        phone2: String(a?.phone2 || "").trim(),
        addressType: String(a?.addressType || "").trim(),
        merchantAddressId: a?.merchantAddressId,
      }))
      .filter((a) => a.addressCode);
    merchantAddressCache = { at: now, list };
    return list;
  } catch {
    return [];
  }
}

export async function validatePostexDestinationCity(cityName, apiKey, extras = {}) {
  const city = String(cityName || "").trim();
  if (!city && !extras.street && !extras.state) {
    return { ok: false, error: "Shipping city is required for Postex booking." };
  }
  const cities = await fetchPostexOperationalCities(apiKey);
  const resolved = resolvePostexCityName(city, cities, extras);
  if (resolved.ok && resolved.matched) {
    return {
      ok: true,
      matched: resolved.matched,
      reason: resolved.reason,
      original: city,
      suggestions: resolved.suggestions || [],
    };
  }
  const hint = resolved.suggestions?.length
    ? ` Did you mean: ${resolved.suggestions.slice(0, 3).join(", ")}?`
    : " Map the city in PostEx → Add Booking, or fix the shipping city on the order.";
  return {
    ok: false,
    error: `"${city || "unknown"}" is not a Postex serviceable city.${hint}`,
    suggestions: resolved.suggestions || [],
    original: city,
  };
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
  const addr = order.shippingAddress || {};
  if (!payload.cityName) {
    return { success: false, error: "Shipping city is required for Postex booking." };
  }

  const cityCheck = await validatePostexDestinationCity(payload.cityName, apiKey, {
    street: addr.street || addr.line1 || addr.address || "",
    state: addr.state || addr.province || "",
  });
  if (!cityCheck.ok) {
    return {
      success: false,
      error: cityCheck.error,
      suggestions: cityCheck.suggestions || [],
    };
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
        // If PostEx still rejects city, try top suggestion once.
        const classified = classifyCreateError(res.status, json, false);
        if (
          allowRetry &&
          classified.error?.toLowerCase().includes("city") &&
          cityCheck.suggestions?.length
        ) {
          const next = cityCheck.suggestions.find((c) => c !== payload.cityName);
          if (next) {
            payload.cityName = next;
            return attempt(false);
          }
        }
        return classified;
      }
      const parsed = parseCreateOrderResponse(json);
      if (parsed) {
        return {
          ...parsed,
          matchedCity: payload.cityName,
          cityResolvedFrom: cityCheck.original || "",
          cityMatchReason: cityCheck.reason || "",
        };
      }
      if (!res.ok) return classifyCreateError(res.status, json, false);
      return classifyCreateError(res.status, json, false);
    } catch (err) {
      if (allowRetry) return attempt(false);
      return classifyCreateError(0, null, true);
    }
  }

  return attempt(true);
}

export async function fetchPostexLabel(trackingNumberOrList, options = {}) {
  const ids = (
    Array.isArray(trackingNumberOrList)
      ? trackingNumberOrList
      : String(trackingNumberOrList || "").split(",")
  )
    .map((s) => String(s || "").trim())
    .filter(Boolean);
  if (!ids.length) return { success: false, error: "Tracking number required." };

  const apiKey = resolvePostexApiKey(options.settingsCourier);
  if (!apiKey) return { success: false, error: "Postex API key not configured." };

  function labelFromJson(json) {
    const dist = json?.dist || json?.data || json;
    return (
      (typeof dist === "string" && dist.length > 80 ? dist : "") ||
      pick(dist, "label", "airwayBill", "pdf", "base64") ||
      pick(json, "label", "airwayBill") ||
      ""
    );
  }

  function isPdfBuffer(buf) {
    return buf?.length > 80 && buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46;
  }

  // Official PostEx invoice/label endpoint — supports multiple CNs in one PDF.
  const invoiceUrl = `${POSTEX_TRACK_API_BASE}/get-invoice?trackingNumbers=${encodeURIComponent(ids.join(","))}`;
  try {
    const res = await postexFetch(invoiceUrl, { apiKey });
    const buf = Buffer.from(await res.arrayBuffer());
    if (res.ok && isPdfBuffer(buf)) {
      return { success: true, label: buf.toString("base64"), contentType: "application/pdf" };
    }
    if (buf.length > 20) {
      try {
        const json = JSON.parse(buf.toString("utf8"));
        const label = labelFromJson(json);
        if (label) return { success: true, label, contentType: "application/pdf" };
      } catch {
        /* not json */
      }
    }
  } catch {
    /* fall through */
  }

  // Single-CN fallbacks only (legacy endpoints).
  if (ids.length === 1) {
    const id = ids[0];
    const endpoints = [
      `${POSTEX_ORDER_API_BASE}/get-airway-bill?trackingNumber=${encodeURIComponent(id)}`,
      `${POSTEX_ORDER_API_BASE}/print-label?trackingNumber=${encodeURIComponent(id)}`,
      `${POSTEX_CITIES_API_BASE}/get-airway-bill?trackingNumber=${encodeURIComponent(id)}`,
    ];

    for (const url of endpoints) {
      try {
        const res = await postexFetch(url, { apiKey });
        const buf = Buffer.from(await res.arrayBuffer());
        if (res.ok && isPdfBuffer(buf)) {
          return { success: true, label: buf.toString("base64"), contentType: "application/pdf" };
        }
        try {
          const json = JSON.parse(buf.toString("utf8"));
          const label = labelFromJson(json);
          if (label) return { success: true, label, contentType: "application/pdf" };
        } catch {
          /* try next */
        }
      } catch {
        /* try next endpoint */
      }
    }
  }

  return {
    success: false,
    error:
      ids.length > 1
        ? "Combined labels not available from Postex for these tracking numbers."
        : "Label not available from Postex for this tracking number.",
  };
}

/**
 * Cancel a booked PostEx parcel (blocked after pick-up by PostEx).
 */
export async function cancelPostexOrder(trackingNumber, options = {}) {
  const id = String(trackingNumber || "").trim();
  if (!id) return { success: false, error: "Tracking number required." };
  const apiKey = resolvePostexApiKey(options.settingsCourier);
  if (!apiKey) return { success: false, error: "Postex API key not configured." };

  const url = `${POSTEX_TRACK_API_BASE}/cancel-order`;
  try {
    const res = await postexFetch(url, {
      apiKey,
      method: "PUT",
      body: { trackingNumber: id },
    });
    const json = await res.json().catch(() => ({}));
    const apiStatus = String(json?.status || "").toUpperCase();
    if (!res.ok || apiStatus === "ERROR" || apiStatus === "FAILED") {
      return {
        success: false,
        error:
          pick(json, "message", "statusMessage", "error") ||
          pick(json?.dist, "message") ||
          `Could not cancel shipment (${res.status}).`,
      };
    }
    return { success: true, data: json?.dist || json?.data || json };
  } catch (e) {
    return { success: false, error: e.message || "Cancel request failed." };
  }
}
