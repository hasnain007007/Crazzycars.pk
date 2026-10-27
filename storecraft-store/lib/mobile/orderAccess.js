/**
 * Authorization helpers for mobile order detail / list.
 * Wrong guest token, wrong owner, and missing auth all fail closed the same way.
 */
import { safeEqualString } from "@/lib/mobile/safeEqual";

/**
 * @param {object|null|undefined} order - lean order with publicAccessToken + customer.customerId
 * @param {{ guestToken?: string, customerId?: string|null }} opts
 * @returns {boolean}
 */
export function canAccessMobileOrder(order, opts = {}) {
  if (!order) return false;
  const guestToken = String(opts.guestToken || "").trim();
  if (guestToken) {
    const stored = String(order.publicAccessToken || "").trim();
    return Boolean(stored && safeEqualString(stored, guestToken));
  }
  const customerId = opts.customerId != null ? String(opts.customerId).trim() : "";
  if (!customerId) return false;
  const ownerId = String(order.customer?.customerId || "").trim();
  return Boolean(ownerId && ownerId === customerId);
}

/** Mongo filter for GET /orders — Bearer user's own orders only. */
export function ownOrdersFilter(customerId) {
  return { "customer.customerId": customerId };
}
