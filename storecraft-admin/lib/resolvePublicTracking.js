/**
 * Public / multi-courier tracking resolver.
 * Looks up the order by CN when possible, then calls PostEx or Run Courier.
 */
import Order from "@/lib/models/Order.model";
import { fetchPostexTracking } from "@/lib/postex";
import { fetchRunCourierTracking, isRunCourierOrder, isPostexOrder } from "@/lib/runcourier";

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
 * @returns {Promise<object>} tracking result shaped for public/admin UIs
 */
export async function resolvePublicTracking(trackingNumber, { settingsCourier } = {}) {
  const tn = String(trackingNumber || "").trim();
  if (!tn || tn.length < 4) {
    return { success: false, error: "Invalid tracking number" };
  }

  let order = null;
  try {
    order = await findOrderByTrackingNumber(tn);
  } catch {
    order = null;
  }

  const preferRunCourier = order ? isRunCourierOrder(order) : false;
  const preferPostex = order ? isPostexOrder(order) : !preferRunCourier;

  if (preferRunCourier) {
    const rc = await fetchRunCourierTracking(tn, { settingsCourier });
    if (rc.success) {
      return {
        ...rc,
        courier: rc.courier || order?.courier || "Run Courier",
        orderNumber: order?.orderNumber || "",
      };
    }
    const px = await fetchPostexTracking(tn, { settingsCourier });
    if (px.success) return { ...px, orderNumber: order?.orderNumber || "" };
    return rc;
  }

  if (preferPostex) {
    const px = await fetchPostexTracking(tn, { settingsCourier });
    if (px.success) {
      return { ...px, orderNumber: order?.orderNumber || "" };
    }
    const rc = await fetchRunCourierTracking(tn, { settingsCourier });
    if (rc.success) {
      return {
        ...rc,
        courier: rc.courier || "Run Courier",
        orderNumber: order?.orderNumber || "",
      };
    }
    return px;
  }

  // Unknown: try both
  const [px, rc] = await Promise.all([
    fetchPostexTracking(tn, { settingsCourier }),
    fetchRunCourierTracking(tn, { settingsCourier }),
  ]);
  if (px.success) return { ...px, orderNumber: order?.orderNumber || "" };
  if (rc.success) {
    return {
      ...rc,
      courier: rc.courier || "Run Courier",
      orderNumber: order?.orderNumber || "",
    };
  }
  return px.success === false && px.error === "Tracking unavailable" ? rc : px;
}
