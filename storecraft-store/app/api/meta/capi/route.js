/**
 * Public bridge: browser → Meta Conversions API (hashed PII server-side).
 * Pixel + CAPI share event_id for deduplication.
 */
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import {
  actionRateLimitKey,
  checkActionRateLimit,
  rateLimitResponse,
  recordActionAttempt,
} from "@/lib/actionRateLimit";
import {
  buildPurchaseCustomData,
  hashUserData,
  isAllowedMetaEvent,
  moneyMeta,
  newMetaEventId,
  readMetaCookiesFromRequest,
  resolveMetaCapiConfig,
  sendMetaCapiEvent,
} from "@/lib/metaCapi";
import { requestIp } from "@/lib/requestIp";

const RATE = { maxAttempts: 60, windowMs: 10 * 60 * 1000 };

const SAFE_CUSTOM_KEYS = new Set([
  "content_ids",
  "content_type",
  "contents",
  "currency",
  "value",
  "num_items",
  "order_id",
  "search_string",
  "status",
]);

function sanitizeCustomData(raw, eventName) {
  if (!raw || typeof raw !== "object") return undefined;
  const out = {};
  for (const [k, v] of Object.entries(raw)) {
    if (!SAFE_CUSTOM_KEYS.has(k)) continue;
    out[k] = v;
  }
  if (out.value != null) out.value = moneyMeta(out.value);
  if (!out.currency) out.currency = "PKR";
  if (eventName === "Purchase" && Array.isArray(out.content_ids)) {
    return buildPurchaseCustomData({
      value: out.value,
      currency: out.currency,
      contentIds: out.content_ids,
      contents: out.contents,
      numItems: out.num_items,
      orderId: out.order_id,
    });
  }
  return Object.keys(out).length ? out : undefined;
}

export async function POST(request) {
  const ip = requestIp(request);
  await dbConnect();
  const rlKey = actionRateLimitKey("meta-capi", "anon", ip || "unknown");
  const limited = await checkActionRateLimit(rlKey, RATE);
  if (limited?.limited) return rateLimitResponse(limited.remainingMs);

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON." }, { status: 400 });
  }

  const eventName = String(body?.eventName || body?.event_name || "").trim();
  if (!isAllowedMetaEvent(eventName)) {
    return NextResponse.json({ success: false, error: "Unsupported event." }, { status: 400 });
  }

  await recordActionAttempt(rlKey, RATE);

  const config = await resolveMetaCapiConfig();
  if (!config.enabled) {
    return NextResponse.json({ success: true, skipped: true, reason: "not_configured" });
  }

  const cookies = readMetaCookiesFromRequest(request);
  const fbp = String(body?.fbp || cookies.fbp || "").trim();
  const fbc = String(body?.fbc || cookies.fbc || "").trim();
  const eventId = String(body?.eventId || body?.event_id || "").trim() || newMetaEventId();
  const eventSourceUrl = String(body?.eventSourceUrl || body?.event_source_url || "").trim();

  const userData = hashUserData({
    email: body?.email,
    phone: body?.phone,
    firstName: body?.firstName || body?.fn,
    lastName: body?.lastName || body?.ln,
    city: body?.city,
    state: body?.state || body?.province,
    zip: body?.zip || body?.postalCode,
    country: body?.country || "pk",
    externalId: body?.externalId,
    fbp,
    fbc,
    clientIpAddress: ip,
    clientUserAgent: request.headers.get("user-agent") || "",
  });

  const result = await sendMetaCapiEvent({
    eventName,
    eventId,
    eventSourceUrl: eventSourceUrl || request.headers.get("referer") || "",
    userData,
    customData: sanitizeCustomData(body?.customData || body?.custom_data, eventName),
    config,
  });

  return NextResponse.json({
    success: Boolean(result.ok || result.skipped),
    skipped: Boolean(result.skipped),
    eventId: result.eventId || eventId,
  });
}
