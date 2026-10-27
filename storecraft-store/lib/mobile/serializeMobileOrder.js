import { orderGrandTotal, orderPricing } from "@/lib/orderFormat";
import { buildOrderPaymentInstructions } from "@/lib/mobile/paymentInstructions";

/**
 * Line item for mobile order detail / reorder.
 * productId + slug (when snapshotted), variant id/label, image URL.
 */
export function serializeMobileOrderItem(it) {
  const selected = it?.selectedVariation && typeof it.selectedVariation === "object"
    ? it.selectedVariation
    : null;
  const variantId =
    String(it?.variantId || selected?.variantId || selected?.id || "").trim() || "";
  const variationLabel =
    String(
      it?.variationLabel ||
        it?.variation ||
        selected?.label ||
        ""
    ).trim() || "";

  return {
    productId: it?.productId ? String(it.productId) : "",
    slug: String(it?.slug || "").trim(),
    name: String(it?.name || ""),
    quantity: Math.max(1, Number(it?.quantity) || 1),
    unitPrice: Math.max(0, Number(it?.unitPrice) || 0),
    total: Math.max(0, Number(it?.total) || 0),
    image: String(it?.image || ""),
    variantId,
    variationLabel,
  };
}

export function serializeMobileOrderSummary(o) {
  return {
    id: String(o._id),
    orderNumber: o.orderNumber || "",
    status: o.orderStatus || "",
    paymentStatus: o.paymentStatus || "",
    paymentMethod: o.paymentMethod || "",
    total: orderGrandTotal(o),
    itemCount: Array.isArray(o.items) ? o.items.length : 0,
    createdAt: o.createdAt || null,
    shippingCity: o.shippingAddress?.city || "",
    trackingNumber: o.trackingNumber || o.tracking?.number || "",
  };
}

export function serializeMobileOrderDetail(o, settingsDoc) {
  const pricing = orderPricing(o);
  return {
    id: String(o._id),
    orderNumber: o.orderNumber || "",
    status: o.orderStatus || "",
    paymentStatus: o.paymentStatus || "",
    paymentMethod: o.paymentMethod || "",
    total: orderGrandTotal(o),
    pricing: pricing
      ? {
          subtotal: pricing.subtotal,
          discount: pricing.discount,
          shippingCost: pricing.shippingCost,
          total: pricing.total,
        }
      : null,
    items: (o.items || []).map(serializeMobileOrderItem),
    timeline: (o.timeline || []).map((t) => ({
      status: t.status || "",
      title: t.title || "",
      description: t.description || "",
      timestamp: t.timestamp || null,
    })),
    tracking: o.tracking
      ? {
          number: o.tracking.number || o.trackingNumber || "",
          url: o.tracking.url || o.trackingUrl || "",
          courier: o.tracking.carrier || o.courier || "",
        }
      : o.trackingNumber
        ? { number: o.trackingNumber, url: o.trackingUrl || "", courier: o.courier || "" }
        : null,
    shippingCity: o.shippingAddress?.city || "",
    shippingProvince: o.shippingAddress?.state || o.shippingAddress?.province || "",
    createdAt: o.createdAt || null,
    paymentInstructions: buildOrderPaymentInstructions(o, settingsDoc),
  };
}
