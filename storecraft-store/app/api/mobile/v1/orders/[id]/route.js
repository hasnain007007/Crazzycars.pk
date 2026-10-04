/**
 * GET /api/mobile/v1/orders/:id
 * Auth: Bearer (must own) OR header X-Order-Access-Token (guest publicAccessToken).
 * Wrong token and missing id → same generic 404. Rate limited.
 */
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/db";
import Order from "@/lib/models/Order.model";
import Settings, { SETTINGS_SINGLETON_KEY } from "@/lib/models/Settings.model";
import { optionalMobileAuth } from "@/lib/mobile/auth";
import { mobileError } from "@/lib/mobile/response";
import { safeEqualString } from "@/lib/mobile/safeEqual";
import { serializeMobileOrderDetail } from "@/lib/mobile/serializeMobileOrder";
import { requestIp } from "@/lib/requestIp";
import {
  actionRateLimitKey,
  checkActionRateLimit,
  recordActionAttempt,
} from "@/lib/actionRateLimit";

export const dynamic = "force-dynamic";

const DETAIL_RATE = { maxAttempts: 30, windowMs: 10 * 60 * 1000 };

function genericNotFound() {
  return mobileError("NOT_FOUND", "Order not found.", { status: 404 });
}

export async function GET(request, context) {
  const ip = requestIp(request);
  const rateLimitKey = actionRateLimitKey("mobile-order-detail", "detail", ip);
  const rateLimit = await checkActionRateLimit(rateLimitKey, DETAIL_RATE);
  if (rateLimit.limited) {
    const retryAfterSec = Math.max(1, Math.ceil(rateLimit.remainingMs / 1000));
    return NextResponse.json(
      {
        error: {
          code: "RATE_LIMITED",
          message: "Too many requests. Please try again later.",
          retryAfterSeconds: retryAfterSec,
        },
      },
      { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
    );
  }

  const { id } = await context.params;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    await recordActionAttempt(rateLimitKey, DETAIL_RATE);
    return genericNotFound();
  }

  const guestToken = String(request.headers.get("x-order-access-token") || "").trim();

  await dbConnect();
  await recordActionAttempt(rateLimitKey, DETAIL_RATE);

  const order = await Order.findById(id)
    .select(
      "orderNumber orderStatus paymentStatus paymentMethod pricing items timeline tracking trackingNumber trackingUrl courier shippingAddress customer payment publicAccessToken createdAt"
    )
    .lean();

  if (!order) {
    return genericNotFound();
  }

  let authorized = false;

  if (guestToken) {
    const stored = String(order.publicAccessToken || "").trim();
    if (stored && safeEqualString(stored, guestToken)) {
      authorized = true;
    }
  } else {
    try {
      const auth = await optionalMobileAuth(request);
      if (auth?.customer?._id) {
        const ownerId = String(order.customer?.customerId || "");
        if (ownerId && ownerId === String(auth.customer._id)) {
          authorized = true;
        }
      }
    } catch {
      /* treat as unauthorized */
    }
  }

  if (!authorized) {
    return genericNotFound();
  }

  const settingsDoc =
    (await Settings.findOne({ singletonKey: SETTINGS_SINGLETON_KEY }).lean()) ||
    (await Settings.findOne({}).lean());

  return NextResponse.json({
    order: serializeMobileOrderDetail(order, settingsDoc),
  });
}
