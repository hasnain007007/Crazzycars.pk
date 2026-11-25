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

/**
 * Default Select API when Settings / booking form has no override.
 * Live probe (21 Nov 2026): Leopard2/M&P CreateOrder returns
 * "does not service the selected destination city or service type" for Karachi/Lahore
 * on this account; Trax and TCS succeed. Prefer Trax.
 */
export const RUN_COURIER_DEFAULT_API = "Trax";

/** Account rule from live CreateOrder: Zero COD rejected; minimum collection is Rs. 500. */
export const RUN_COURIER_MIN_COD = 500;

/** Digi/Leopard CreateOrder: "Special Instructions must be between 0 and 190 characters." */
export const RUN_COURIER_SPECIAL_INSTRUCTION_MAX = 190;

/** Friendly label for Select API options (UI only). */
export function runCourierApiLabel(api) {
  const v = String(api || "").trim();
  if (!v) return "Trax";
  // Digi / RC aliases → clean brand label (avoid "RunCourier-Tcs" in the dropdown).
  const canon = canonicalizeRunCourierSelectTitle(v);
  if (/^leopard2$/i.test(canon) || /^leopards$/i.test(canon)) return "Leopards";
  if (/^leopard$/i.test(canon)) return "Leopard";
  if (canon !== v) return canon;
  return v;
}

/**
 * Map Digi/RC portal titles onto our canonical Select API names.
 * Keeps direct Trax/TCS/M&P ids; Digi rows still resolve via live carrier title when needed.
 */
export function canonicalizeRunCourierSelectTitle(raw) {
  const v = String(raw || "").trim();
  if (!v) return "";
  const lower = v.toLowerCase().replace(/\s+/g, " ");
  // Strip common Digi / RC prefixes: "RunCourier-trax", "RC-TCS", "Run Courier - M&P"
  const stripped = lower
    .replace(/^run\s*courier\s*[-_:.]?\s*/i, "")
    .replace(/^rc\s*[-_:.]?\s*/i, "")
    .trim();
  const key = stripped || lower;
  if (key === "auto") return "Auto";
  if (key === "trax") return "Trax";
  if (key === "tcs" || key === "tcs overnight") return "TCS";
  if (key === "m&p" || key === "mnp" || key === "m and p" || key === "m & p") return "M&P";
  if (key === "leopard2" || key === "leopards" || key === "leopard courier" || key === "leopards courier") {
    return "Leopard2";
  }
  if (key === "leopard") return "Leopard2";
  if (key === "daewoo") return "Daewoo";
  if (key === "dastaq" || key === "dastaq logistics") return "Dastaq Logistics";
  if (key === "ahl") return "AHL";
  if (key === "bluex") return "bluex";
  if (key === "dex") return "DEX";
  // Unknown Digi-only title — keep original casing for exact api_vendor match.
  return v;
}

/** Default Select API carriers shown in the portal dropdown (Trax first after Auto). */
export const RUN_COURIER_APIS = [
  "Auto",
  "Trax",
  "TCS",
  "M&P",
  "Leopard2",
  "Daewoo",
  "Dastaq Logistics",
  "AHL",
];

/**
 * Couriers to try when CreateOrder says the selected carrier does not service the lane.
 * Order is live-proven on this account (Trax/TCS book; Leopard/M&P often refuse).
 */
export const RUN_COURIER_SERVICE_FALLBACK_APIS = ["Trax", "TCS", "M&P", "Leopard2"];

/**
 * iCargos CreateOrder Select API field is `api_vendor` = "{id}|{gateway_id}".
 * Confirmed live: Leopard2 → "5|0", Trax → "6|0", M&P → "10|0".
 * Without this field, account api_default_vendor wins (Trax first on this account).
 */
export const RUN_COURIER_VENDOR_FALLBACK = {
  Trax: "6|0",
  "M&P": "10|0",
  MNP: "10|0",
  TCS: "13|0",
  Leopard2: "5|0",
  Leopards: "5|0",
  Leopard: "5|0",
  Daewoo: "8|0",
  "Dastaq Logistics": "35|0",
  Dastaq: "35|0",
  AHL: "19|0",
  // Digi aggregator gateways (title casing from getThirdpartyApiAndGateways)
  leopard: "28|1",
  trax: "28|2",
  bluex: "28|4",
  Tcs: "28|6",
};

/** Aliases → canonical Select API title used in our UI / RUN_COURIER_APIS. */
const RUN_COURIER_API_ALIASES = {
  leopards: "Leopard2",
  "leopard2": "Leopard2",
  "leopard courier": "Leopard2",
  "leopards courier": "Leopard2",
  mnp: "M&P",
  "m & p": "M&P",
  "m and p": "M&P",
};

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

/** Live carrier rows from getThirdpartyApiAndGateways (cached briefly). */
let carriersCache = { at: 0, rows: [] };

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
  const canon = canonicalizeRunCourierSelectTitle(v);
  const alias = RUN_COURIER_API_ALIASES[canon.toLowerCase()] || RUN_COURIER_API_ALIASES[v.toLowerCase()];
  if (alias) return alias;
  const hit = RUN_COURIER_APIS.find((a) => a.toLowerCase() === canon.toLowerCase());
  return hit || canon || v;
}

/** Digi titles like "RunCourier-leopard" / "leopard" count as Leopard for migrate/fallback. */
export function isLeopardSelectApi(raw) {
  const v = String(raw || "").trim().toLowerCase();
  if (!v) return false;
  return /leopard/.test(v);
}

export function displayCourierName(selectedApi) {
  const api = normalizeRunCourierApi(selectedApi, RUN_COURIER_DEFAULT_API);
  if (!api || api.toLowerCase() === "auto") return "Trax";
  if (isLeopardSelectApi(api)) return "Leopard";
  // Word-boundary checks — never treat "…tcs…" substring inside unrelated titles.
  if (/^tcs\b/i.test(api)) return "TCS";
  if (/^trax\b/i.test(api)) return "Trax";
  if (/^(m&p|mnp)\b/i.test(api)) return "M&P";
  if (/^daewoo\b/i.test(api)) return "Daewoo";
  if (/^dastaq\b/i.test(api)) return "Dastaq";
  if (/^ahl\b/i.test(api)) return "AHL";
  if (/^dex\b/i.test(api)) return "DEX";
  return runCourierApiLabel(api);
}

/**
 * Resolve the Select API for a booking.
 * Never leave "Auto" — without api_vendor the portal picks an account default.
 * Prefers Trax when empty / Auto.
 *
 * Explicit courier picks (Trax / TCS / Daewoo / Leopard2 / Digi titles) are kept as-is.
 * Soft-remap Leopard→Trax only when opts.softMigrateLeopard is true (legacy Auto path).
 */
export function resolveBookingSelectApi(raw, settingsDefault = "", opts = {}) {
  const softMigrateLeopard = opts.softMigrateLeopard === true;
  const fallback = normalizeRunCourierApi(
    settingsDefault || RUN_COURIER_DEFAULT_API,
    RUN_COURIER_DEFAULT_API
  );
  const rawTrim = String(raw || "").trim();
  let api = normalizeRunCourierApi(rawTrim || fallback, fallback);
  if (!api || String(api).toLowerCase() === "auto") {
    api = RUN_COURIER_DEFAULT_API;
  }
  // Only remap Digi/direct Leopard when caller opts in (Auto booking), so an explicit
  // "Leopards" pick is not silently rewritten to Trax → TCS fallback.
  if (softMigrateLeopard && isLeopardSelectApi(api)) {
    api = RUN_COURIER_DEFAULT_API;
  }
  return api;
}

/** True when the admin explicitly chose a courier (not Auto / empty). */
export function isExplicitRunCourierSelect(raw) {
  const v = String(raw || "").trim();
  if (!v) return false;
  return String(canonicalizeRunCourierSelectTitle(v) || v).toLowerCase() !== "auto";
}

/** True when CreateOrder failed because this courier will not take the lane/service. */
export function isRunCourierServiceRefusal(error) {
  const e = String(error || "");
  return /does not service|not.*(service|cover|deliver)|missing\s*Mappings|Invalid charges calculation/i.test(
    e
  );
}

/** True when CreateOrder failed on Zero / below-minimum COD (account rule). */
export function isRunCourierCodRefusal(error) {
  const e = String(error || "");
  return /Zero COD|Minimum COD amount|COD amount is not allowed/i.test(e);
}

/**
 * Pick a Select API value that exists in the live carriers dropdown.
 * Maps Digi/RC aliases onto canonical titles present in the list.
 */
export function pickRunCourierSelectApi(preferred, carriers = []) {
  const want = resolveBookingSelectApi(preferred, RUN_COURIER_DEFAULT_API, {
    softMigrateLeopard: false,
  });
  const list = Array.isArray(carriers) && carriers.length ? carriers : RUN_COURIER_APIS;
  const lower = (s) => String(s || "").toLowerCase();
  const exact = list.find((c) => lower(c) === lower(want));
  if (exact) return exact;
  // Preferred Digi title → canonical already in list
  const canonInList = list.find((c) => lower(canonicalizeRunCourierSelectTitle(c)) === lower(want));
  if (canonInList) return want; // keep canonical value even if list still has Digi spelling
  if (/^leopard/i.test(want)) {
    const l2 = list.find((c) => lower(canonicalizeRunCourierSelectTitle(c)) === "leopard2");
    if (l2) return "Leopard2";
  }
  return want;
}

/**
 * Build CreateOrder `api_vendor` ("{id}|{gateway_id}") for a Select API choice.
 * Returns "" for Auto / unknown — portal then uses account default vendor order.
 */
export function resolveRunCourierApiVendor(selectedApi, carrierRows = []) {
  const raw = String(selectedApi || "").trim();
  if (!raw || raw.toLowerCase() === "auto") return "";

  const rows = Array.isArray(carrierRows) ? carrierRows : [];
  const rawLower = raw.toLowerCase();
  const api = normalizeRunCourierApi(raw, "Auto");
  if (!api || api.toLowerCase() === "auto") return "";

  const vendorOf = (row) => {
    if (row?.id == null || String(row.id).toLowerCase() === "auto") return "";
    const gw = row.gateway_id != null ? row.gateway_id : 0;
    return `${row.id}|${gw}`;
  };

  // Prefer direct (non-Digi) gateway when both Digi + direct rows match the brand.
  // Digi gateway_id is typically > 0; direct Trax/TCS/M&P use gateway_id 0.
  const matches = rows.filter((r) => {
    const title = String(r.title || "").trim();
    if (!title) return false;
    if (title.toLowerCase() === rawLower || title.toLowerCase() === api.toLowerCase()) return true;
    return canonicalizeRunCourierSelectTitle(title).toLowerCase() === api.toLowerCase();
  });
  if (matches.length) {
    const direct = matches.find((r) => Number(r.gateway_id) === 0) || matches[0];
    const v = vendorOf(direct);
    if (v) return v;
  }

  if (RUN_COURIER_VENDOR_FALLBACK[api]) return RUN_COURIER_VENDOR_FALLBACK[api];
  const fbKey = Object.keys(RUN_COURIER_VENDOR_FALLBACK).find(
    (k) => k.toLowerCase() === api.toLowerCase() || k.toLowerCase() === rawLower
  );
  return fbKey ? RUN_COURIER_VENDOR_FALLBACK[fbKey] : "";
}

/**
 * Some carriers need a matching service_type (e.g. TCS + Overnight → "TCS Overnight").
 */
export function resolveRunCourierServiceForApi(selectedApi, serviceType, product) {
  const api = normalizeRunCourierApi(selectedApi, "Auto");
  const svc = String(serviceType || product || "Overnight").trim();
  const prod = String(product || serviceType || "Overnight").trim();
  if (api === "TCS") {
    if (/detained/i.test(svc) || /detained/i.test(prod)) return "TCS Detained";
    if (/overland/i.test(svc) || /overland/i.test(prod)) return "TCS Overland";
    if (!/^tcs\s/i.test(svc)) return "TCS Overnight";
  }
  return svc;
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
  const carrier = String(order.courier || order.tracking?.carrier || "")
    .trim()
    .toLowerCase();
  // Current shipment wins — a stale runCourierLabel from an earlier attempt must not
  // keep a PostEx-booked order classified as Run Courier (wrong Via / label / track).
  if (carrier.includes("postex")) return false;
  if (String(order.runCourierApi || "").trim()) return true;
  if (String(order.runCourierLabel || "").trim()) return true;
  if (!carrier) return false;
  return RUN_COURIER_CARRIER_HINTS.some((h) => carrier.includes(h));
}

export function isPostexOrder(order) {
  if (!order) return false;
  const carrier = String(order.courier || order.tracking?.carrier || "")
    .trim()
    .toLowerCase();
  if (carrier.includes("postex")) return true;
  if (isRunCourierOrder(order)) return false;
  if (!carrier || carrier === "postex") return true;
  return false;
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
 *
 * Note: this Run Courier account rejects Zero COD and requires collection ≥ RUN_COURIER_MIN_COD.
 * createRunCourierShipment surfaces that clearly instead of silently bumping prepaid to 500.
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
  // Partial remaining COD before prepaid-zero (matches PostEx / payment UI).
  if (paymentStatus === "partial") {
    const paid = Math.max(0, Math.round(Number(order?.payment?.paidAmount ?? order?.payment?.amount) || 0));
    const pricing = order.pricing || {};
    const total = Math.max(0, Math.round(Number(pricing.total ?? order.total) || 0));
    const stored = Number(order?.payment?.remainingCod);
    const live = Math.max(0, total - paid);
    if (Number.isFinite(stored) && stored >= 0) {
      return Math.round(live > 0 || paid > 0 ? live : stored);
    }
    return live;
  }
  if (forcePaidZero && (paymentStatus === "paid" || isPrepaidOrderForCod(order))) {
    return 0;
  }
  if (paymentStatus === "paid" || isPrepaidOrderForCod(order)) return 0;

  const pricing = order.pricing || {};
  return Math.round(Math.max(0, Number(pricing.total ?? order.total) || 0));
}

/** Domestic Pakistan only — Run Courier CreateOrder has no international destinations. */
export function isPakistanDomesticCountry(country) {
  const c = String(country || "").trim().toLowerCase();
  if (!c) return true; // blank treated as PK (storefront default)
  return /^(pakistan|pak|pk)$/i.test(c);
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
    return { raw: String(text) };
  }
}

function icargosErrorMessage(json) {
  if (typeof json === "string") return json;
  if (!json || typeof json !== "object") return "";
  if (typeof json.raw === "string") {
    const raw = json.raw;
    if (/busy|One moment|Retrying automatically|system is busy/i.test(raw)) {
      return "Run Courier server busy — try again in a moment.";
    }
    try {
      const inner = JSON.parse(raw);
      if (typeof inner === "string") return inner;
    } catch {
      const stripped = raw.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      return stripped.slice(0, 220) || "Run Courier returned a non-JSON error.";
    }
  }
  return pick(json, "message", "error", "alert_msg", "msg", "statusMessage");
}

function isRetryableRunCourierFailure(res) {
  const status = Number(res?.status) || 0;
  if ([429, 502, 503, 504].includes(status)) return true;
  const err = String(res?.error || "");
  const raw =
    (typeof res?.json === "string" ? res.json : "") ||
    (typeof res?.json?.raw === "string" ? res.json.raw : "") ||
    "";
  const blob = `${err}\n${raw}`;
  if (/API HTTP Error:\s*5\d\d/i.test(blob)) return true;
  if (/busy|One moment|Retrying automatically|system is busy/i.test(blob)) return true;
  return false;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Common shop city spellings → Run Courier GetCitiesList names. */
const RUN_COURIER_CITY_ALIASES = {
  khairpur: "Khairpur",
  "khair pur": "Khairpur",
  "khairpur mirs": "Khairpur Mirs",
  "khairpur mir's": "Khairpur Mirs",
  gujranwala: "Gujranwala",
  "gujranwala cantt": "Gujranwala",
  "gujranwala cantonment": "Gujranwala",
  sahiwal: "Sahiwal",
  lahore: "Lahore",
  karachi: "Karachi",
  islamabad: "Islamabad",
  rawalpindi: "Rawalpindi",
  narowal: "Narowal",
  "narowal city": "Narowal",
  "narowal district": "Narowal",
  sialkot: "Sialkot",
  "sialkot cantt": "Sialkot",
  faisalabad: "Faisalabad",
  lyallpur: "Faisalabad",
  multan: "Multan",
  peshawar: "Peshawar",
  quetta: "Quetta",
  hyderabad: "Hyderabad",
  bahawalpur: "Bahawalpur",
  sargodha: "Sargodha",
  gujrat: "Gujrat",
  sheikhupura: "Sheikhupura",
  jhelum: "Jhelum",
  "jehlum": "Jhelum",
  // Combined list spellings vary by courier (M&P Saidan / TCS saydian).
  "kallar syedan": "Kallar Saidan",
  "kallar sayedan": "Kallar Saidan",
  "kalar syedan": "Kallar Saidan",
  "kallar saidan": "Kallar Saidan",
  "kallar saydian": "Kallar Saidan",
  // AJK Bagh — prefer parenthetical when present; never Trax "Bagho Bahar".
  bagh: "Bagh",
  "bagh ajk": "Bagh (ajk)",
  "bagh (ajk)": "Bagh (ajk)",
  "bagh a.k": "Bagh (ajk)",
  "bagh (a.k)": "Bagh (ajk)",
  "bagh azad kashmir": "Bagh (ajk)",
};

/** Prefer these when auto-falling back off a courier that does not cover the town. */
const RUN_COURIER_FALLBACK_PREF = ["Trax", "TCS", "M&P", "Leopard2", "Daewoo", "AHL", "Dastaq Logistics"];

/**
 * Pick the best covering courier for a town (M&P → TCS → Trax…).
 * @param {{ vendor: string, title: string, city: string }[]} covered
 */
export function pickPreferredCoveringCourier(covered = []) {
  const rows = Array.isArray(covered) ? covered.filter((r) => r?.vendor && r?.city) : [];
  if (!rows.length) return null;
  const rank = (title) => {
    const t = String(title || "").toLowerCase();
    const idx = RUN_COURIER_FALLBACK_PREF.findIndex((p) => {
      const pLow = p.toLowerCase();
      if (pLow === "m&p") return /^(m&p|mnp)\b/.test(t) || t.includes("m&p");
      return t.includes(pLow);
    });
    return idx === -1 ? 99 : idx;
  };
  return [...rows].sort((a, b) => rank(a.title) - rank(b.title) || String(a.title).localeCompare(String(b.title)))[0];
}

/**
 * Match order city to an exact Run Courier city_name (case-sensitive API).
 * Prefer exact / alias / shortest safe match — never upgrade "Gujranwala" → "Gujranwala Cantt"
 * (Cantt origins are often disabled and return cryptic CreateOrder errors).
 */
export function matchRunCourierCity(rawCity, cityList = []) {
  const raw = String(rawCity || "").trim();
  if (!raw) return "";
  const lower = raw.toLowerCase();
  const compact = lower.replace(/[^a-z0-9]/g, "");

  const aliasKey = RUN_COURIER_CITY_ALIASES[lower] || RUN_COURIER_CITY_ALIASES[compact];
  if (aliasKey && !cityList.length) return aliasKey;

  if (!cityList.length) return raw;

  if (aliasKey) {
    const aliasHit = cityList.find((c) => String(c).toLowerCase() === aliasKey.toLowerCase());
    if (aliasHit) return aliasHit;
  }

  const exact = cityList.find((c) => String(c).toLowerCase() === lower);
  if (exact) return exact;

  const compactHit = cityList
    .filter((c) => String(c).toLowerCase().replace(/[^a-z0-9]/g, "") === compact)
    .sort((a, b) => a.length - b.length);
  if (compactHit.length) return compactHit[0];

  const scored = [];
  for (const c of cityList) {
    const cl = String(c).toLowerCase();
    if (cl === lower) {
      scored.push({ c, score: 0 });
      continue;
    }
    // Order city more specific than list entry (e.g. "Sahiwal City" → "Sahiwal")
    if (lower.startsWith(cl) && (lower.length === cl.length || /[\s-]/.test(lower[cl.length]))) {
      scored.push({ c, score: 1 + (lower.length - cl.length) });
      continue;
    }
    // List entry extends order city — only safe suffixes (Cantt/City) or parenthetical
    // region tags like "Bagh (ajk)". Never "Bagh" → "Bagho Bahar" (letter glue) or
    // unrelated multi-word upgrades.
    if (cl.startsWith(lower) && (cl.length === lower.length || /[\s-]/.test(cl[lower.length]))) {
      const rest = cl.slice(lower.length).trim();
      if (/^(cantt|cantonment|city|town|district)\b/i.test(rest)) {
        scored.push({ c, score: 50 + rest.length });
      } else if (/^\([^)]+\)$/i.test(rest)) {
        scored.push({ c, score: 8 + rest.length });
      } else if (!rest) {
        scored.push({ c, score: 0 });
      }
      // else: ignore unsafe extensions (Bagho…, Housing Scheme, etc.)
    }
  }
  if (scored.length) {
    scored.sort((a, b) => a.score - b.score || a.c.length - b.c.length);
    // Prefer non-Cantt if best score is the noisy Cantt upgrade
    const best = scored[0];
    if (best.score >= 50) {
      const base = cityList.find((c) => String(c).toLowerCase() === lower);
      if (base) return base;
    }
    return best.c;
  }

  // Same town, different spelling (Kallar Syedan / Kallar Saidan / Kallar saydian):
  // compare consonant skeletons. Only for longer names, so short towns never collide.
  // First letter must agree ("Ahmed Pur" ≠ "Hamid pur"); closest spelling wins.
  const key = citySpellingKey(raw);
  const first = compact.charAt(0);
  if (key.length >= 5 && first) {
    const hits = cityList
      .filter((c) => {
        const cc = String(c).toLowerCase().replace(/[^a-z0-9]/g, "");
        return cc.charAt(0) === first && citySpellingKey(c) === key;
      })
      .map((c) => ({ c, d: editDistance(compact, String(c).toLowerCase().replace(/[^a-z0-9]/g, "")) }))
      .sort((a, b) => a.d - b.d || String(a.c).length - String(b.c).length);
    if (hits.length) return hits[0].c;
  }

  return raw;
}

function editDistance(a, b) {
  const prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i += 1) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length];
}

/** Spelling-insensitive key: letters only, doubles collapsed, vowels (and y) dropped. */
export function citySpellingKey(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/[^a-z]/g, "")
    .replace(/(.)\1+/g, "$1")
    .replace(/[aeiouy]/g, "");
}

/** Per-courier destination lists (portal GetCitiesByApi), keyed by api_vendor "id|gateway". */
const vendorCitiesCache = new Map();

export async function fetchRunCourierCitiesForVendor(apiVendor, settingsCourier) {
  const vendor = String(apiVendor || "").trim();
  const [apiId, gatewayId = "0"] = vendor.split("|");
  if (!apiId) return [];
  const cached = vendorCitiesCache.get(vendor);
  if (cached && Date.now() - cached.at < 6 * 60 * 60 * 1000) return cached.list;
  const res = await runCourierFetch("/API/GetCitiesByApi.php", {
    method: "POST",
    body: { api_id: apiId, gateway_id: gatewayId },
    settingsCourier,
  });
  if (!res.ok) return [];
  const data = res.json?.data || res.json?.cities || [];
  const list = (Array.isArray(data) ? data : [])
    .map((c) => (typeof c === "string" ? c : c?.city_name || c?.name || c?.city || ""))
    .filter(Boolean);
  if (list.length) vendorCitiesCache.set(vendor, { at: Date.now(), list });
  return list;
}

/** City name as a specific courier spells it, or "" when that courier does not list it. */
export function matchVendorCity(rawCity, vendorCities = []) {
  const m = matchRunCourierCity(rawCity, vendorCities);
  const hit = vendorCities.find((c) => String(c).toLowerCase() === String(m || "").toLowerCase());
  return hit || "";
}

/** Other Run Courier couriers that list this city (with their spelling). */
async function couriersCoveringCity(rawCity, carrierRows, settingsCourier, skipVendor) {
  const vendors = new Map();
  for (const r of carrierRows || []) {
    if (r?.id == null || String(r.id).toLowerCase() === "auto") continue;
    vendors.set(`${r.id}|${r.gateway_id ?? 0}`, String(r.title || r.id));
  }
  if (!vendors.size) {
    for (const [title, v] of Object.entries(RUN_COURIER_VENDOR_FALLBACK)) {
      if (!vendors.has(v)) vendors.set(v, title);
    }
  }
  vendors.delete(skipVendor);
  const rows = await Promise.all(
    [...vendors].map(async ([vendor, title]) => {
      const list = await fetchRunCourierCitiesForVendor(vendor, settingsCourier).catch(() => []);
      const city = list.length ? matchVendorCity(rawCity, list) : "";
      return city ? { vendor, title: displayCourierName(title) || title, city } : null;
    })
  );
  return rows.filter(Boolean);
}

/**
 * Rank courier-list cities by similarity to a free-text order city.
 * Used for audit suggestions when exact match fails.
 */
export function suggestRunCourierCities(rawCity, cityList = [], limit = 8) {
  const raw = String(rawCity || "").trim().toLowerCase();
  const compact = raw.replace(/[^a-z0-9]/g, "");
  if (!raw || !cityList.length) return [];
  const scored = [];
  for (const c of cityList) {
    const name = String(c || "").trim();
    if (!name) continue;
    const lower = name.toLowerCase();
    const cpt = lower.replace(/[^a-z0-9]/g, "");
    let score = 0;
    if (lower === raw || cpt === compact) score = 1000;
    else if (lower.startsWith(raw) || cpt.startsWith(compact)) score = 800 - Math.abs(lower.length - raw.length);
    else if (raw.startsWith(lower) && lower.length >= 3) score = 700;
    else if (lower.includes(raw) || cpt.includes(compact)) score = 500;
    else if (raw.length >= 3 && (lower.includes(raw.slice(0, 3)) || cpt.includes(compact.slice(0, 3)))) {
      score = 200;
    } else continue;
    scored.push({ name, score });
  }
  scored.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  const out = [];
  const seen = new Set();
  for (const row of scored) {
    const key = row.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row.name);
    if (out.length >= limit) break;
  }
  return out;
}

/**
 * Audit an order/origin city against live GetCitiesList names.
 * @returns {{ ok: boolean, raw: string, matched: string, inList: boolean|null, candidates: string[], reason: string }}
 */
export function auditRunCourierCity(rawCity, cityList = []) {
  const raw = String(rawCity || "").trim();
  if (!raw) {
    return {
      ok: false,
      raw: "",
      matched: "",
      inList: false,
      candidates: [],
      reason: "empty",
    };
  }
  if (!Array.isArray(cityList) || !cityList.length) {
    const soft = matchRunCourierCity(raw, []);
    return {
      ok: true,
      raw,
      matched: soft || raw,
      inList: null,
      candidates: [],
      reason: "no_list",
    };
  }
  const matched = matchRunCourierCity(raw, cityList);
  const inList = cityList.some(
    (c) => String(c).toLowerCase() === String(matched || "").toLowerCase()
  );
  const candidates = inList
    ? []
    : suggestRunCourierCities(raw, cityList, 8);
  return {
    ok: inList,
    raw,
    matched: inList ? matched : "",
    inList,
    candidates,
    reason: inList ? "ok" : "not_in_courier_list",
  };
}

export function auditRunCourierLane({ origin, destination, cityList = [] } = {}) {
  const originAudit = auditRunCourierCity(origin, cityList);
  const destAudit = auditRunCourierCity(destination, cityList);
  return {
    ok: originAudit.ok && destAudit.ok,
    origin: originAudit,
    destination: destAudit,
    cityCount: Array.isArray(cityList) ? cityList.length : 0,
  };
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

/** Public helper — always returns the latest cached/API city names. */
export async function getRunCourierCityList(settingsCourier) {
  return ensureCityList(settingsCourier);
}

export function buildRunCourierPayload(order, bookingOptions = {}, settingsCourier = {}, cityList = []) {
  const opts = normalizeBookingOptions(bookingOptions);
  const courier = settingsCourier || {};
  const addr = order?.shippingAddress || {};
  const customer = order?.customer || {};
  // Always resolve to a real carrier — never Auto/empty (Trax-first portal).
  // Keep explicit picks; only soft-migrate Leopard when booking as Auto.
  const rawSelect = opts.selectedApi || opts.api || courier.runCourierDefaultApi;
  const selectedApi = resolveBookingSelectApi(
    rawSelect,
    courier.runCourierDefaultApi || RUN_COURIER_DEFAULT_API,
    { softMigrateLeopard: !isExplicitRunCourierSelect(rawSelect) }
  );
  const product = String(
    opts.product || opts.productType || courier.runCourierProductType || "Overnight"
  ).trim();
  const serviceType = resolveRunCourierServiceForApi(
    selectedApi,
    opts.serviceType || courier.runCourierServiceType || product || "Overnight",
    product
  );
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
  const detailsRaw = printDetails
    ? itemDetailsFromOrder(order, { withSku: printSku })
    : itemDetailsFromOrder(order);
  // Strip fancy punctuation that occasionally breaks Leopard/iCargos payloads.
  const details = String(detailsRaw || "")
    .replace(/[\u2010-\u2015]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .trim();

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
    if (notes) remarks = `${remarks} | Notes: ${notes}`;
  }
  if (printDetails && details) {
    remarks = `${remarks} | Items: ${details}`;
  }
  // Digi Leopard rejects >190; keep a clean hard cap for all carriers.
  remarks = String(remarks || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, RUN_COURIER_SPECIAL_INSTRUCTION_MAX);

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

  // Portal "Order ID" field — confirmed via CreateOrder live probe.
  // Rebook must use a unique id or CreateOrder can fail with opaque upstream errors.
  const orderRef = String(order?.orderNumber || order?._id || "").trim();
  if (orderRef) {
    if (opts.rebook) {
      const suffix = String(opts.rebookSuffix || Date.now()).slice(-6);
      payload.order_id = `${orderRef}-R${suffix}`;
    } else {
      payload.order_id = orderRef;
    }
  }

  // Keep UI/meta fields for our app (stripped before API send).
  return {
    ...payload,
    selectedApi,
    orderRef: payload.order_id || orderRef,
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
  const carrierRows = await ensureCarrierRows(settingsCourier);
  const built = buildRunCourierPayload(order, bookingOptions, settingsCourier, cityList);
  if (!built.consigneePhone) {
    return { success: false, error: "Customer phone is required for Run Courier booking." };
  }
  if (!built.consigneeCity) {
    return { success: false, error: "Destination city is required." };
  }

  const shipCountry = String(
    bookingOptions?.country ||
      order?.shippingAddress?.country ||
      order?.customer?.country ||
      "Pakistan"
  ).trim();
  if (!isPakistanDomesticCountry(shipCountry)) {
    return {
      success: false,
      error: `Run Courier only delivers inside Pakistan (this order’s country is "${shipCountry}"). Use a Pakistan city or another courier for overseas.`,
      destination: built.consigneeCity,
    };
  }

  // Account rejects Zero COD and amounts under Rs. 500 — fail before CreateOrder.
  if (Number(built.codAmount) === 0) {
    return {
      success: false,
      error: `Run Courier rejected Zero COD on this account (minimum Rs. ${RUN_COURIER_MIN_COD}). For prepaid orders ask Run Courier to enable Zero COD, set remaining COD ≥ ${RUN_COURIER_MIN_COD}, or book via PostEx.`,
      selectedApi: built.selectedApi,
      codAmount: 0,
    };
  }
  if (Number(built.codAmount) > 0 && Number(built.codAmount) < RUN_COURIER_MIN_COD) {
    return {
      success: false,
      error: `Run Courier requires collection amount of at least Rs. ${RUN_COURIER_MIN_COD} (this order’s COD is Rs. ${built.codAmount}). Raise remaining COD or ask Run Courier to lower the minimum.`,
      selectedApi: built.selectedApi,
      codAmount: built.codAmount,
    };
  }

  // Audit against raw order/settings cities (not already-matched names) so aliases
  // that miss the live GetCitiesList fail before CreateOrder.
  const destRawForAudit = String(
    bookingOptions?.cityName ||
      bookingOptions?.city ||
      order?.shippingAddress?.city ||
      built.destination ||
      ""
  ).trim();
  const originRawForAudit = String(
    bookingOptions?.originCity ||
      settingsCourier.runCourierOriginCity ||
      settingsCourier.originCity ||
      built.origin ||
      ""
  ).trim();
  const laneAudit = auditRunCourierLane({
    origin: originRawForAudit,
    destination: destRawForAudit,
    cityList,
  });

  if (cityList.length && !laneAudit.destination.ok) {
    const d = laneAudit.destination;
    const tips = d.candidates.length
      ? ` Try: ${d.candidates.slice(0, 5).join(", ")}`
      : " Pick a city from the Run Courier availability list.";
    return {
      success: false,
      error: `Destination "${d.raw}" is not in the Run Courier city list.${tips}`,
      origin: built.origin,
      destination: d.raw,
      candidates: d.candidates,
      cityAudit: laneAudit,
    };
  }
  if (cityList.length && originRawForAudit && !laneAudit.origin.ok) {
    const o = laneAudit.origin;
    const tips = o.candidates.length
      ? ` Try: ${o.candidates.slice(0, 5).join(", ")}`
      : " Fix Settings → Run Courier origin city.";
    return {
      success: false,
      error: `Origin "${o.raw}" is not in the Run Courier city list.${tips}`,
      origin: o.raw,
      destination: built.destination,
      candidates: o.candidates,
      cityAudit: laneAudit,
    };
  }

  // Prefer exact list names from audit when available.
  if (laneAudit.destination.matched) {
    built.destination = laneAudit.destination.matched;
    built.consigneeCity = laneAudit.destination.matched;
  }
  if (laneAudit.origin.matched) {
    built.origin = laneAudit.origin.matched;
  }

  let {
    selectedApi,
    orderRef,
    consigneePhone,
    consigneeCity,
    codAmount,
    ...apiBody
  } = built;
  const requestedApi = selectedApi;

  // Critical: without api_vendor, iCargos uses account api_default_vendor (Trax-first here).
  let apiVendor = resolveRunCourierApiVendor(selectedApi, carrierRows);
  if (apiVendor) {
    apiBody.api_vendor = apiVendor;
  }

  // Each courier has its OWN destination list in Run Courier (Leopard via DigiDukaan has
  // ~924 cities). A town in the combined list can still be missing for the chosen courier,
  // e.g. Kallar Syedan: M&P / TCS list it, Leopard does not. Use the courier's own
  // spelling when it has the town; otherwise auto-fall back to a courier that covers it.
  let notOnCourierList = null;
  let autoFallback = null;
  const wantedDest = destRawForAudit || apiBody.destination;
  if (apiVendor) {
    const vendorCities = await fetchRunCourierCitiesForVendor(apiVendor, settingsCourier).catch(() => []);
    if (vendorCities.length) {
      const vendorCity =
        matchVendorCity(wantedDest, vendorCities) || matchVendorCity(apiBody.destination, vendorCities);
      if (vendorCity) {
        apiBody.destination = vendorCity;
      } else {
        notOnCourierList = { wanted: wantedDest, vendorCities };
      }
    }
  }

  // Auto-switch only when allowed (Auto select, or admin opted in). Explicit Trax/Daewoo/TCS
  // picks must not silently become TCS — that was booking every Bagh/AK lane on TCS.
  const allowCourierFallback =
    bookingOptions?.allowCourierFallback === true ||
    !isExplicitRunCourierSelect(
      bookingOptions?.rawSelectedApi || bookingOptions?.selectedApi || bookingOptions?.api || ""
    );

  if (notOnCourierList) {
    const coveredBy = await couriersCoveringCity(
      notOnCourierList.wanted,
      carrierRows,
      settingsCourier,
      apiVendor
    ).catch(() => []);
    if (allowCourierFallback) {
      const pick = pickPreferredCoveringCourier(coveredBy);
      if (pick) {
        autoFallback = {
          from: selectedApi,
          to: pick.title,
          city: pick.city,
          vendor: pick.vendor,
        };
        selectedApi = pick.title;
        apiVendor = pick.vendor;
        apiBody.api_vendor = pick.vendor;
        apiBody.destination = pick.city;
        apiBody.service_type = resolveRunCourierServiceForApi(
          pick.title,
          apiBody.service_type || apiBody.product,
          apiBody.product
        );
        notOnCourierList = null;
      }
    } else if (!coveredBy.length) {
      // Keep notOnCourierList for the error path below after CreateOrder attempt,
      // or fail fast with a clear message.
      const courierName = displayCourierName(requestedApi);
      const nearest = suggestRunCourierCities(notOnCourierList.wanted, notOnCourierList.vendorCities, 4);
      const parts = [
        `${courierName} does not cover "${notOnCourierList.wanted}" on this Run Courier account.`,
      ];
      if (nearest.length) parts.push(`Nearest ${courierName} cities: ${nearest.join(", ")}.`);
      parts.push("Pick another Select API, or tick “Allow auto-switch courier”.");
      return {
        success: false,
        error: parts.join(" "),
        selectedApi: requestedApi,
        requestedApi,
        apiVendor: apiVendor || "",
        origin: apiBody.origin,
        destination: notOnCourierList.wanted,
        coveredBy: [],
        autoFallback: null,
      };
    } else {
      const courierName = displayCourierName(requestedApi);
      return {
        success: false,
        error: `${courierName} does not cover "${notOnCourierList.wanted}". Book with ${coveredBy
          .map((o) => `${o.title} (${o.city})`)
          .join(" or ")}, or tick “Allow auto-switch courier”.`,
        selectedApi: requestedApi,
        requestedApi,
        apiVendor: apiVendor || "",
        origin: apiBody.origin,
        destination: notOnCourierList.wanted,
        coveredBy,
        autoFallback: null,
      };
    }
  }

  const path = resolveRunCourierPath(settingsCourier, "create");
  let res = await runCourierFetch(path, {
    method: "POST",
    body: apiBody,
    settingsCourier,
  });

  // Portal intermittently returns "API HTTP Error: 500" / busy HTML — retry a few times.
  for (let attempt = 0; attempt < 3 && !res.ok && isRetryableRunCourierFailure(res); attempt += 1) {
    await sleep(700 * (attempt + 1));
    res = await runCourierFetch(path, {
      method: "POST",
      body: apiBody,
      settingsCourier,
    });
  }

  // If origin was upgraded to a Cantt/City variant and failed, retry with base city name.
  if (
    !res.ok &&
    /city is disabled for origin|Invalid charges calculation/i.test(String(res.error || ""))
  ) {
    const originBase = String(apiBody.origin || "")
      .replace(/\s+(cantt|cantonment|city|town)$/i, "")
      .trim();
    if (originBase && originBase !== apiBody.origin) {
      const retryBody = { ...apiBody, origin: matchRunCourierCity(originBase, cityList) || originBase };
      res = await runCourierFetch(path, {
        method: "POST",
        body: retryBody,
        settingsCourier,
      });
      if (res.ok) apiBody.origin = retryBody.origin;
    }
  }

  // Lane/service refusals: only walk Trax → TCS → … when fallback is allowed.
  // Explicit courier picks must fail clearly instead of quietly becoming TCS.
  if (!res.ok && isRunCourierServiceRefusal(res.error) && allowCourierFallback) {
    const triedVendors = new Set([String(apiBody.api_vendor || apiVendor || "")]);
    const attemptApis = [
      ...RUN_COURIER_SERVICE_FALLBACK_APIS.filter(
        (a) => String(a).toLowerCase() !== String(requestedApi).toLowerCase()
      ),
    ];
    for (const retryApi of attemptApis) {
      if (res.ok) break;
      const retryVendor = resolveRunCourierApiVendor(retryApi, carrierRows);
      if (!retryVendor || triedVendors.has(retryVendor)) continue;
      triedVendors.add(retryVendor);

      let dest = apiBody.destination;
      const vendorCities = await fetchRunCourierCitiesForVendor(retryVendor, settingsCourier).catch(
        () => []
      );
      if (vendorCities.length) {
        const matched =
          matchVendorCity(wantedDest || dest, vendorCities) ||
          matchVendorCity(dest, vendorCities);
        if (!matched) continue; // this courier truly lacks the town
        dest = matched;
      }

      const retryBody = {
        ...apiBody,
        api_vendor: retryVendor,
        destination: dest,
        service_type: resolveRunCourierServiceForApi(
          retryApi,
          apiBody.service_type || apiBody.product,
          apiBody.product
        ),
      };
      const retryRes = await runCourierFetch(path, {
        method: "POST",
        body: retryBody,
        settingsCourier,
      });
      if (retryRes.ok) {
        res = retryRes;
        Object.assign(apiBody, retryBody);
        selectedApi = retryApi;
        apiVendor = retryVendor;
        autoFallback = {
          from: requestedApi,
          to: retryApi,
          city: dest,
          vendor: retryVendor,
        };
        notOnCourierList = null;
        break;
      }
      // Keep walking if this courier also refuses the lane.
      if (!isRunCourierServiceRefusal(retryRes.error) && !isRetryableRunCourierFailure(retryRes)) {
        res = retryRes;
        break;
      }
      res = retryRes;
    }
  }

  if (!res.ok) {
    const upstream = String(res.error || "Booking failed.").trim();
    let friendly = upstream;
    if (isRunCourierCodRefusal(upstream)) {
      friendly = /Zero COD/i.test(upstream)
        ? `Run Courier rejected Zero COD on this account (minimum Rs. ${RUN_COURIER_MIN_COD}). For prepaid orders ask Run Courier to enable Zero COD, or book via PostEx.`
        : `Run Courier requires collection of at least Rs. ${RUN_COURIER_MIN_COD}. ${upstream}`;
    } else if (/Special Instructions must be between/i.test(upstream)) {
      friendly = `Special instructions were too long for Run Courier (max ${RUN_COURIER_SPECIAL_INSTRUCTION_MAX} chars). Shorten Remarks and retry — item/notes auto-text is now trimmed automatically.`;
    } else if (/API HTTP Error:\s*5\d\d/i.test(upstream)) {
      friendly = `Run Courier / ${selectedApi} failed (${upstream}). Origin ${apiBody.origin} → ${apiBody.destination}. Try again, or pick another carrier.`;
    } else if (/city is disabled for origin/i.test(upstream)) {
      friendly = `Origin city "${apiBody.origin}" is not enabled for ${selectedApi}. Check Settings → Run Courier origin city (use Gujranwala, not Cantt).`;
    } else if (/does not service/i.test(upstream)) {
      const triedFallback = Boolean(autoFallback) || allowCourierFallback;
      friendly = triedFallback
        ? `${displayCourierName(requestedApi || selectedApi)} will not take ${apiBody.origin} → ${apiBody.destination} on this Run Courier account (Trax/TCS/M&P also refused). Book via PostEx for this lane.`
        : `${displayCourierName(requestedApi || selectedApi)} will not take ${apiBody.origin} → ${apiBody.destination} on this Run Courier account. Tick “Allow auto-switch courier”, pick another Select API, or book via PostEx.`;
    } else if (/Invalid charges calculation/i.test(upstream)) {
      friendly = `Run Courier could not price ${apiBody.origin} → ${apiBody.destination} via ${selectedApi}. Check city names, try PostEx, or pick another carrier.`;
    } else if (/missing\s*Mappings/i.test(upstream)) {
      friendly = `${selectedApi} has no service mapping for ${apiBody.origin} → ${apiBody.destination}. Pick another Select API, or book via PostEx.`;
    } else if (apiBody.origin && apiBody.destination) {
      friendly = `${upstream} (${selectedApi}: ${apiBody.origin} → ${apiBody.destination})`;
    }
    let coveredBy = [];
    if (notOnCourierList) {
      const courierName = displayCourierName(requestedApi);
      const { wanted, vendorCities } = notOnCourierList;
      coveredBy = await couriersCoveringCity(wanted, carrierRows, settingsCourier, apiVendor).catch(() => []);
      const nearest = suggestRunCourierCities(wanted, vendorCities, 4);
      const parts = [
        `${courierName} is not set up for "${wanted}" in Run Courier (not in its ${courierName} city list).`,
      ];
      if (coveredBy.length) {
        parts.push(`Book with ${coveredBy.map((o) => `${o.title} (${o.city})`).join(" or ")}.`);
      }
      if (nearest.length) parts.push(`Nearest ${courierName} cities: ${nearest.join(", ")}.`);
      parts.push(`Run Courier said: ${friendly}`);
      friendly = parts.join(" ");
    }
    return {
      success: false,
      error: friendly,
      debugUrl: res.url,
      selectedApi,
      requestedApi,
      apiVendor: apiVendor || "",
      origin: apiBody.origin,
      destination: apiBody.destination,
      coveredBy,
      autoFallback,
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
      apiVendor: apiVendor || "",
    };
  }

  const thirdParty = pick(res.json, "thirdparty_name", "thirdpartyName", "carrier");
  // Prefer the carrier actually booked; fall back to what the admin selected.
  const bookedApi = thirdParty || selectedApi;
  const invoiceLink = pick(res.json, "invoice_link", "invoiceLink", "label_url", "labelUrl");

  return {
    success: true,
    trackingNumber,
    orderReference: orderRef,
    selectedApi: bookedApi,
    requestedApi,
    apiVendor: apiVendor || "",
    autoFallback,
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
    const fetchOne = async (key) => {
      const path = resolveRunCourierPath(settingsCourier, key);
      const res = await runCourierFetch(path, {
        method: "POST",
        settingsCourier,
        body: { tracking_no: tn },
      });
      if (!res.ok) return null;
      return parseTrackResponse(res.json, tn);
    };

    const isThin = (parsed) => {
      if (!parsed?.success) return true;
      const events = Array.isArray(parsed.events) ? parsed.events : [];
      if (events.length > 1) return false;
      const only = String(events[0]?.status || parsed.status || "").trim();
      return /^(new\s+)?booked$|^created$|^unbook|^pickup\s*pending$/i.test(only);
    };

    const rank = (status) => {
      const s = String(status || "").toLowerCase();
      if (/deliver/.test(s) && !/out for|attempt|waiting/.test(s)) return 80;
      if (/out for|enroute|waiting for delivery|attempt/.test(s)) return 60;
      if (/transit|hub|depart|arriv|dispatch|received|picked|assigned/.test(s)) return 40;
      if (/^(new\s+)?booked$|^created$/i.test(s.trim())) return 10;
      return s ? 20 : 0;
    };

    const merge = (a, b) => {
      const list = [a, b].filter((p) => p?.success);
      if (!list.length) return null;
      if (list.length === 1) return list[0];
      const richest = [...list].sort((x, y) => (y.events?.length || 0) - (x.events?.length || 0))[0];
      const ahead = [...list].sort((x, y) => rank(y.status) - rank(x.status))[0];
      const out = {
        ...richest,
        status: rank(ahead.status) > rank(richest.status) ? ahead.status : richest.status,
        statusCode: (
          rank(ahead.status) > rank(richest.status) ? ahead.status : richest.status
        )
          .slice(0, 2)
          .toUpperCase(),
        courier: ahead.courier || richest.courier || "Run Courier",
        origin: richest.origin || ahead.origin || "",
        destination: richest.destination || ahead.destination || "",
        currentLocation:
          richest.currentLocation || ahead.currentLocation || richest.events?.[0]?.location || "",
      };
      if (isThin(richest) && rank(ahead.status) > rank(richest.status)) {
        const top = {
          date: ahead.events?.[0]?.date || "",
          time: ahead.events?.[0]?.time || "",
          status: ahead.status,
          location: ahead.currentLocation || ahead.events?.[0]?.location || "",
          description: ahead.events?.[0]?.description || ahead.status,
        };
        out.events = [
          top,
          ...(richest.events || []).filter(
            (e) => String(e.status || "").toLowerCase() !== String(top.status).toLowerCase()
          ),
        ];
        out.status = ahead.status;
        out.statusCode = ahead.status.slice(0, 2).toUpperCase();
      }
      return out;
    };

    let track = await fetchOne("track");
    let status = await fetchOne("status");
    let merged = merge(track, status);

    if (!merged || isThin(merged)) {
      await new Promise((r) => setTimeout(r, 450));
      track = (await fetchOne("track")) || track;
      status = (await fetchOne("status")) || status;
      const retry = merge(track, status);
      if (
        retry &&
        (!merged ||
          rank(retry.status) > rank(merged.status) ||
          (retry.events?.length || 0) > (merged.events?.length || 0))
      ) {
        merged = retry;
      }
    }

    if (merged?.success) return { ...merged, raw: { track, status } };
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
    const events = rows
      .map((entry, idx) => {
        if (!entry || typeof entry !== "object") return null;
        const when = entry.created || entry.date || entry.timestamp || "";
        const { date, time } = splitDateTime(when);
        const status = pick(entry, "status", "orderStatus", "transactionStatus") || "Update";
        const reason = pick(entry, "reason", "remarks", "comment");
        const location = pick(entry, "location", "city", "hub", "station");
        const sortAt = (() => {
          const d = new Date(when);
          if (!Number.isNaN(d.getTime())) return d.getTime();
          return Date.now() - idx;
        })();
        return {
          date,
          time,
          status,
          location,
          description: reason ? `${status} — ${reason}` : status,
          sortAt,
        };
      })
      .filter(Boolean);
    events.sort((a, b) => (b.sortAt || 0) - (a.sortAt || 0));
    const clean = events.map(({ date, time, status, location, description }) => ({
      date,
      time,
      status,
      location,
      description,
    }));
    const status = clean[0]?.status || "Unknown";
    return {
      success: true,
      trackingNumber: pick(rows[0], "tracking_no", "trackingNumber") || trackingNumber,
      status,
      statusCode: status.slice(0, 2).toUpperCase(),
      courier: "Run Courier",
      events: clean,
      estimatedDelivery: "",
      origin: "",
      destination: "",
      currentLocation: clean[0]?.location || "",
      destinationReceived: false,
      source: "api",
    };
  }

  if (json && typeof json === "object" && !Array.isArray(json)) {
    if (json.busy) return null;
    const status = pick(json, "status", "orderStatus", "currentStatus");
    if (!status) return null;
    const reason = pick(json, "reason", "remarks");
    return {
      success: true,
      trackingNumber: pick(json, "tracking_no", "trackingNumber") || trackingNumber,
      status,
      statusCode: status.slice(0, 2).toUpperCase(),
      courier: pick(json, "thirdparty_name", "courier") || "Run Courier",
      events: [
        {
          date: "",
          time: "",
          status,
          location: pick(json, "location", "city", "hub") || "",
          description: reason ? `${status} — ${reason}` : status,
        },
      ],
      estimatedDelivery: "",
      origin: "",
      destination: pick(json, "deliveryCity", "destinationCity", "consigneeCity") || "",
      currentLocation: pick(json, "location", "city") || "",
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
  // No dedicated label PDF API — airbill is the portal invoice HTML (converted client-side).
  const tn = String(trackingNumber || "").trim();
  if (!tn) return { success: false, error: "Tracking number required." };
  return {
    success: false,
    error: "Invoice link not stored on this order yet.",
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
    return { success: true, carriers: [...RUN_COURIER_APIS], rows: [], source: "fallback" };
  }
  const nested = res.json?.API || res.json?.data || res.json?.carriers || res.json;
  const rows = [];
  if (Array.isArray(nested)) {
    for (const c of nested) {
      if (typeof c === "string") {
        rows.push({ id: c, title: c, booking_api_id: 0, gateway_id: 0 });
        continue;
      }
      const title = c?.title || c?.name || c?.api || "";
      if (!title && c?.id == null) continue;
      rows.push({
        id: c?.id != null ? String(c.id) : "",
        title: String(title || c?.id || ""),
        booking_api_id: c?.booking_api_id ?? 0,
        gateway_id: c?.gateway_id ?? 0,
      });
    }
  }
  if (rows.length) {
    carriersCache = { at: Date.now(), rows };
  }
  const list = rows.map((r) => r.title).filter(Boolean);
  // Collapse Digi/RC duplicates (RunCourier-Tcs, RC-TCS, Tcs) onto one canonical title
  // so the dropdown no longer shows 3× TCS / Trax / Leopard.
  const unique = [];
  const seenCanon = new Set();
  const pushUnique = (title) => {
    const raw = String(title || "").trim();
    if (!raw) return;
    const canon = canonicalizeRunCourierSelectTitle(raw) || raw;
    const key = String(canon).toLowerCase();
    if (seenCanon.has(key)) return;
    seenCanon.add(key);
    // Prefer canonical spelling for known brands.
    const preferred =
      RUN_COURIER_APIS.find((a) => a.toLowerCase() === key) ||
      (/^leopard2$/i.test(canon) ? "Leopard2" : canon);
    unique.push(preferred);
  };

  if (!list.some((x) => String(canonicalizeRunCourierSelectTitle(x) || x).toLowerCase() === "auto")) {
    pushUnique("Auto");
  }
  for (const title of list) pushUnique(title);

  // Ensure direct Select APIs always appear even if Digi-only list came back.
  for (const canonical of RUN_COURIER_APIS) pushUnique(canonical);

  if (!unique.length) {
    return { success: true, carriers: [...RUN_COURIER_APIS], rows: [], source: "fallback" };
  }
  return { success: true, carriers: unique, rows, source: "api" };
}

async function ensureCarrierRows(settingsCourier) {
  if (carriersCache.rows.length && Date.now() - carriersCache.at < 6 * 60 * 60 * 1000) {
    return carriersCache.rows;
  }
  const loaded = await fetchRunCourierCarriers({ settingsCourier });
  return loaded.rows || carriersCache.rows || [];
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
