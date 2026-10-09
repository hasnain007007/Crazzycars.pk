/**
 * Archive the current tracking ID before rebook / replace so ops can still see old AWB numbers.
 */

const MAX_PREVIOUS = 20;

/**
 * @param {object} order — mongoose doc or plain object
 * @returns {string}
 */
export function currentTrackingNumber(order) {
  return String(order?.trackingNumber || order?.tracking?.number || "").trim();
}

/**
 * Push current tracking onto previousTrackings when it differs from the incoming number.
 * @param {object} order — mongoose Order document (mutated)
 * @param {{
 *   nextTrackingNumber?: string,
 *   reason?: string,
 *   replacedBy?: string,
 * }} [opts]
 * @returns {object|null} archived entry, or null if nothing archived
 */
export function archiveCurrentTracking(order, opts = {}) {
  if (!order) return null;
  const prev = currentTrackingNumber(order);
  if (!prev) return null;

  const next = String(opts.nextTrackingNumber || "").trim();
  if (next && prev.toLowerCase() === next.toLowerCase()) return null;

  const entry = {
    trackingNumber: prev,
    courier: String(order.courier || order.tracking?.carrier || "").trim(),
    trackingUrl: String(order.trackingUrl || order.tracking?.url || "").trim(),
    runCourierApi: String(order.runCourierApi || "").trim(),
    bookedAt: order.runCourierBookedAt || order.shippedAt || null,
    replacedAt: new Date(),
    replacedBy: String(opts.replacedBy || "Admin").trim() || "Admin",
    reason: String(opts.reason || "rebook").trim() || "rebook",
  };

  if (!Array.isArray(order.previousTrackings)) order.previousTrackings = [];
  // Avoid duplicate consecutive archives of the same AWB.
  const last = order.previousTrackings[order.previousTrackings.length - 1];
  if (last && String(last.trackingNumber || "").trim().toLowerCase() === prev.toLowerCase()) {
    // Refresh metadata on the existing entry instead of duplicating.
    last.replacedAt = entry.replacedAt;
    last.replacedBy = entry.replacedBy;
    last.reason = entry.reason;
    if (typeof order.markModified === "function") order.markModified("previousTrackings");
    return last;
  }

  order.previousTrackings.push(entry);
  if (order.previousTrackings.length > MAX_PREVIOUS) {
    order.previousTrackings = order.previousTrackings.slice(-MAX_PREVIOUS);
  }
  if (typeof order.markModified === "function") order.markModified("previousTrackings");
  return entry;
}

/** Plain JSON for admin UI. */
export function serializePreviousTrackings(order) {
  const rows = Array.isArray(order?.previousTrackings) ? order.previousTrackings : [];
  return rows
    .map((r) => ({
      trackingNumber: String(r?.trackingNumber || "").trim(),
      courier: String(r?.courier || "").trim(),
      trackingUrl: String(r?.trackingUrl || "").trim(),
      runCourierApi: String(r?.runCourierApi || "").trim(),
      bookedAt: r?.bookedAt || null,
      replacedAt: r?.replacedAt || null,
      replacedBy: String(r?.replacedBy || "").trim(),
      reason: String(r?.reason || "").trim(),
    }))
    .filter((r) => r.trackingNumber)
    .reverse(); // newest archive first
}
