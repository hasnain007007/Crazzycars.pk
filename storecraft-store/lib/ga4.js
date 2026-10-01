/**
 * GA4 ecommerce helpers — client-only.
 * No PII (no email, phone, name, address) in any parameter.
 * item_id prefers articleNo (stable SKU), never Mongo ObjectIds alone when articleNo exists.
 */

export const GA4_CURRENCY = "PKR";

export function isGa4Ready() {
  return typeof window !== "undefined" && typeof window.gtag === "function";
}

/**
 * @param {string} name
 * @param {Record<string, unknown>} [params]
 */
export function ga4Event(name, params = {}) {
  if (!isGa4Ready()) return;
  try {
    window.gtag("event", name, params);
  } catch {
    /* ignore */
  }
}

/**
 * @param {object} product
 * @param {{ quantity?: number, price?: number }} [opts]
 */
export function ga4ItemFromProduct(product, opts = {}) {
  const itemId = String(product?.articleNo || product?.sku || product?.slug || "").trim();
  const itemName = String(product?.name || "").trim();
  const price = Number(opts.price ?? product?.price ?? product?.unitPrice);
  const quantity = Math.max(1, Number(opts.quantity) || 1);
  const item = {
    item_id: itemId || String(product?.id || product?._id || "unknown").slice(0, 36),
    item_name: itemName || "Product",
    quantity,
  };
  if (Number.isFinite(price) && price >= 0) item.price = Math.round(price * 100) / 100;
  return item;
}

/**
 * @param {object[]} cartItems
 */
export function ga4ItemsFromCart(cartItems) {
  return (Array.isArray(cartItems) ? cartItems : []).map((it) =>
    ga4ItemFromProduct(
      {
        articleNo: it.articleNo,
        sku: it.sku,
        slug: it.slug,
        name: it.name,
        id: it.productId,
      },
      { quantity: it.quantity, price: it.unitPrice ?? it.price }
    )
  );
}

export function ga4ViewItem(product, price) {
  const item = ga4ItemFromProduct(product, { price, quantity: 1 });
  ga4Event("view_item", {
    currency: GA4_CURRENCY,
    value: item.price ?? 0,
    items: [item],
  });
}

export function ga4AddToCart(product, { quantity, price } = {}) {
  const item = ga4ItemFromProduct(product, { quantity, price });
  const value = (Number(item.price) || 0) * (Number(item.quantity) || 1);
  ga4Event("add_to_cart", {
    currency: GA4_CURRENCY,
    value: Math.round(value * 100) / 100,
    items: [item],
  });
}

export function ga4BeginCheckout(cartItems, value) {
  const items = ga4ItemsFromCart(cartItems);
  if (!items.length) return;
  ga4Event("begin_checkout", {
    currency: GA4_CURRENCY,
    value: Math.round((Number(value) || 0) * 100) / 100,
    items,
  });
}

export function ga4Purchase({
  transactionId,
  value,
  shipping,
  tax,
  items,
}) {
  const id = String(transactionId || "").trim();
  if (!id) return;
  const payload = {
    currency: GA4_CURRENCY,
    transaction_id: id,
    value: Math.round((Number(value) || 0) * 100) / 100,
    items: Array.isArray(items) ? items : [],
  };
  if (Number.isFinite(Number(shipping)) && Number(shipping) >= 0) {
    payload.shipping = Math.round(Number(shipping) * 100) / 100;
  }
  if (Number.isFinite(Number(tax)) && Number(tax) >= 0) {
    payload.tax = Math.round(Number(tax) * 100) / 100;
  }
  ga4Event("purchase", payload);
}
