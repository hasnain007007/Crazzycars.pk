/**
 * Postex → StoreCraft status webhook.
 * Header: X-Webhook-Secret = POSTEX_WEBHOOK_SECRET
 * Body: { trackingNumber, orderReferenceNumber, statusUpdateDatetime, orderStatus }
 */
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import "@/lib/registerModels";
import Order from "@/lib/models/Order.model";
import Settings, { SETTINGS_SINGLETON_KEY } from "@/lib/models/Settings.model";
import PostexWebhookLog from "@/lib/models/PostexWebhookLog.model";
import { logActivity } from "@/lib/auth";
import {
  RAW_PAYLOAD_LOG_LIMIT,
  POSTEX_WEBHOOK_HEADER,
  applyPostexStatusToOrder,
  buildWhatsAppWouldNotify,
  parsePostexWebhookPayload,
  verifyPostexWebhookSecret,
} from "@/lib/postexWebhook";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getSecretHeader(request) {
  return (
    request.headers.get("x-webhook-secret") ||
    request.headers.get("X-Webhook-Secret") ||
    request.headers.get(POSTEX_WEBHOOK_HEADER) ||
    ""
  );
}

async function writeLog(entry) {
  try {
    await PostexWebhookLog.create(entry);
  } catch (e) {
    console.error("[postex-webhook] log write failed:", e?.message || e);
  }
}

export async function POST(request) {
  const started = Date.now();
  let rawBody = null;

  try {
    const auth = verifyPostexWebhookSecret(getSecretHeader(request));
    if (!auth.ok) {
      console.warn("[postex-webhook] unauthorized:", auth.error);
      await dbConnect().catch(() => null);
      await writeLog({
        ok: false,
        httpStatus: 401,
        outcome: "unauthorized",
        error: auth.error,
      });
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    rawBody = await request.json().catch(() => null);
    if (!rawBody || typeof rawBody !== "object") {
      await dbConnect();
      await writeLog({
        ok: false,
        httpStatus: 400,
        outcome: "invalid_json",
        error: "Body must be JSON object",
        rawPayload: rawBody,
      });
      return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = parsePostexWebhookPayload(rawBody);
    await dbConnect();

    const rawLogCount = await PostexWebhookLog.countDocuments({
      rawPayload: { $ne: null },
    });
    const storeRaw = rawLogCount < RAW_PAYLOAD_LOG_LIMIT;

    if (!parsed.trackingNumber && !parsed.orderReferenceNumber) {
      await writeLog({
        ok: false,
        httpStatus: 400,
        outcome: "missing_ids",
        postexStatus: parsed.orderStatus,
        error: "trackingNumber or orderReferenceNumber required",
        rawPayload: storeRaw ? rawBody : null,
      });
      return NextResponse.json(
        { success: false, error: "trackingNumber or orderReferenceNumber required" },
        { status: 400 }
      );
    }

    const or = [];
    if (parsed.trackingNumber) {
      or.push({ trackingNumber: parsed.trackingNumber });
      or.push({ "tracking.number": parsed.trackingNumber });
    }
    if (parsed.orderReferenceNumber) {
      or.push({ orderNumber: parsed.orderReferenceNumber });
    }

    const order = await Order.findOne({ $or: or });
    if (!order) {
      await writeLog({
        ok: false,
        httpStatus: 200,
        outcome: "order_not_found",
        trackingNumber: parsed.trackingNumber,
        orderReferenceNumber: parsed.orderReferenceNumber,
        postexStatus: parsed.orderStatus,
        error: "No matching order",
        rawPayload: storeRaw ? rawBody : null,
      });
      // Ack 200 so Postex does not retry forever for unknown CNs
      return NextResponse.json({
        success: true,
        matched: false,
        message: "No matching order",
        ms: Date.now() - started,
      });
    }

    const settingsDoc =
      (await Settings.findOne({ key: SETTINGS_SINGLETON_KEY }).lean()) ||
      (await Settings.findOne({}).lean()) ||
      {};

    const applied = applyPostexStatusToOrder(order, parsed);
    if (applied.changed) {
      await order.save();
    }

    const wa = buildWhatsAppWouldNotify(order, settingsDoc, parsed.orderStatus);

    if (applied.codMarkedPaid) {
      await logActivity({
        userName: "Postex webhook",
        action: `Order #${order.orderNumber}: COD delivery confirmed via Postex webhook, payment status auto-updated to Paid`,
        resource: "Order",
        resourceId: String(order._id),
        type: "update",
        details: {
          source: "postex-webhook",
          postexStatus: parsed.orderStatus,
          trackingNumber: parsed.trackingNumber,
          paymentMethod: order.paymentMethod,
          paymentStatus: order.paymentStatus,
        },
      });
    } else if (applied.changed) {
      await logActivity({
        userName: "Postex webhook",
        action: `Order #${order.orderNumber}: Postex status "${parsed.orderStatus}" applied (${applied.notes.join("; ")})`,
        resource: "Order",
        resourceId: String(order._id),
        type: "update",
        details: {
          source: "postex-webhook",
          postexStatus: parsed.orderStatus,
          mappedOrderStatus: applied.mappedOrderStatus,
          trackingNumber: parsed.trackingNumber,
        },
      });
    }

    if (wa.wouldNotify) {
      console.info(
        "[postex-webhook] WhatsApp A dry-run (not sent):",
        order.orderNumber,
        wa.reason,
        wa.preview?.slice(0, 200)
      );
    }

    await writeLog({
      ok: true,
      httpStatus: 200,
      outcome: applied.changed ? "updated" : "noop",
      trackingNumber: parsed.trackingNumber,
      orderReferenceNumber: parsed.orderReferenceNumber,
      postexStatus: parsed.orderStatus,
      orderId: String(order._id),
      orderNumber: order.orderNumber || "",
      mappedOrderStatus: applied.mappedOrderStatus || "",
      codMarkedPaid: applied.codMarkedPaid,
      whatsappWouldNotify: wa.wouldNotify,
      whatsappPreview: wa.wouldNotify ? String(wa.preview || "").slice(0, 2000) : "",
      rawPayload: storeRaw ? rawBody : null,
      error: "",
    });

    return NextResponse.json({
      success: true,
      matched: true,
      orderNumber: order.orderNumber,
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus,
      changed: applied.changed,
      codMarkedPaid: applied.codMarkedPaid,
      whatsappWouldNotify: wa.wouldNotify,
      notes: applied.notes,
      ms: Date.now() - started,
    });
  } catch (e) {
    console.error("[postex-webhook] error:", e);
    try {
      await dbConnect();
      const rawLogCount = await PostexWebhookLog.countDocuments({
        rawPayload: { $ne: null },
      });
      await writeLog({
        ok: false,
        httpStatus: 500,
        outcome: "error",
        error: e?.message || "Webhook failed",
        rawPayload: rawLogCount < RAW_PAYLOAD_LOG_LIMIT ? rawBody : null,
      });
    } catch {
      /* ignore */
    }
    return NextResponse.json({ success: false, error: "Webhook handler error" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    service: "postex-status-webhook",
    header: "X-Webhook-Secret",
    env: "POSTEX_WEBHOOK_SECRET",
  });
}
