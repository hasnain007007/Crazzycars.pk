/**
 * Public multi-courier tracking for the storefront.
 * Only resolves consignments that belong to this store (no open courier proxy).
 *
 * Default behavior matches pre-423daf2 web `/api/tracking` (PostEx miss may fall
 * through to RunCourier portal). Pass `keepPostexUnavailable: true` from the
 * mobile wrapper so PostEx "Tracking unavailable" is not masked by a portal miss.
 */
import Order from "@/lib/models/Order.model";
import { fetchPostexTracking } from "@/lib/postex";
import { fetchRunCourierTracking, isRunCourierOrder, isPostexOrder } from "@/lib/runcourier";
import {
  normalizePublicTrackingNumber,
  toPublicTrackingPayload,
} from "@/lib/publicTracking";

async function findOrderByTrackingNumber(trackingNumber) {
  const tn = String(trackingNumber || "").trim();
  if (!tn) return null;
  return Order.findOne({
    $or: [
      { trackingNumber: tn },
      { "tracking.number": tn },
      { "previousTrackings.trackingNumber": tn },
    ],
  })
    .select(
      "orderNumber courier trackingNumber tracking runCourierApi runCourierLabel shippingAddress.city shippingAddress.cityName"
    )
    .lean();
}

/** True when a courier result should map to HTTP 503 TRACKING_UNAVAILABLE. */
export function isTrackingUnavailableError(result) {
  return /unavailable/i.test(String(result?.error || ""));
}

/**
 * When enabled (mobile only): PostEx booked parcels with missing keys must not
 * fall through to a RunCourier portal miss (which would become a generic 404).
 */
export function shouldKeepPostexUnavailable(postexResult, preferRunCourier) {
  return (
    !postexResult?.success &&
    isTrackingUnavailableError(postexResult) &&
    !preferRunCourier
  );
}

/**
 * Pure PostEx-branch decision (unit-tested).
 * Web: keepPostexUnavailable=false → always fall through to RunCourier on miss.
 * Mobile: keepPostexUnavailable=true → early-return "Tracking unavailable".
 */
export function afterPostexAttempt(postexResult, preferRunCourier, keepPostexUnavailable) {
  if (keepPostexUnavailable && shouldKeepPostexUnavailable(postexResult, preferRunCourier)) {
    return { action: "return", result: postexResult };
  }
  if (postexResult?.success) {
    return { action: "use", result: postexResult };
  }
  return { action: "fallback_runcourier" };
}

/**
 * @param {string} trackingNumber
 * @param {{
 *   settingsCourier?: object,
 *   keepPostexUnavailable?: boolean,
 * }} [options]
 */
export async function resolvePublicTracking(
  trackingNumber,
  { settingsCourier, keepPostexUnavailable = false } = {},
) {
  const tn = normalizePublicTrackingNumber(trackingNumber);
  if (!tn) {
    return { success: false, error: "Invalid tracking number" };
  }

  let order = null;
  try {
    order = await findOrderByTrackingNumber(tn);
  } catch {
    order = null;
  }

  // Security: only look up parcels we booked — never proxy arbitrary courier queries.
  if (!order) {
    return { success: false, error: "Invalid tracking number" };
  }

  const preferRunCourier = isRunCourierOrder(order);
  const preferPostex = isPostexOrder(order) || !preferRunCourier;
  let live = null;

  if (preferRunCourier) {
    live = await fetchRunCourierTracking(tn, { settingsCourier });
    if (!live?.success) {
      live = await fetchPostexTracking(tn, { settingsCourier });
    }
  } else if (preferPostex) {
    live = await fetchPostexTracking(tn, { settingsCourier });
    const decision = afterPostexAttempt(live, preferRunCourier, keepPostexUnavailable);
    if (decision.action === "return") {
      return toPublicTrackingPayload(decision.result);
    }
    if (decision.action === "use") {
      live = decision.result;
    } else {
      live = await fetchRunCourierTracking(tn, { settingsCourier });
    }
  } else {
    const [px, rc] = await Promise.all([
      fetchPostexTracking(tn, { settingsCourier }),
      fetchRunCourierTracking(tn, { settingsCourier }),
    ]);
    if (keepPostexUnavailable) {
      live = px?.success
        ? px
        : rc?.success
          ? rc
          : isTrackingUnavailableError(px)
            ? px
            : rc;
    } else {
      // Pre-423daf2 web behavior: prefer PostEx success, else RunCourier (even if PostEx said unavailable).
      live = px?.success ? px : rc;
    }
  }

  if (!live?.success) {
    if (keepPostexUnavailable && isTrackingUnavailableError(live)) {
      return toPublicTrackingPayload(live);
    }
    return toPublicTrackingPayload(live || { success: false, error: "Invalid tracking number" });
  }

  const orderCity = String(
    order.shippingAddress?.city || order.shippingAddress?.cityName || ""
  ).trim();

  return toPublicTrackingPayload(
    {
      ...live,
      courier: live.courier || order.courier || live.courier,
      destination: live.destination || orderCity || "",
    },
    { orderNumber: order.orderNumber || "" }
  );
}
