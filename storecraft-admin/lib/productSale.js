/**
 * Sale schedule + effective on-sale state for product pricing.
 */

/**
 * @param {{ regularPrice?: number; salePrice?: number; saleSchedule?: { enabled?: boolean; startDate?: Date|string|null; endDate?: Date|string|null } }} pricing
 * @param {Date} [now]
 * @returns {{ isOnSale: boolean; saleBadge: 'active'|'scheduled'|'ended'|null; effectiveSalePrice: number|null }}
 */
export function computeProductSaleState(pricing, now = new Date()) {
  const rawSale = pricing?.salePrice;
  const saleNum =
    rawSale === null || rawSale === undefined || rawSale === "" || Number.isNaN(Number(rawSale)) ? null : Number(rawSale);
  const hasSalePrice = saleNum !== null && Number.isFinite(saleNum);

  if (!hasSalePrice) {
    return { isOnSale: false, saleBadge: null, effectiveSalePrice: null };
  }

  const sched = pricing?.saleSchedule || {};
  const enabled = Boolean(sched.enabled);

  if (!enabled) {
    return { isOnSale: true, saleBadge: null, effectiveSalePrice: saleNum };
  }

  const start = sched.startDate ? new Date(sched.startDate) : null;
  const end = sched.endDate ? new Date(sched.endDate) : null;
  const ok = start && end && !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime());

  if (!ok) {
    return { isOnSale: true, saleBadge: null, effectiveSalePrice: saleNum };
  }

  if (now < start) {
    return { isOnSale: false, saleBadge: "scheduled", effectiveSalePrice: null };
  }
  if (now > end) {
    return { isOnSale: false, saleBadge: "ended", effectiveSalePrice: null };
  }
  return { isOnSale: true, saleBadge: "active", effectiveSalePrice: saleNum };
}

/**
 * Attach computed `isOnSale` for API JSON (lean doc).
 */
export function withProductSaleComputed(doc) {
  if (!doc || typeof doc !== "object") return doc;
  const pricing = doc.pricing;
  const { isOnSale } = computeProductSaleState(pricing);
  return { ...doc, isOnSale };
}
