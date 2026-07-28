/**
 * Postex Merchant API — order tracking (v3).
 * @see https://api.postex.pk/services/integration/api/order/v3/
 */

export const POSTEX_ORDER_API_BASE =
  "https://api.postex.pk/services/integration/api/order/v3";

/** Single-parcel tracking lives on v1 (not v3 get-order-detail). */
export const POSTEX_TRACK_API_BASE =
  "https://api.postex.pk/services/integration/api/order/v1";

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
    entry.updatedAt ||
      entry.transactionDateTime ||
      entry.statusDateTime ||
      entry.dateTime ||
      entry.timestamp ||
      entry.date
  );
  const status =
    pick(
      entry,
      "transactionStatusMessage",
      "transactionStatus",
      "orderStatus",
      "status",
      "statusName",
      "transactionStatusName"
    ) || "Update";
  return {
    date: entry.date || date,
    time: entry.time || time,
    status,
    location: pick(entry, "cityName", "location", "operationalCity", "city"),
    description:
      pick(entry, "remarks", "description", "transactionStatusMessage", "message", "comment") ||
      status,
    sortAt: new Date(
      entry.updatedAt ||
        entry.transactionDateTime ||
        entry.statusDateTime ||
        entry.dateTime ||
        Date.now()
    ).getTime(),
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
  const weightRaw =
    dist.weight ?? dist.actualWeight ?? dist.bookingWeight ?? dist.orderWeight ?? dist.totalWeight;
  const weight =
    weightRaw != null && weightRaw !== ""
      ? `${weightRaw}${String(weightRaw).includes("kg") ? "" : "kg"}`
      : "";

  const events = extractHistory(dist);
  const destinationCity = pick(dist, "cityName", "deliveryCity", "destinationCity", "operationalCity");
  const locationInsight = derivePostexLocationInsight(status, events, destinationCity);

  return {
    success: true,
    trackingNumber: tn,
    status,
    statusCode,
    courier: "Postex",
    events,
    estimatedDelivery: pick(
      dist,
      "expectedDeliveryDate",
      "orderDeliveryDate",
      "deliveryDate",
      "edd"
    ),
    // Never expose raw pickup/delivery street addresses on the public tracking page.
    origin: "CrazzyCars.pk Warehouse",
    destination: destinationCity,
    currentLocation: locationInsight.currentLocation,
    currentLocationDetail: locationInsight.currentLocationDetail,
    destinationReceived: locationInsight.destinationReceived,
    destinationReceivedLabel: locationInsight.destinationReceivedLabel,
    lastScanAt: locationInsight.lastScanAt,
    weight,
    pieces: Number(dist.items ?? dist.pieces ?? dist.itemCount) || 1,
  };
}

/**
 * Infer live parcel whereabouts from Postex status + transactionStatusHistory.
 * Examples of history lines:
 *  - "Arrived at Transit Hub PHL"
 *  - "Departed to PHALIA"
 *  - "Received at GUJ Warehouse"
 *  - "At Crazzycars Warehouse"
 */
export function derivePostexLocationInsight(status, events = [], destinationCity = "") {
  const dest = String(destinationCity || "").trim();
  const destKey = dest.toLowerCase().replace(/[^a-z]/g, "");
  const latest = Array.isArray(events) && events.length ? events[0] : null;
  const latestText = String(latest?.status || latest?.description || "").trim();
  const statusText = String(status || "").trim();
  const haystack = `${latestText} ${statusText}`.toLowerCase();

  let currentLocation = "";
  let currentLocationDetail = latestText || statusText || "Awaiting first scan";

  if (/warehouse|unbook/i.test(haystack)) {
    currentLocation = "CrazzyCars.pk Warehouse";
  } else if (/enroute for delivery|out for delivery|waiting for delivery/i.test(haystack)) {
    currentLocation = dest ? `Out for delivery in ${dest}` : "Out for delivery";
  } else if (/arrived at transit hub\s+([a-z0-9]+)/i.test(latestText)) {
    const code = latestText.match(/arrived at transit hub\s+([a-z0-9]+)/i)?.[1] || "";
    currentLocation = `Transit hub ${code.toUpperCase()}${dest ? ` (${dest})` : ""}`;
  } else if (/arrived at\s+(.+)/i.test(latestText)) {
    currentLocation = latestText.replace(/^arrived at\s+/i, "").trim();
  } else if (/received at\s+(.+)/i.test(latestText)) {
    currentLocation = latestText.replace(/^received at\s+/i, "").trim();
  } else if (/departed to\s+(.+)/i.test(latestText)) {
    const to = latestText.replace(/^departed to\s+/i, "").trim();
    currentLocation = `In transit to ${to}`;
  } else if (latestText) {
    currentLocation = latestText;
  } else {
    currentLocation = statusText || "Processing";
  }

  const historyText = (Array.isArray(events) ? events : [])
    .map((e) => `${e.status || ""} ${e.description || ""} ${e.location || ""}`)
    .join(" · ")
    .toLowerCase();

  let destinationReceived = false;
  let destinationReceivedLabel = dest
    ? `Not yet received in ${dest}`
    : "Destination city pending";

  const arrivedAtDest =
    Boolean(destKey) &&
    (new RegExp(`arrived at transit hub\\s+${destKey.slice(0, 3)}`, "i").test(historyText) ||
      new RegExp(`arrived at\\s+.*${destKey}`, "i").test(historyText) ||
      new RegExp(`departed to\\s+${destKey}`, "i").test(historyText) ||
      new RegExp(`received at\\s+.*${destKey}`, "i").test(historyText) ||
      /waiting for delivery|enroute for delivery|out for delivery/i.test(historyText) ||
      (/deliver/i.test(statusText) && !/unbook/i.test(statusText)));

  if (/deliver/i.test(statusText) && !/out for|attempt|waiting/i.test(statusText)) {
    destinationReceived = true;
    destinationReceivedLabel = dest ? `Delivered in ${dest}` : "Delivered";
  } else if (arrivedAtDest) {
    destinationReceived = true;
    destinationReceivedLabel = dest ? `Received in ${dest}` : "Received at destination city";
  } else if (/transit|hub|depart|arriv|dispatch/i.test(historyText)) {
    destinationReceivedLabel = dest ? `In transit toward ${dest}` : "In transit";
  } else if (/warehouse|unbook/i.test(haystack)) {
    destinationReceivedLabel = dest
      ? `Still at warehouse · heading to ${dest}`
      : "Still at CrazzyCars.pk Warehouse";
  }

  const lastScanAt = [latest?.date, latest?.time].filter(Boolean).join(" · ");

  return {
    currentLocation,
    currentLocationDetail,
    destinationReceived,
    destinationReceivedLabel,
    lastScanAt,
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
 * Correct endpoint: GET /order/v1/track-order/{trackingNumber}
 * @param {string} trackingNumber
 * @param {{ postexApiKey?: string, settingsCourier?: object }} [options]
 */
export async function fetchPostexTracking(trackingNumber, options = {}) {
  const id = String(trackingNumber || "").trim();
  if (!id) {
    return { success: false, error: "Invalid tracking number" };
  }

  const courier =
    options.settingsCourier && typeof options.settingsCourier === "object"
      ? options.settingsCourier
      : options;
  const apiKey = resolvePostexApiKey(courier);
  if (!apiKey) {
    return { success: false, error: "Tracking unavailable" };
  }

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
