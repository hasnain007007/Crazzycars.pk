/**
 * Admin mirror of storecraft-store/config/store-policy.js + checkout-money.js.
 * Keep values aligned; UI copy must import from here instead of literals.
 */
export const STORE_POLICY_DEFAULTS = {
  standardFeePKR: 250,
  bulkyFeePKR: 500,
  returnsWindowDays: 7,
  /** Smallest COD booking tier — matches storecraft-store/config/checkout-money.js */
  codAdvanceFromPKR: 300,
};

export function formatPkrAmount(n) {
  return `Rs. ${Number(n).toLocaleString("en-PK")}`;
}

export function standardFeePkr() {
  return STORE_POLICY_DEFAULTS.standardFeePKR;
}

export function bulkyFeePkr() {
  return STORE_POLICY_DEFAULTS.bulkyFeePKR;
}

export function standardDeliveryFeeStatement() {
  const from = formatPkrAmount(STORE_POLICY_DEFAULTS.codAdvanceFromPKR);
  return `Delivery is ${formatPkrAmount(STORE_POLICY_DEFAULTS.standardFeePKR)} for regular items, or ${formatPkrAmount(STORE_POLICY_DEFAULTS.bulkyFeePKR)} when the order includes bulky items. COD orders require a booking advance (from ${from}) before processing; the balance is Cash on Delivery.`;
}

export function standardDeliveryFeeShort() {
  return `Delivery ${formatPkrAmount(STORE_POLICY_DEFAULTS.standardFeePKR)} regular · ${formatPkrAmount(STORE_POLICY_DEFAULTS.bulkyFeePKR)} bulky`;
}

export function deliveryChargesShort() {
  return `Delivery charges ${formatPkrAmount(STORE_POLICY_DEFAULTS.standardFeePKR)}+`;
}

export function bulkyItemHelpText() {
  const regular = formatPkrAmount(STORE_POLICY_DEFAULTS.standardFeePKR);
  const bulky = formatPkrAmount(STORE_POLICY_DEFAULTS.bulkyFeePKR);
  return `Splitters, side skirts, spoilers, floor mats, body kits, etc. Any bulky item in the cart sets shipping to MAX(${bulky}, zone rate). Regular carts use MAX(${regular}, zone rate).`;
}

export function advancePercentHelpText() {
  const floor = formatPkrAmount(STORE_POLICY_DEFAULTS.codAdvanceFromPKR);
  return `Customer must pay at least this % of the item total before dispatch (e.g. 50%). New COD orders use booking advance: MAX(${floor} tier floor or higher by order total, this %), capped at order total. Example: 40% of a Rs. 5,000 line = Rs. 2,000 → booking advance is Rs. 2,000 (higher than the Rs. 600 tier for that total).`;
}
