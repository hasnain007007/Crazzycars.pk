/**
 * Postex Merchant API — order tracking (v3).
 * @see https://api.postex.pk/services/integration/api/order/v3/
 */

export const POSTEX_ORDER_API_BASE =
  "https://api.postex.pk/services/integration/api/order/v3";

export function resolvePostexApiKey(settingsCourier) {
  const fromEnv = String(process.env.POSTEX_API_KEY || "").trim();
  if (fromEnv) return fromEnv;
  const fromDb = String(settingsCourier?.postexApiKey || "").trim();
  return fromDb;
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

/**
 * Fetch live tracking from Postex.
 * @param {string} trackingNumber
 * @param {{ postexApiKey?: string }} [options]
 */
export async function fetchPostexTracking(trackingNumber, options = {}) {
  const id = String(trackingNumber || "").trim();
  if (!id) {
    return { success: false, error: "Invalid tracking number" };
  }

  const apiKey = resolvePostexApiKey(
    options.settingsCourier ? { postexApiKey: options.settingsCourier } : options
  );
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
