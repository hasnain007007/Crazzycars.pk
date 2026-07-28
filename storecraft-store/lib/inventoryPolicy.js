/** Whether this product may be sold when quantity is 0 / below requested qty. */
export function allowsBackorder(product) {
  // Opt-in only — missing/undefined must NOT bypass stock checks.
  return product?.inventory?.allowBackorder === true;
}
