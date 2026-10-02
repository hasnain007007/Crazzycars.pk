/**
 * Run Courier tracking client (storefront) — mirrors admin track helpers.
 * Used by public /api/tracking for multi-courier lookup.
 */

export const RUN_COURIER_DEFAULT_BASE = "https://portal.runcourier.com";
export const RUN_COURIER_DEFAULT_TRACK_PATH = "/API/TrackOrder.php";
export const RUN_COURIER_DEFAULT_STATUS_PATH = "/API/CurrentStatus.php";

/** TrackOrder.php under load sometimes returns only the original booking row. */
const EARLY_LIFECYCLE_STATUS =
  /^(new\s+)?booked$|^created$|^unbook|^pickup\s*pending$|^order\s*placed$/i;

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

function resolveStatusPath(settingsCourier) {
  const custom = String(settingsCourier?.runCourierStatusPath || "").trim();
  if (custom) return custom.startsWith("/") ? custom : `/${custom}`;
  return RUN_COURIER_DEFAULT_STATUS_PATH;
}

function statusRank(status) {
  const s = String(status || "").toLowerCase();
  if (/deliver/.test(s) && !/out for|attempt|waiting/.test(s)) return 80;
  if (/out for|enroute|waiting for delivery|attempt/.test(s)) return 60;
  if (/transit|hub|depart|arriv|dispatch|received|picked|assigned/.test(s)) return 40;
  if (EARLY_LIFECYCLE_STATUS.test(s.trim())) return 10;
  if (s) return 20;
  return 0;
}

function isBusyPayload(json, text = "") {
  if (json && typeof json === "object" && !Array.isArray(json) && json.busy) return true;
  const blob = `${typeof json === "string" ? json : JSON.stringify(json || {})}\n${text || ""}`;
  return /busy|One moment|Retrying automatically|system is busy/i.test(blob);
}

function isThinEarlyLifecycle(parsed) {
  if (!parsed?.success) return true;
  const events = Array.isArray(parsed.events) ? parsed.events : [];
  if (events.length === 0) return true;
  if (events.length > 1) return false;
  const only = String(events[0]?.status || parsed.status || "").trim();
  return EARLY_LIFECYCLE_STATUS.test(only);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
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

function parseRunCourierArrayTrack(rows, trackingNumber) {
  if (!Array.isArray(rows) || !rows.length) return null;
  const events = rows
    .map((entry, idx) => {
      if (!entry || typeof entry !== "object") return null;
      const when = entry.created || entry.date || entry.timestamp || entry.created_at || "";
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
  if (!events.length) return null;
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
    trackingNumber:
      pick(rows[0], "tracking_no", "trackingNumber", "trackingNo", "cn") ||
      String(trackingNumber || "").trim(),
    status,
    statusCode: status.slice(0, 2).toUpperCase(),
    courier: "Run Courier",
    events: clean,
    estimatedDelivery: "",
    origin: "",
    destination: pick(rows[0], "destination", "deliveryCity", "consigneeCity") || "",
    currentLocation: clean[0]?.location || "",
    destinationReceived: false,
    source: "api",
  };
}

function parseRunCourierTrackingJson(json, trackingNumber) {
  if (Array.isArray(json)) return parseRunCourierArrayTrack(json, trackingNumber);
  if (Array.isArray(json?.data)) return parseRunCourierArrayTrack(json.data, trackingNumber);

  const dist = extractTrackPayload(json);
  if (!dist) {
    // CurrentStatus often returns a flat { status, ... } object.
    if (json && typeof json === "object") {
      const status = pick(json, "status", "orderStatus", "currentStatus", "transactionStatus");
      if (!status) return null;
      const reason = pick(json, "reason", "remarks");
      return {
        success: true,
        trackingNumber:
          pick(json, "tracking_no", "trackingNumber", "trackingNo", "cn") ||
          String(trackingNumber || "").trim(),
        status,
        statusCode: status.slice(0, 2).toUpperCase(),
        courier: pick(json, "thirdparty_name", "courier", "carrier", "api_name") || "Run Courier",
        events: [
          {
            date: "",
            time: "",
            status,
            location: pick(json, "location", "city", "hub") || "",
            description: reason ? `${status} — ${reason}` : status,
          },
        ],
        estimatedDelivery: pick(json, "expectedDeliveryDate", "edd", "deliveryDate"),
        origin: pick(json, "originCity", "pickupCity"),
        destination: pick(json, "deliveryCity", "destinationCity", "consigneeCity"),
        currentLocation: pick(json, "location", "currentLocation", "city") || "",
        destinationReceived: false,
        source: "api",
      };
    }
    return null;
  }
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

function mergeRunCourierTrackResults(trackParsed, statusParsed) {
  const candidates = [trackParsed, statusParsed].filter((p) => p?.success);
  if (!candidates.length) return null;
  if (candidates.length === 1) return candidates[0];

  const byEvents = [...candidates].sort(
    (a, b) => (b.events?.length || 0) - (a.events?.length || 0)
  );
  const richest = byEvents[0];
  const byRank = [...candidates].sort(
    (a, b) => statusRank(b.status) - statusRank(a.status)
  );
  const ahead = byRank[0];

  // Prefer the richest scan history; lift status from CurrentStatus when TrackOrder is stale.
  const merged = {
    ...richest,
    status: statusRank(ahead.status) > statusRank(richest.status) ? ahead.status : richest.status,
    statusCode: (
      statusRank(ahead.status) > statusRank(richest.status) ? ahead.status : richest.status
    )
      .slice(0, 2)
      .toUpperCase(),
    courier: ahead.courier || richest.courier || "Run Courier",
    origin: richest.origin || ahead.origin || "",
    destination: richest.destination || ahead.destination || "",
    currentLocation:
      richest.currentLocation ||
      ahead.currentLocation ||
      richest.events?.[0]?.location ||
      "",
    estimatedDelivery: richest.estimatedDelivery || ahead.estimatedDelivery || "",
    source: "api",
  };

  // If TrackOrder was thin but CurrentStatus is ahead, keep ahead status on top of history.
  if (isThinEarlyLifecycle(richest) && statusRank(ahead.status) > statusRank(richest.status)) {
    const top = {
      date: ahead.events?.[0]?.date || "",
      time: ahead.events?.[0]?.time || "",
      status: ahead.status,
      location: ahead.currentLocation || ahead.events?.[0]?.location || "",
      description: ahead.events?.[0]?.description || ahead.status,
    };
    const rest = (richest.events || []).filter(
      (e) => String(e.status || "").toLowerCase() !== String(top.status).toLowerCase()
    );
    merged.events = [top, ...rest];
    merged.status = ahead.status;
    merged.statusCode = ahead.status.slice(0, 2).toUpperCase();
    merged.currentLocation = top.location || merged.currentLocation;
  }

  return merged;
}

async function postRunCourierApi(path, { base, apiKey, clientCode, trackingNumber }) {
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      auth_key: apiKey,
      client_code: clientCode,
      tracking_no: trackingNumber,
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
  return { res, text, json };
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
    const trackPath = resolveTrackPath(settingsCourier);
    const statusPath = resolveStatusPath(settingsCourier);

    const attemptPair = async () => {
      const [trackRes, statusRes] = await Promise.all([
        postRunCourierApi(trackPath, { base, apiKey, clientCode, trackingNumber: tn }),
        postRunCourierApi(statusPath, { base, apiKey, clientCode, trackingNumber: tn }),
      ]);

      const trackBusy = isBusyPayload(trackRes.json, trackRes.text);
      const statusBusy = isBusyPayload(statusRes.json, statusRes.text);

      let trackParsed = null;
      if (trackRes.res.ok && trackRes.json && !trackBusy) {
        trackParsed = parseRunCourierTrackingJson(trackRes.json, tn);
      }

      let statusParsed = null;
      if (statusRes.res.ok && statusRes.json && !statusBusy) {
        statusParsed = parseRunCourierTrackingJson(statusRes.json, tn);
      }

      return {
        merged: mergeRunCourierTrackResults(trackParsed, statusParsed),
        trackParsed,
        statusParsed,
        trackBusy,
        statusBusy,
      };
    };

    try {
      let best = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        if (attempt > 0) await sleep(400 * attempt);
        const result = await attemptPair();
        const candidate = result.merged;
        if (!candidate?.success) continue;

        if (
          !best ||
          statusRank(candidate.status) > statusRank(best.status) ||
          (candidate.events?.length || 0) > (best.events?.length || 0)
        ) {
          best = candidate;
        }
        // Good enough — full history or a terminal/in-transit status.
        if (!isThinEarlyLifecycle(best) && statusRank(best.status) >= 40) {
          break;
        }
      }

      // Never trust a lone "New Booked" over the public portal when scans exist there.
      if (!best || isThinEarlyLifecycle(best) || statusRank(best.status) < 40) {
        const scraped = await scrapePortal(tn);
        if (
          scraped?.success &&
          (!best ||
            statusRank(scraped.status) > statusRank(best.status) ||
            (scraped.events?.length || 0) > (best.events?.length || 0))
        ) {
          return scraped;
        }
      }

      if (best?.success && !isThinEarlyLifecycle(best)) return best;
      if (best?.success && statusRank(best.status) >= 40) return best;
      // Last resort: still return thin booking only if portal had nothing better.
      if (best?.success) return best;
    } catch {
      /* fall through to portal */
    }
  }

  const scraped = await scrapePortal(tn);
  if (scraped?.success) return scraped;
  return { success: false, error: "Tracking number not found on Run Courier." };
}
