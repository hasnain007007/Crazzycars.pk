/**
 * Run Courier tracking client (storefront) — mirrors admin track helpers.
 * Used by public /api/tracking for multi-courier lookup.
 */

export const RUN_COURIER_DEFAULT_BASE = "https://portal.runcourier.com";
export const RUN_COURIER_DEFAULT_TRACK_PATH = "/API/TrackOrder.php";

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

function resolveApiKey(settingsCourier) {
  const fromEnv = String(process.env.RUN_COURIER_API_KEY || "").trim();
  if (fromEnv) return fromEnv;
  return String(settingsCourier?.runCourierApiKey || "").trim();
}

function resolveClientCode(settingsCourier) {
  const fromEnv = String(process.env.RUN_COURIER_CLIENT_CODE || "").trim();
  if (fromEnv) return fromEnv;
  return String(settingsCourier?.runCourierClientCode || "").trim();
}

function resolveBaseUrl(settingsCourier) {
  const fromEnv = String(process.env.RUN_COURIER_BASE_URL || "").trim().replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  const fromDb = String(settingsCourier?.runCourierBaseUrl || "").trim().replace(/\/$/, "");
  return fromDb || RUN_COURIER_DEFAULT_BASE;
}

function resolveTrackPath(settingsCourier) {
  const custom = String(settingsCourier?.runCourierTrackPath || "").trim();
  if (custom) return custom.startsWith("/") ? custom : `/${custom}`;
  return RUN_COURIER_DEFAULT_TRACK_PATH;
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

function normalizeTrackEvent(entry) {
  if (!entry || typeof entry !== "object") return null;
  const { date, time } = splitDateTime(
    entry.transactionDateTime ||
      entry.statusDateTime ||
      entry.dateTime ||
      entry.timestamp ||
      entry.created_at ||
      entry.date ||
      ""
  );
  const status =
    pick(entry, "transactionStatus", "orderStatus", "status", "statusName", "event") || "Update";
  return {
    date: entry.date || date,
    time: entry.time || time,
    status,
    location: pick(entry, "cityName", "location", "operationalCity", "city", "hub"),
    description:
      pick(entry, "remarks", "description", "message", "comment", "detail") || status,
    sortAt: new Date(
      entry.transactionDateTime ||
        entry.statusDateTime ||
        entry.dateTime ||
        entry.timestamp ||
        entry.created_at ||
        Date.now()
    ).getTime(),
  };
}

function extractTrackPayload(json) {
  if (!json || typeof json !== "object") return null;
  if (json.dist && typeof json.dist === "object") return json.dist;
  if (json.data && typeof json.data === "object" && !Array.isArray(json.data)) return json.data;
  if (json.shipment && typeof json.shipment === "object") return json.shipment;
  if (json.tracking && typeof json.tracking === "object") return json.tracking;
  if (
    json.trackingNumber ||
    json.status ||
    json.orderStatus ||
    json.currentStatus ||
    Array.isArray(json.history)
  ) {
    return json;
  }
  return null;
}

function extractTrackHistory(dist) {
  const lists = [
    dist?.transactionStatusHistory,
    dist?.orderStatusHistory,
    dist?.statusHistory,
    dist?.trackingHistory,
    dist?.tracking_history,
    dist?.history,
    dist?.events,
    dist?.statuses,
  ].filter(Array.isArray);
  const events = [];
  for (const list of lists) {
    for (const item of list) {
      const ev = normalizeTrackEvent(typeof item === "string" ? { status: item } : item);
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
        location: pick(dist, "cityName", "location", "currentLocation", "city"),
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

export function parseRunCourierPortalHtml(html, trackingNumber) {
  const text = String(html || "");
  if (!text || text.length < 80) return null;
  const tn = String(trackingNumber || "").trim();
  const events = [];
  const rowRx = /<tr[^>]*>[\s\S]*?<\/tr>/gi;
  const cellRx = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
  let rowMatch;
  while ((rowMatch = rowRx.exec(text))) {
    const row = rowMatch[0];
    if (/<th[\s>]/i.test(row)) continue;
    const cells = [];
    let cellMatch;
    while ((cellMatch = cellRx.exec(row))) {
      const plain = cellMatch[1]
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      if (plain) cells.push(plain);
    }
    if (cells.length >= 2) {
      const status =
        cells.find((c) => /deliver|transit|book|dispatch|hub|return|out for|picked/i.test(c)) ||
        cells[1];
      const when = cells.find((c) => /\d{4}|\d{1,2}[\/\-]\d{1,2}/.test(c)) || cells[0];
      const location = cells.find((c) => c !== status && c !== when) || "";
      const { date, time } = splitDateTime(when);
      events.push({
        date,
        time,
        status,
        location,
        description: status,
        sortAt: Date.now() - events.length,
      });
    }
  }
  let status = "";
  const statusMatch =
    text.match(/current\s*status[^<]*<\/[^>]+>\s*<[^>]+>([^<]+)/i) ||
    text.match(/status\s*[:\-]\s*([^<\n]{3,60})/i);
  if (statusMatch) status = statusMatch[1].replace(/\s+/g, " ").trim();
  if (!status && events.length) status = events[0].status;
  if (!status) return null;
  if (/tracking-form/i.test(text) && !events.length && /please enter|enter tracking/i.test(text)) {
    return null;
  }
  events.sort((a, b) => (b.sortAt || 0) - (a.sortAt || 0));
  const cleanEvents = events.map(({ date, time, status: st, location, description }) => ({
    date,
    time,
    status: st,
    location,
    description,
  }));
  return {
    success: true,
    trackingNumber: tn,
    status,
    statusCode: status.slice(0, 2).toUpperCase(),
    courier: "Run Courier",
    events: cleanEvents.length
      ? cleanEvents
      : [{ date: "", time: "", status, location: "", description: status }],
    estimatedDelivery: "",
    origin: "",
    destination: "",
    currentLocation: cleanEvents[0]?.location || "",
    destinationReceived: false,
    source: "portal",
  };
}

function parseRunCourierTrackingJson(json, trackingNumber) {
  const dist = extractTrackPayload(json);
  if (!dist) return null;
  const tn =
    pick(dist, "trackingNumber", "trackingNo", "cn", "consignmentNo", "awb", "code") ||
    String(trackingNumber || "").trim();
  const status =
    pick(
      dist,
      "transactionStatus",
      "orderStatus",
      "status",
      "currentStatus",
      "shipmentStatus"
    ) || "Unknown";
  const events = extractTrackHistory(dist);
  const destination = pick(dist, "deliveryCity", "destinationCity", "cityName", "consigneeCity");
  return {
    success: true,
    trackingNumber: tn,
    status,
    statusCode: status.slice(0, 2).toUpperCase(),
    courier: pick(dist, "courier", "carrier", "api_name") || "Run Courier",
    events,
    estimatedDelivery: pick(dist, "expectedDeliveryDate", "edd", "deliveryDate"),
    origin: pick(dist, "originCity", "pickupCity"),
    destination,
    currentLocation: pick(dist, "location", "currentLocation", "city") || events[0]?.location || "",
    destinationReceived: false,
    source: "api",
  };
}

async function scrapePortal(tn) {
  try {
    const res = await fetch(
      `https://portal.runcourier.com/tracking.php?code=${encodeURIComponent(tn)}`,
      {
        headers: { Accept: "text/html", "User-Agent": "CrazzyCarsTracker/1.0" },
        cache: "no-store",
      }
    );
    const html = await res.text();
    return parseRunCourierPortalHtml(html, tn);
  } catch {
    return null;
  }
}

export async function fetchRunCourierTracking(trackingNumber, { settingsCourier } = {}) {
  const tn = String(trackingNumber || "").trim();
  if (!tn) return { success: false, error: "Tracking number required." };

  const apiKey = resolveApiKey(settingsCourier);
  const clientCode = resolveClientCode(settingsCourier);
  if (apiKey && clientCode) {
    const base = resolveBaseUrl(settingsCourier);
    const path = resolveTrackPath(settingsCourier);
    const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          auth_key: apiKey,
          client_code: clientCode,
          tracking_no: tn,
        }),
        cache: "no-store",
      });
      const text = await res.text();
      let json = null;
      try {
        json = JSON.parse(text);
      } catch {
        json = null;
      }
      if (res.ok && json && typeof json !== "string") {
        if (Array.isArray(json) && json.length) {
          const events = json.map((entry, idx) => {
            const status = String(entry.status || "Update").trim();
            return {
              date: "",
              time: "",
              status,
              location: "",
              description: status,
              sortAt: Date.now() - idx,
            };
          });
          const status = events[0]?.status || "Unknown";
          return {
            success: true,
            trackingNumber: tn,
            status,
            statusCode: status.slice(0, 2).toUpperCase(),
            courier: "Run Courier",
            events,
            estimatedDelivery: "",
            origin: "",
            destination: "",
            currentLocation: "",
            destinationReceived: false,
            source: "api",
          };
        }
        const parsed = parseRunCourierTrackingJson(json, tn);
        if (parsed?.success) return parsed;
      }
    } catch {
      /* fall through to portal */
    }
  }

  const scraped = await scrapePortal(tn);
  if (scraped?.success) return scraped;
  return { success: false, error: "Tracking number not found on Run Courier." };
}
