/**
 * GET /api/mobile/v1/orders/track?orderNumber=&phone=
 * Public order tracking. Rate limited: mobile-track (10 / 10min per IP).
 * Returns minimal fields only. Generic "Order not found" — no info leakage.
 */
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Order from "@/lib/models/Order.model";
import { normalizePkMobile } from "@/lib/customerPhone";
import { mobileError } from "@/lib/mobile/response";
import { requestIp } from "@/lib/requestIp";
import {
  actionRateLimitKey,
  checkActionRateLimit,
  recordActionAttempt,
} from "@/lib/actionRateLimit";

export const dynamic = "force-dynamic";

const TRACK_RATE = { maxAttempts: 10, windowMs: 10 * 60 * 1000 };

export async function GET(request) {
  const ip = requestIp(request);
  const rateLimitKey = actionRateLimitKey("mobile-track", "track", ip);
  const rateLimit = await checkActionRateLimit(rateLimitKey, TRACK_RATE);
  if (rateLimit.limited) {
    const retryAfterSec = Math.max(1, Math.ceil(rateLimit.remainingMs / 1000));
    return NextResponse.json(
      { error: { code: "RATE_LIMITED", message: "Too many requests. Please try again later.", retryAfterSeconds: retryAfterSec } },
      { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
    );
  }

  const { searchParams } = new URL(request.url);
  const orderNumber = String(searchParams.get("orderNumber") || "").trim().toUpperCase();
  const phoneRaw = String(searchParams.get("phone") || "").trim();

  if (!orderNumber) {
    return mobileError("VALIDATION_ERROR", "orderNumber is required.", {
      status: 400,
      fields: { orderNumber: "Required." },
    });
  }
  if (!phoneRaw) {
    return mobileError("VALIDATION_ERROR", "phone is required.", {
      status: 400,
      fields: { phone: "Required." },
    });
  }

  const phone = normalizePkMobile(phoneRaw) || phoneRaw.replace(/\D/g, "");

  await dbConnect();
  await recordActionAttempt(rateLimitKey, TRACK_RATE);

  const order = await Order.findOne({ orderNumber })
    .select("orderNumber orderStatus paymentStatus paymentMethod pricing shippingAddress customer timeline tracking createdAt updatedAt")
    .lean();

  if (!order) {
    return mobileError("NOT_FOUND", "Order not found.", { status: 404 });
  }

  // Verify phone matches — compare normalized form
  const orderPhone = normalizePkMobile(order.customer?.phone || "") || String(order.customer?.phone || "").replace(/\D/g, "");
  const providedPhone = normalizePkMobile(phone) || phone;

  if (!orderPhone || !providedPhone || orderPhone !== providedPhone) {
    // Generic — do not distinguish "wrong phone" from "not found"
    return mobileError("NOT_FOUND", "Order not found.", { status: 404 });
  }

  return NextResponse.json({
    orderNumber: order.orderNumber,
    status: order.orderStatus,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod,
    pricing: order.pricing
      ? {
          subtotal: order.pricing.subtotal,
          discount: order.pricing.discount,
          shippingCost: order.pricing.shippingCost,
          total: order.pricing.total,
        }
      : null,
    shippingCity: order.shippingAddress?.city || "",
    shippingProvince: order.shippingAddress?.state || order.shippingAddress?.province || "",
    timeline: (order.timeline || []).map((t) => ({
      status: t.status,
      title: t.title,
      description: t.description,
      timestamp: t.timestamp,
    })),
    tracking: order.tracking
      ? { number: order.tracking.number || "", url: order.tracking.url || "" }
      : null,
    createdAt: order.createdAt,
  });
}
