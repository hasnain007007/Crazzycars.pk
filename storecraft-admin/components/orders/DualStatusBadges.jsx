/**
 * Single-line fulfillment · payment indicator (compact orders table).
 */
"use client";

import {
  fulfillmentBadgeStyle,
  fulfillmentLabel,
  paymentBadgeStyle,
  paymentLabel,
} from "@/lib/orderUi";

/**
 * One nowrap pill — unpaid/attention wins the tint so money risk stays visible.
 */
export function DualStatusBadges({ orderStatus, paymentStatus }) {
  const pay = String(paymentStatus || "").toLowerCase();
  const style =
    pay === "unpaid" || pay === "failed"
      ? paymentBadgeStyle(paymentStatus)
      : fulfillmentBadgeStyle(orderStatus);

  const label = `${fulfillmentLabel(orderStatus)} · ${paymentLabel(paymentStatus)}`;

  return (
    <span
      className="inline-flex max-w-[11rem] truncate whitespace-nowrap rounded-md px-2 py-0.5 text-[11px] font-semibold"
      style={style}
      title={`Fulfillment · Payment: ${label}`}
    >
      {label}
    </span>
  );
}
