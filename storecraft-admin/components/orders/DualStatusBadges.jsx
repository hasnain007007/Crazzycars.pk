/**
 * Shopify Polaris dual badges: fulfillment + payment, each with a status dot.
 */
"use client";

import {
  badgeDotColor,
  fulfillmentBadgeStyle,
  fulfillmentLabel,
  paymentBadgeStyle,
  paymentLabel,
} from "@/lib/orderUi";

export function StatusPill({ label, style, title }) {
  return (
    <span
      className="op-pill"
      style={{ background: style.background, color: style.color }}
      title={title || label}
    >
      <span className="op-pill-dot" style={{ background: badgeDotColor(style) }} aria-hidden />
      {label}
    </span>
  );
}

export function PaymentStatusBadge({ paymentStatus }) {
  const pay = paymentLabel(paymentStatus);
  const style = paymentBadgeStyle(paymentStatus);
  const label = pay === "Unpaid" ? "Payment pending" : pay;
  return <StatusPill label={label} style={style} title={`Payment: ${pay}`} />;
}

export function FulfillmentStatusBadge({ orderStatus }) {
  const fulfill = fulfillmentLabel(orderStatus);
  const style = fulfillmentBadgeStyle(orderStatus);
  return <StatusPill label={fulfill} style={style} title={`Fulfillment: ${fulfill}`} />;
}

/**
 * Two separate pills (like Shopify Admin) so Unfulfilled / Shipped / Delivered
 * stay visually distinct even when payment is Unpaid.
 */
export function DualStatusBadges({ orderStatus, paymentStatus }) {
  return (
    <span className="inline-flex max-w-[16rem] flex-wrap items-center gap-1">
      <FulfillmentStatusBadge orderStatus={orderStatus} />
      <PaymentStatusBadge paymentStatus={paymentStatus} />
    </span>
  );
}
