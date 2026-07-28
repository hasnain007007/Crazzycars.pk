/**
 * Sale schedule + effective storefront unit price.
 *
 * Rules:
 * - Sale price with schedule disabled / missing → always on (unlimited)
 * - Schedule enabled → respect startDate; endDate optional (no end = unlimited)
 */

export function isSaleCurrentlyActive(pricing, now = new Date()) {
  if (!pricing) return false;
  const regular = Number(pricing.regularPrice) || 0;
  const sale = Number(pricing.salePrice);
  if (!Number.isFinite(sale) || sale <= 0) return false;
  if (regular > 0 && sale >= regular) return false;

  const sch = pricing.saleSchedule;
  if (!sch?.enabled) return true;

  const t = now instanceof Date ? now.getTime() : Date.now();
  const start = sch.startDate ? new Date(sch.startDate).getTime() : null;
  const end = sch.endDate ? new Date(sch.endDate).getTime() : null;
  if (start && !Number.isNaN(start) && t < start) return false;
  if (end && !Number.isNaN(end) && t > end) return false;
  return true;
}

/**
 * Effective storefront price (sale when active / unscheduled = unlimited).
 */
export function effectiveUnitPrice(product) {
  if (!product?.pricing) return 0;
  const regular = Number(product.pricing.regularPrice) || 0;
  const sale = Number(product.pricing.salePrice);
  if (!Number.isFinite(sale) || sale <= 0) return regular;
  if (!isSaleCurrentlyActive(product.pricing)) return regular;
  return Math.min(regular || sale, sale);
}
