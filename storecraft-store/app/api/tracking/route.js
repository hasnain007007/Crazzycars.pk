import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { resolvePublicTracking } from "@/lib/resolvePublicTracking";
import Settings, { SETTINGS_SINGLETON_KEY } from "@/lib/models/Settings.model";
import Order from "@/lib/models/Order.model";
import { signReviewRequestToken } from "@/lib/reviewRequestToken";
import {
  checkPublicTrackingRateLimit,
  clientIpFromRequest,
  normalizePublicTrackingNumber,
} from "@/lib/publicTracking";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const ip = clientIpFromRequest(request);
    const limited = checkPublicTrackingRateLimit(ip, { max: 30, windowMs: 60_000 });
    if (limited.limited) {
      return NextResponse.json(
        { success: false, error: "Too many tracking requests. Try again shortly." },
        {
          status: 429,
          headers: {
            "Cache-Control": "no-store",
            "Retry-After": String(Math.ceil(limited.remainingMs / 1000) || 60),
          },
        }
      );
    }

    const { searchParams } = new URL(request.url);
    const trackingNumber = normalizePublicTrackingNumber(
      searchParams.get("trackingNumber") || searchParams.get("tracking") || ""
    );
    if (!trackingNumber) {
      return NextResponse.json(
        { success: false, error: "Invalid tracking number" },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    let settingsCourier = null;
    try {
      await dbConnect();
      const settings =
        (await Settings.findOne({ singletonKey: SETTINGS_SINGLETON_KEY }).lean()) ||
        (await Settings.findOne({}).lean());
      settingsCourier = settings?.courier || null;
    } catch {
      /* env-only fallback */
    }

    const result = await resolvePublicTracking(trackingNumber, { settingsCourier });
    // Delivered orders get a signed "Rate your order" link (reviews stay moderated).
    if (result?.success) {
      try {
        const order = await Order.findOne({
          $or: [{ trackingNumber }, { "tracking.number": trackingNumber }],
          orderStatus: "delivered",
        })
          .select("_id")
          .lean();
        const token = order ? signReviewRequestToken(String(order._id)) : "";
        if (token) result.reviewUrl = `/review/${order._id}?t=${encodeURIComponent(token)}`;
      } catch {
        /* no review link */
      }
    }
    const status = result.success ? 200 : result.error === "Tracking unavailable" ? 503 : 404;
    return NextResponse.json(result, {
      status,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e.message || "Could not connect to courier" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
