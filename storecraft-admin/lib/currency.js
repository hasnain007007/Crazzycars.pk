export const CURRENCY_SYMBOL = "Rs.";
export const CURRENCY_CODE = "PKR";

/** Whole-rupee money for admin/COD (no paisa). */
export function roundRupees(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.round(n));
}

export function formatAdminPrice(amount) {
  const num = roundRupees(amount);
  return `Rs. ${num.toLocaleString("en-PK", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}
