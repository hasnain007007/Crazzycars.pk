export const CURRENCY_SYMBOL = "Rs.";
export const CURRENCY_CODE = "PKR";

export function formatAdminPrice(amount) {
  const num = Number.parseFloat(amount) || 0;
  return `Rs. ${num.toLocaleString("en-PK", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}
