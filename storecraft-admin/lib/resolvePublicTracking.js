/**
 * Public / multi-courier tracking resolver.
 * Only resolves consignments that belong to this store (no open courier proxy).
 */
import Order from "@/lib/models/Order.model";
import { fetchPostexTracking } from "@/lib/postex";
import { fetchRunCourierTracking, isRunCourierOrder, isPostexOrder } from "@/lib/runcourier";
import {
  normalizePublicTrackingNumber,
  toPublicTrackingPayload,
} from "@/lib/publicTracking";

export async function findOrderByTrackingNumber(trackingNumber) {
  const tn = String(trackingNumber || "").trim();
  if (!tn) return null;
  return Order.findOne({
    $or: [{ trackingNumber: tn }, { "tracking.number": tn }],
  })
    .select(
      "orderNumber courier trackingNumber tracking runCourierApi runCourierLabel paymentStatus paymentMethod orderStatus"
    )
    .lean();
}

/**
 * @returns {Promise<object>} sanitized public tracking payload
 */
export async function resolvePublicTracking(trackingNumber, { settingsCourier } = {}) {
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
    if (!live?.success) {
      live = await fetchRunCourierTracking(tn, { settingsCourier });
    }
  } else {
    const [px, rc] = await Promise.all([
      fetchPostexTracking(tn, { settingsCourier }),
      fetchRunCourierTracking(tn, { settingsCourier }),
    ]);
    live = px?.success ? px : rc;
  }

  if (!live?.success) {
    return toPublicTrackingPayload(live || { success: false, error: "Invalid tracking number" });
  }

  return toPublicTrackingPayload(
    {
      ...live,
      courier: live.courier || order.courier || live.courier,
    },
    { orderNumber: order.orderNumber || "" }
  );
}
