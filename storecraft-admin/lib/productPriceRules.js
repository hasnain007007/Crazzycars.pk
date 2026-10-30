/**
 * Product price rules (PKR), shared by create / edit / CSV import / bulk edit.
 *
 * - Prices are whole rupees: 5999.03 or 47999.98 is rejected (float noise from imports).
 * - A sale price is optional. Empty or 0 means "no sale" and is stored as undefined.
 * - A real sale price must be above 0 and below the regular price; otherwise the
 *   storefront shows a "discount" that is not one (e.g. sale 8500 > regular 6499).
 */

function isWholeRupees(n) {
  return Number.isFinite(n) && Number.isInteger(n);
}

/**
 * @param {{ regularPrice: unknown, salePrice?: unknown }} input
 * @returns {{ ok: true, regularPrice: number, salePrice: number | undefined } | { ok: false, error: string }}
 */
export function validateProductPricing({ regularPrice, salePrice }) {
  const regular = Number(regularPrice);
  if (!Number.isFinite(regular) || regular < 0) {
    return { ok: false, error: "Valid regular price is required." };
  }
  if (!isWholeRupees(regular)) {
    return { ok: false, error: `Regular price must be whole rupees (got ${regular}).` };
  }

  if (salePrice === undefined || salePrice === null || salePrice === "") {
    return { ok: true, regularPrice: regular, salePrice: undefined };
  }
  const sale = Number(salePrice);
  if (!Number.isFinite(sale)) {
    return { ok: false, error: "Sale price must be a number." };
  }
  if (sale < 0) {
    return { ok: false, error: "Sale price cannot be below 0." };
  }
  if (sale === 0) {
    return { ok: true, regularPrice: regular, salePrice: undefined };
  }
  if (!isWholeRupees(sale)) {
    return { ok: false, error: `Sale price must be whole rupees (got ${sale}).` };
  }
  if (sale >= regular) {
    return {
      ok: false,
      error: `Sale price (${sale}) must be lower than the regular price (${regular}). Leave it empty for no sale.`,
    };
  }
  return { ok: true, regularPrice: regular, salePrice: sale };
}
