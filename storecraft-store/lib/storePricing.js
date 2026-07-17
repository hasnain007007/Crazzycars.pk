/**
 * Effective storefront price (sale when scheduled / active).
 */
export function effectiveUnitPrice(product) {
  if (!product?.pricing) return 0;
  const regular = Number(product.pricing.regularPrice) || 0;
  const sale = Number(product.pricing.salePrice);
  if (!Number.isFinite(sale) || sale <= 0) return regular;
  const sch = product.pricing.saleSchedule;
  if (!sch?.enabled) return regular;
  const now = Date.now();
  const start = sch.startDate ? new Date(sch.startDate).getTime() : null;
  const end = sch.endDate ? new Date(sch.endDate).getTime() : null;
  if (start && now < start) return regular;
  if (end && now > end) return regular;
  return Math.min(regular, sale);
}
