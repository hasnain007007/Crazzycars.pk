/**
 * Admin mirror of storecraft-store/config/store-policy.js.
 * Keep values aligned; UI copy must import from here instead of literals.
 */
export const STORE_POLICY_DEFAULTS = {
  standardFeePKR: 250,
  returnsWindowDays: 7,
};

export function formatPkrAmount(n) {
  return `Rs. ${Number(n).toLocaleString("en-PK")}`;
}

export function standardFeePkr() {
  return STORE_POLICY_DEFAULTS.standardFeePKR;
}

export function standardDeliveryFeeStatement() {
  return `Standard delivery is a flat ${formatPkrAmount(STORE_POLICY_DEFAULTS.standardFeePKR)} on every order. There is no order-value waiver for delivery.`;
}

export function standardDeliveryFeeShort() {
  return `Standard delivery ${formatPkrAmount(STORE_POLICY_DEFAULTS.standardFeePKR)}`;
}

export function deliveryChargesShort() {
  return `Delivery charges ${formatPkrAmount(STORE_POLICY_DEFAULTS.standardFeePKR)}`;
}
