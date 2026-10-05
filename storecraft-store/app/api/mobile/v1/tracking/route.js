/**
 * GET /api/mobile/v1/tracking?trackingNumber=
 * Mobile wrapper over resolvePublicTracking — unified error envelope.
 * Missing/invalid → generic NOT_FOUND. Courier unset → TRACKING_UNAVAILABLE (503), not 500.
 */
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Settings, { SETTINGS_SINGLETON_KEY } from "@/lib/models/Settings.model";
import { mobileError } from "@/lib/mobile/response";
import { resolvePublicTracking } from "@/lib/resolvePublicTracking";
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
      const retryAfterSec = Math.max(1, Math.ceil(limited.remainingMs / 1000) || 60);
      return NextResponse.json(
        {
          error: {
            code: "RATE_LIMITED",
            message: "Too many tracking requests. Try again shortly.",
            retryAfterSeconds: retryAfterSec,
          },
        },
        { status: 429, headers: { "Retry-After": String(retryAfterSec), "Cache-Control": "no-store" } }
      );
    }

    const { searchParams } = new URL(request.url);
    const trackingNumber = normalizePublicTrackingNumber(
      searchParams.get("trackingNumber") || searchParams.get("tracking") || ""
    );
    if (!trackingNumber) {
      return mobileError("VALIDATION_ERROR", "Invalid tracking number.", {
        status: 400,
        fields: { trackingNumber: "Required." },
      });
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

    const result = await resolvePublicTracking(trackingNumber, {
      settingsCourier,
      // Mobile-only: do not mask PostEx "Tracking unavailable" with a RunCourier portal miss.
      keepPostexUnavailable: true,
    });

    if (result.success) {
      return NextResponse.json(
        {
          trackingNumber: result.trackingNumber || trackingNumber,
          status: result.status || "",
          statusCode: result.statusCode || "",
          courier: result.courier || "",
          events: result.events || [],
          estimatedDelivery: result.estimatedDelivery || "",
          origin: result.origin || "",
          destination: result.destination || "",
          currentLocation: result.currentLocation || "",
          orderNumber: result.orderNumber || "",
        },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    const errMsg = String(result.error || "");
    if (/unavailable/i.test(errMsg)) {
      return mobileError("TRACKING_UNAVAILABLE", "Tracking unavailable. Please try again later.", {
        status: 503,
      });
    }

    // Generic — do not distinguish missing order vs wrong number
    return mobileError("NOT_FOUND", "Tracking not found.", { status: 404 });
  } catch (e) {
    console.error("[mobile/tracking]", e?.message || e);
    // Never 500 for missing courier keys / upstream failures in preview
    return mobileError("TRACKING_UNAVAILABLE", "Tracking unavailable. Please try again later.", {
      status: 503,
    });
  }
}
