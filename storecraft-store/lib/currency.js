export const CURRENCY_SYMBOL = "Rs.";
export const CURRENCY_CODE = "PKR";

let storeCurrencyCode = CURRENCY_CODE;

export function setStoreCurrency(code) {
  storeCurrencyCode = String(code || CURRENCY_CODE).toUpperCase();
}

function formatPkrAmount(amount) {
  const num = Number.parseFloat(amount) || 0;
  const formatted = new Intl.NumberFormat("en-PK", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
  return `Rs.${formatted}`;
}

export function formatPrice(amount) {
  if (storeCurrencyCode === "USD") {
    const num = Number.parseFloat(amount) || 0;
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(num);
  }
  if (storeCurrencyCode === "EUR") {
    const num = Number.parseFloat(amount) || 0;
    return new Intl.NumberFormat("en-EU", { style: "currency", currency: "EUR" }).format(num);
  }
  return formatPkrAmount(amount);
}

export function formatPriceShort(amount) {
  const num = Number.parseFloat(amount) || 0;
  if (num === 0) return "Rs.0";
  return formatPkrAmount(amount);
}

export function getCurrencySymbol() {
  return "Rs.";
}

export function formatPriceFull(amount) {
  return formatPkrAmount(amount);
}
