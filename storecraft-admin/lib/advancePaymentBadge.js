/**
 * Advance-payment badge helpers for admin orders.
 */
export function resolveAdvanceBadge(order) {
  const advanceRequired = Math.max(0, Number(order?.payment?.advanceRequired) || 0);
  if (advanceRequired <= 0) return null;
  const status = String(order?.paymentStatus || "unpaid").toLowerCase();
  if (status === "paid" || status === "refunded" || status === "failed") return null;
  const paid = Math.max(
    0,
    Number(order?.payment?.paidAmount ?? order?.payment?.amount) || 0
  );
  if (paid + 0.5 >= advanceRequired) {
    return { kind: "received", label: "Advance received" };
  }
  return { kind: "pending", label: "Advance pending" };
}
