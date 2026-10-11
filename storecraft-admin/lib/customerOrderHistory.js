/**
 * Match prior orders for the same shopper (phone / email / customerId).
 */
import { digitsOnly, resolveCustomerPhone } from "@/lib/guestCustomerDisplay";
import { normalizePkMobile } from "@/lib/postex";
import { orderGrandTotal } from "@/lib/orderFormat";
import { serializePreviousTrackings } from "@/lib/previousTrackings";

/** PK phone forms that often appear in Mongo (03… / 92… / last 10). */
export function phoneMatchVariants(rawPhone) {
  const digits = digitsOnly(rawPhone);
  const normalized = normalizePkMobile(rawPhone) || "";
  const set = new Set();
  for (const v of [digits, normalized, rawPhone]) {
    const d = digitsOnly(v);
    if (d.length >= 10) set.add(d);
  }
  if (normalized.length === 11 && normalized.startsWith("03")) {
    set.add(`92${normalized.slice(1)}`);
    set.add(normalized.slice(1)); // 3XXXXXXXXX
  }
  if (digits.length === 12 && digits.startsWith("92")) {
    set.add(`0${digits.slice(2)}`);
    set.add(digits.slice(2));
  }
  if (digits.length >= 10) {
    set.add(digits.slice(-10));
  }
  return [...set].filter((d) => d.length >= 10);
}

export function identityFromOrder(order) {
  const phone = resolveCustomerPhone({
    phone: order?.shippingAddress?.phone || order?.customer?.phone,
    email: order?.customer?.email || order?.shippingAddress?.email,
  });
  const email = String(order?.customer?.email || order?.shippingAddress?.email || "")
    .trim()
    .toLowerCase();
  const customerId =
    order?.customer?.customerId &&
    (typeof order.customer.customerId === "object"
      ? String(order.customer.customerId._id || order.customer.customerId.id || "")
      : String(order.customer.customerId));
  return {
    phone,
    phoneVariants: phoneMatchVariants(phone),
    email: email && !/^(guest\+|invoice\+)/i.test(email) ? email : "",
    customerId: customerId || "",
  };
}

export function buildCustomerHistoryFilter(order) {
  const { phoneVariants, email, customerId } = identityFromOrder(order);
  const or = [];
  if (customerId) {
    or.push({ "customer.customerId": customerId });
  }
  if (email) {
    or.push({ "customer.email": new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") });
    or.push({ "shippingAddress.email": new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") });
  }
  for (const digits of phoneVariants) {
    const rx = new RegExp(digits.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    or.push({ "customer.phone": rx });
    or.push({ "shippingAddress.phone": rx });
    or.push({ "customer.email": new RegExp(`(?:guest|invoice)\\+${digits}`, "i") });
  }
  return or.length ? { $or: or } : null;
}

function itemSummary(doc) {
  const items = Array.isArray(doc?.items) ? doc.items : [];
  if (!items.length) return "—";
  const first = String(items[0]?.name || "").trim() || "Item";
  const extra = items.length - 1;
  return extra > 0 ? `${first} +${extra} more` : first;
}

function isDelivered(doc) {
  const status = String(doc?.orderStatus || "").toLowerCase();
  if (status === "delivered") return true;
  const last = String(doc?.tracking?.lastStatus || "").toLowerCase();
  return /\bdelivered\b/.test(last);
}

export function serializeHistoryOrder(doc, currentOrderId) {
  const trackingNumber = String(doc?.trackingNumber || doc?.tracking?.number || "").trim();
  const previous = serializePreviousTrackings(doc);
  const id = doc._id?.toString?.() || String(doc._id);
  return {
    id,
    orderNumber: doc.orderNumber || "",
    createdAt: doc.createdAt || null,
    orderStatus: doc.orderStatus || "pending",
    paymentStatus: doc.paymentStatus || "unpaid",
    paymentMethod: doc.paymentMethod || "",
    total: orderGrandTotal(doc),
    currency: doc.currency || "PKR",
    trackingNumber,
    courier: doc.courier || doc.tracking?.carrier || "",
    trackingUrl: doc.trackingUrl || doc.tracking?.url || "",
    trackingLastStatus: doc.tracking?.lastStatus || "",
    previousTrackings: previous,
    shippedAt: doc.shippedAt || null,
    deliveredAt: doc.deliveredAt || null,
    isDelivered: isDelivered(doc),
    city: doc.shippingAddress?.city || "",
    itemSummary: itemSummary(doc),
    isCurrent: id === String(currentOrderId),
  };
}

export function summarizeHistory(rows) {
  const others = rows.filter((r) => !r.isCurrent);
  const delivered = others.filter((r) => r.isDelivered).length;
  const cancelled = others.filter((r) =>
    ["cancelled", "canceled", "returned", "rto"].includes(String(r.orderStatus || "").toLowerCase())
  ).length;
  const spent = others.reduce((s, r) => s + (Number(r.total) || 0), 0);
  return {
    totalOrders: rows.length,
    priorOrders: others.length,
    delivered,
    cancelled,
    spentPrior: spent,
    isRepeat: others.length > 0,
  };
}
