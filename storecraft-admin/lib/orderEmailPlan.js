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
    when: "Sent when a tracking number is saved or a PostEx shipment is booked.",
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
  "{customer_name}",
  "{order_id}",
  "{order_datetime}",
  "{order_status}",
  "{payment_status}",
  "{order_items}",
  "{subtotal}",
  "{order_shipping}",
  "{order_total}",
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
    subject: "Order {order_id} : Order Received",
    body: `<p>Dear {customer.first_name},</p>
<p>We have received your order. Important details are below.</p>
<p>Order Date/Time: {order_datetime}<br>
Order Number: {order_id}<br>
Payment Status: {payment_status}<br>
Order Status: {order_status}</p>
<p><strong>Order Items</strong></p>
{order_items}
<p>Shipping: {order_shipping}<br>
Total: {order_total}</p>
<p>— {company.name}</p>`,
  },
  orderPaymentReceived: {
    subject: "Order {order_id} : Payment Completed",
    body: `<p>Dear {customer.first_name},</p>
<p>Thank you for your payment. We have started processing your order.</p>
<p>Order Date/Time: {order_datetime}<br>
Order Number: {order_id}<br>
Payment Status: {payment_status}<br>
Order Status: {order_status}</p>
<p><strong>Order Items</strong></p>
{order_items}
<p>Total: {order_total}</p>
<p>— {company.name}</p>`,
  },
  orderShipped: {
    subject: "Order {order_id} : Tracking {tracking_number}",
    body: `<p>Dear {customer.first_name},</p>
<p>Your order is on the way.</p>
<p>Order Number: {order_id}<br>
Courier: {courier}<br>
Tracking ID: {tracking_number}</p>
<p>Track your parcel: <a href="{tracking_link}">{tracking_link}</a></p>
<p>— {company.name}</p>`,
  },
  orderDelivered: {
    subject: "Order {order_id} : Delivered",
    body: `<p>Dear {customer.first_name},</p>
<p>Your order has been delivered. We hope you enjoy it.</p>
<p>Order Number: {order_id}<br>
Courier: {courier}<br>
Tracking ID: {tracking_number}</p>
<p>— {company.name}</p>`,
  },
  orderCancelled: {
    subject: "Order {order_id} : Cancelled",
    body: `<p>Dear {customer.first_name},</p>
<p>Your order {order_id} has been cancelled.</p>
<p>If you did not request this, reply to this email or contact us on WhatsApp.</p>
<p>— {company.name}</p>`,
  },
  orderStatusUpdate: {
    subject: "Order {order_id} : Status Update",
    body: `<p>Dear {customer.first_name},</p>
<p>Your order status is now: <strong>{order_status}</strong>.</p>
<p>Order Number: {order_id}<br>
Payment Status: {payment_status}</p>
<p>— {company.name}</p>`,
  },
  customerWelcome: {
    subject: "Welcome",
    body: `<p>Dear {customer.first_name},</p>
<p>Welcome to {store_name}. Your account is ready.</p>
<p>— {company.name}</p>`,
  },
  passwordReset: {
    subject: "Reset your password | {store_name}",
    body: `<p>Dear {customer.first_name},</p>
<p>Click this link to reset your password (valid for 1 hour):</p>
<p><a href="{reset_link}">{reset_link}</a></p>
<p>If you did not ask for this, you can ignore this email.</p>
<p>— {company.name}</p>`,
  },
  abandonedCart: {
    subject: "You left items in your cart | {store_name}",
    body: `<p>Dear {customer.first_name},</p>
<p>You still have items waiting in your cart at {store_name}.</p>
<p>— {company.name}</p>`,
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
