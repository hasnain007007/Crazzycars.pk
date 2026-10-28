/**
 * Order / account email catalog, placeholder substitution, and trigger planner.
 * Keep in sync with storecraft-store/lib/orderEmailPlan.js.
 */

export const EMAIL_TEMPLATE_KEYS = [
  {
    id: "orderConfirmation",
    label: "New Order",
    historyType: "order_confirmation",
    when: "Sent when a customer places an order (or an invoice is created in admin).",
  },
  {
    id: "orderPaymentReceived",
    label: "Order Payment Received",
    historyType: "payment_received",
    when: "Sent when payment is marked paid (prepaid confirm, or COD collected — not duplicated with Delivered on the same COD delivery).",
  },
  {
    id: "orderShipped",
    label: "Tracking ID added",
    historyType: "shipping_notification",
    when: "Sent when a tracking number is saved or a PostEx / Run Courier shipment is booked.",
  },
  {
    id: "orderDelivered",
    label: "Order Delivered",
    historyType: "order_delivered",
    when: "Sent when the order is marked delivered (admin or PostEx webhook).",
  },
  {
    id: "orderCancelled",
    label: "Order Cancelled",
    historyType: "order_cancelled",
    when: "Sent when the order is cancelled.",
  },
  {
    id: "orderStatusUpdate",
    label: "Order Status Update",
    historyType: "order_status_update",
    when: "Optional. Sent for confirmed / processing / packed / returned / refunded if that toggle is on.",
  },
  {
    id: "customerWelcome",
    label: "New Customer Signup",
    historyType: null,
    when: "Sent when a customer creates an account.",
  },
  {
    id: "passwordReset",
    label: "Password reset",
    historyType: null,
    when: "Sent when a customer requests a password reset.",
  },
  {
    id: "abandonedCart",
    label: "Abandoned cart",
    historyType: null,
    when: "Sent by the abandoned-cart reminder (cron or manual).",
  },
];

export const EMAIL_VAR_CHIPS = [
  "{customer.first_name}",
  "{customer.last_name}",
  "{customer.email}",
  "{customer_firstname}",
  "{customer_lastname}",
  "{customer_email}",
  "{customer_phone}",
  "{customer_name}",
  "{order_id}",
  "{order_datetime}",
  "{order_status}",
  "{payment_status}",
  "{order_items}",
  "{subtotal}",
  "{order_shipping}",
  "{order_total}",
  "{order_total_price}",
  "{total}",
  "{tracking_number}",
  "{tracking_link}",
  "{courier}",
  "{company.name}",
  "{company.address}",
  "{store_name}",
  "{reset_link}",
];

export const DEFAULT_EMAIL_TEMPLATES = {
  orderConfirmation: {
    subject: "Order {order_id} confirmed | {store_name}",
    body: `<h1 style="margin:0 0 8px;font-size:22px;color:#111;">Thanks, {customer.first_name}!</h1>
<p style="margin:0 0 18px;color:#6B7280;">We received your order and will prepare it for delivery.</p>
<div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:8px;padding:14px 16px;margin:0 0 18px;">
  <p style="margin:0 0 6px;font-size:13px;color:#6B7280;">Order <strong style="color:#111;">{order_id}</strong></p>
  <p style="margin:0 0 6px;font-size:13px;color:#6B7280;">Placed: {order_datetime}</p>
  <p style="margin:0 0 6px;font-size:13px;color:#6B7280;">Payment: {payment_status}</p>
  <p style="margin:0;font-size:13px;color:#6B7280;">Status: {order_status}</p>
</div>
<p style="margin:0 0 10px;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#6B7280;font-weight:700;">Items</p>
{order_items}
<p style="margin:16px 0 0;font-size:14px;color:#6B7280;">Shipping: {order_shipping}</p>
<p style="margin:4px 0 0;font-size:18px;font-weight:700;color:#111;">Total: {order_total}</p>`,
  },
  orderPaymentReceived: {
    subject: "Payment received for order {order_id} | {store_name}",
    body: `<h1 style="margin:0 0 8px;font-size:22px;color:#111;">Payment received</h1>
<p style="margin:0 0 18px;color:#6B7280;">Hi {customer.first_name}, thank you — we have marked order <strong>{order_id}</strong> as paid and started processing.</p>
<div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:8px;padding:14px 16px;margin:0 0 18px;">
  <p style="margin:0 0 6px;font-size:13px;color:#6B7280;">Payment status: <strong style="color:#111;">{payment_status}</strong></p>
  <p style="margin:0;font-size:13px;color:#6B7280;">Order status: {order_status}</p>
</div>
{order_items}
<p style="margin:16px 0 0;font-size:18px;font-weight:700;color:#111;">Total: {order_total}</p>`,
  },
  orderShipped: {
    subject: "Your order {order_id} is on the way | {store_name}",
    body: `<h1 style="margin:0 0 8px;font-size:22px;color:#111;">Your order is on the way</h1>
<p style="margin:0 0 18px;color:#6B7280;">Hi {customer.first_name}, order <strong>{order_id}</strong> has been handed to the courier.</p>
<div style="background:#ECFDF5;border:1px solid #A7F3D0;border-radius:8px;padding:18px;text-align:center;margin:0 0 18px;">
  <p style="margin:0 0 4px;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#6B7280;">Tracking number</p>
  <p style="margin:0;font-size:22px;font-weight:700;color:#111;">{tracking_number}</p>
  <p style="margin:6px 0 0;font-size:13px;color:#6B7280;">{courier}</p>
</div>
<p style="margin:0;text-align:center;"><a href="{tracking_link}" style="display:inline-block;padding:12px 24px;background:#111;color:#fff;text-decoration:none;font-weight:700;border-radius:4px;font-size:13px;">Track your package</a></p>`,
  },
  orderDelivered: {
    subject: "Order {order_id} delivered | {store_name}",
    body: `<h1 style="margin:0 0 8px;font-size:22px;color:#111;">Delivered</h1>
<p style="margin:0 0 18px;color:#6B7280;">Hi {customer.first_name}, order <strong>{order_id}</strong> has been marked delivered. We hope you love it.</p>
<p style="margin:0;font-size:13px;color:#6B7280;">Courier: {courier}<br/>Tracking: {tracking_number}</p>`,
  },
  orderCancelled: {
    subject: "Order {order_id} cancelled | {store_name}",
    body: `<h1 style="margin:0 0 8px;font-size:22px;color:#111;">Order cancelled</h1>
<p style="margin:0 0 12px;color:#6B7280;">Hi {customer.first_name}, order <strong>{order_id}</strong> has been cancelled.</p>
<p style="margin:0;color:#6B7280;">If you did not request this, reply to this email or WhatsApp us and we will help right away.</p>`,
  },
  orderStatusUpdate: {
    subject: "Order {order_id} update: {order_status} | {store_name}",
    body: `<h1 style="margin:0 0 8px;font-size:22px;color:#111;">Order update</h1>
<p style="margin:0 0 12px;color:#6B7280;">Hi {customer.first_name}, your order <strong>{order_id}</strong> is now <strong style="color:#111;">{order_status}</strong>.</p>
<p style="margin:0;font-size:13px;color:#6B7280;">Payment status: {payment_status}</p>`,
  },
  customerWelcome: {
    subject: "Welcome to {store_name}",
    body: `<h1 style="margin:0 0 8px;font-size:22px;color:#111;">Welcome, {customer.first_name}!</h1>
<p style="margin:0 0 12px;color:#6B7280;">Your {store_name} account is ready. Browse car-specific accessories, save favourites, and track orders anytime.</p>
<p style="margin:0;text-align:center;"><a href="https://crazzycars.pk/shop" style="display:inline-block;padding:12px 24px;background:#111;color:#fff;text-decoration:none;font-weight:700;border-radius:4px;font-size:13px;">Start shopping</a></p>`,
  },
  passwordReset: {
    subject: "Reset your password | {store_name}",
    body: `<h1 style="margin:0 0 8px;font-size:22px;color:#111;">Reset your password</h1>
<p style="margin:0 0 18px;color:#6B7280;">Hi {customer.first_name}, use the button below within 1 hour to choose a new password.</p>
<p style="margin:0 0 18px;text-align:center;"><a href="{reset_link}" style="display:inline-block;padding:12px 24px;background:#D72323;color:#fff;text-decoration:none;font-weight:700;border-radius:4px;font-size:13px;">Reset password</a></p>
<p style="margin:0;font-size:13px;color:#6B7280;">If you did not ask for this, you can ignore this email.</p>`,
  },
  abandonedCart: {
    subject: "You left items in your cart | {store_name}",
    body: `<h1 style="margin:0 0 8px;font-size:22px;color:#111;">Still thinking it over?</h1>
<p style="margin:0 0 18px;color:#6B7280;">Hi {customer.first_name}, your cart at {store_name} is waiting. Complete checkout before stock moves.</p>
<p style="margin:0;text-align:center;"><a href="https://crazzycars.pk/cart" style="display:inline-block;padding:12px 24px;background:#111;color:#fff;text-decoration:none;font-weight:700;border-radius:4px;font-size:13px;">Return to cart</a></p>`,
  },
};

export function escapeRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function applyTemplateVars(str, vars = {}) {
  if (!str || typeof str !== "string") return str || "";
  let out = str;
  const keys = Object.keys(vars).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    out = out.replace(new RegExp(`\\{${escapeRegExp(key)}\\}`, "g"), String(vars[key] ?? ""));
  }
  return out;
}

export function isCodPaymentMethod(method) {
  return String(method || "").trim().toLowerCase() === "cod";
}

export function isSendableCustomerEmail(email) {
  const to = String(email || "").trim().toLowerCase();
  if (!to.includes("@")) return false;
  if (to.includes("@guest.")) return false;
  return true;
}

/** Best customer email on an order (skips guest placeholders). */
export function resolveCustomerEmail(order, extraEmail = "") {
  const candidates = [
    extraEmail,
    order?.customer?.email,
    order?.shippingAddress?.email,
    order?.billingAddress?.email,
    order?.email,
  ];
  for (const raw of candidates) {
    const to = String(raw || "").trim().toLowerCase();
    if (isSendableCustomerEmail(to)) return to;
  }
  return "";
}

const GENERIC_STATUS = new Set(["confirmed", "processing", "packed", "returned", "refunded"]);

/**
 * Which customer emails to send after an order change.
 * Tracking + shipped in the same save → one tracking email.
 * COD marked paid on the same tick as delivered → delivered only (avoids two emails).
 */
export function planOrderLifecycleEmails({
  prevStatus,
  nextStatus,
  prevPayment,
  nextPayment,
  prevTracking,
  nextTracking,
  paymentMethod,
  notifications = {},
  sendTrackingToCustomer,
} = {}) {
  const jobs = [];
  const n = notifications || {};
  const trackingOn = n.emailOnTrackingAdded !== false && sendTrackingToCustomer !== false;
  const paymentOn = n.emailOnPaymentReceived !== false;
  const deliveredOn = n.emailOnDelivered !== false;
  const cancelledOn = n.emailOnCancelled !== false;
  const statusOn = n.emailOnStatusUpdate === true;

  const prevT = String(prevTracking || "").trim();
  const nextT = String(nextTracking || "").trim();
  const trackingAdded = Boolean(nextT) && nextT !== prevT;
  const becamePaid = nextPayment === "paid" && prevPayment !== "paid";
  const becameDelivered = nextStatus === "delivered" && prevStatus !== "delivered";
  const becameCancelled = nextStatus === "cancelled" && prevStatus !== "cancelled";
  const becameShipped = nextStatus === "shipped" && prevStatus !== "shipped";

  if (trackingOn && (trackingAdded || (becameShipped && nextT))) {
    jobs.push("orderShipped");
  }

  const skipPaymentBecauseCodDelivery = becamePaid && becameDelivered && isCodPaymentMethod(paymentMethod);
  if (paymentOn && becamePaid && !skipPaymentBecauseCodDelivery) {
    jobs.push("orderPaymentReceived");
  }

  if (deliveredOn && becameDelivered) jobs.push("orderDelivered");
  if (cancelledOn && becameCancelled) jobs.push("orderCancelled");

  if (
    statusOn &&
    nextStatus &&
    nextStatus !== prevStatus &&
    GENERIC_STATUS.has(nextStatus) &&
    !jobs.includes("orderShipped")
  ) {
    jobs.push("orderStatusUpdate");
  }

  return jobs;
}
