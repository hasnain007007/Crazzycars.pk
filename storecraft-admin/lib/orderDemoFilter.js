/**
 * Demo / seed orders must never affect live finance, dashboard, or reports.
 * Seed sets isDemo: true on PROFIT-DEMO-* orders.
 */
export const NOT_DEMO = Object.freeze({ isDemo: { $ne: true } });

/** Merge into a Mongo find/count filter. */
export function withoutDemo(filter = {}) {
  if (!filter || typeof filter !== "object") return { ...NOT_DEMO };
  return { ...filter, isDemo: { $ne: true } };
}

/** For aggregation $match stages. */
export function matchWithoutDemo(match = {}) {
  return withoutDemo(match);
}
