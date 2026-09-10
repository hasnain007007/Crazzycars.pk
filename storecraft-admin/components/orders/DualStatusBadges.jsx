/**
 * Shopify-style dual badges: fulfillment + payment, each with its own colour.
 */
"use client";

import {
  fulfillmentBadgeStyle,
  fulfillmentLabel,
  paymentBadgeStyle,
  paymentLabel,
} from "@/lib/orderUi";

const pillClass =
  "inline-flex max-w-[8.5rem] truncate whitespace-nowrap rounded-md px-2 py-0.5 text-[11px] font-semibold";

/**
 * Two separate pills (like Shopify Admin) so Unfulfilled / Shipped / Delivered
 * stay visually distinct even when payment is Unpaid.
 */
export function DualStatusBadges({ orderStatus, paymentStatus }) {
  const fulfill = fulfillmentLabel(orderStatus);
  const pay = paymentLabel(paymentStatus);

  return (
    <span
      className="inline-flex max-w-[14rem] flex-wrap items-center gap-1"
      title={`Fulfillment: ${fulfill} · Payment: ${pay}`}
    >
      <span className={pillClass} style={fulfillmentBadgeStyle(orderStatus)}>
        {fulfill}
      </span>
      <span className={pillClass} style={paymentBadgeStyle(paymentStatus)}>
        {pay}
      </span>
    </span>
  );
}
