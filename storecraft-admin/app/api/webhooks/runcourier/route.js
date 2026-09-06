/**
 * Run Courier → StoreCraft status webhook.
 * Header: X-Webhook-Secret = RUN_COURIER_WEBHOOK_SECRET (falls back to POSTEX_WEBHOOK_SECRET)
 * Body: flexible — trackingNumber/cn, orderReferenceNumber/orderRef, status/orderStatus
 */
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import "@/lib/registerModels";
import Order from "@/lib/models/Order.model";
import RunCourierWebhookLog from "@/lib/models/RunCourierWebhookLog.model";
import { logActivity } from "@/lib/auth";
import {
  RAW_PAYLOAD_LOG_LIMIT,
  RUN_COURIER_WEBHOOK_HEADER,
  applyRunCourierStatusToOrder,
  parseRunCourierWebhookPayload,
  verifyRunCourierWebhookSecret,
} from "@/lib/runcourierWebhook";
import { dispatchOrderLifecycleEmails } from "@/lib/customerLifecycleEmail";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getSecretHeader(request) {
  return (
    request.headers.get("x-webhook-secret") ||
    request.headers.get("X-Webhook-Secret") ||
    request.headers.get(RUN_COURIER_WEBHOOK_HEADER) ||
    ""
  );
}

async function writeLog(entry) {
  try {
    await RunCourierWebhookLog.create(entry);
  } catch (e) {
    console.error("[runcourier-webhook] log write failed:", e?.message || e);
  }
}

export async function POST(request) {
  try {
    const auth = verifyRunCourierWebhookSecret(getSecretHeader(request));
    if (!auth.ok) {
      await dbConnect().catch(() => null);
      await writeLog({
        ok: false,
        httpStatus: 401,
        outcome: "unauthorized",
        error: auth.error,
      });
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const rawBody = await request.json().catch(() => null);
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

    const parsed = parseRunCourierWebhookPayload(rawBody);
    await dbConnect();

    const rawLogCount = await RunCourierWebhookLog.countDocuments({
      rawPayload: { $ne: null },
    });
    const storeRaw = rawLogCount < RAW_PAYLOAD_LOG_LIMIT;

    if (!parsed.trackingNumber && !parsed.orderReferenceNumber) {
      await writeLog({
        ok: false,
        httpStatus: 400,
        outcome: "missing_keys",
        error: "trackingNumber or orderReferenceNumber required",
        rawPayload: storeRaw ? rawBody : null,
        runCourierStatus: parsed.orderStatus,
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
        httpStatus: 404,
        outcome: "order_not_found",
        trackingNumber: parsed.trackingNumber,
        orderReferenceNumber: parsed.orderReferenceNumber,
        runCourierStatus: parsed.orderStatus,
        rawPayload: storeRaw ? rawBody : null,
        error: "Order not found",
      });
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
    }

    const applied = applyRunCourierStatusToOrder(order, parsed);
    if (applied.changed) {
      await order.save();
      try {
        await dispatchOrderLifecycleEmails(order, {
          previousStatus: null,
          forceStatuses: applied.mappedOrderStatus ? [applied.mappedOrderStatus] : [],
        });
      } catch (e) {
        console.warn("[runcourier-webhook] lifecycle email:", e?.message || e);
      }
      try {
        await logActivity({
          userId: null,
          action: "runcourier_webhook_status",
          entityType: "order",
          entityId: String(order._id),
          meta: {
            trackingNumber: parsed.trackingNumber,
            status: parsed.orderStatus,
            mapped: applied.mappedOrderStatus,
            notes: applied.notes,
          },
        });
      } catch {
        /* ignore */
      }
    }

    await writeLog({
      ok: true,
      httpStatus: 200,
      outcome: applied.changed ? "updated" : "noop",
      trackingNumber: parsed.trackingNumber,
      orderReferenceNumber: parsed.orderReferenceNumber,
      runCourierStatus: parsed.orderStatus,
      orderId: String(order._id),
      orderNumber: order.orderNumber,
      mappedOrderStatus: applied.mappedOrderStatus || "",
      codMarkedPaid: applied.codMarkedPaid,
      rawPayload: storeRaw ? rawBody : null,
    });

    return NextResponse.json({
      success: true,
      changed: applied.changed,
      orderNumber: order.orderNumber,
      mappedOrderStatus: applied.mappedOrderStatus,
      codMarkedPaid: applied.codMarkedPaid,
      notes: applied.notes,
    });
  } catch (e) {
    console.error("[runcourier-webhook]", e);
    return NextResponse.json(
      { success: false, error: e.message || "Webhook failed" },
      { status: 500 }
    );
  }
}
