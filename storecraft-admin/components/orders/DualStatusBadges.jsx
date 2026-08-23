/**
 * Two adjacent badges: fulfillment · payment (OR1 display clarity).
 */
"use client";

import {
  fulfillmentBadgeStyle,
  fulfillmentLabel,
  paymentBadgeStyle,
  paymentLabel,
} from "@/lib/orderUi";

export function DualStatusBadges({ orderStatus, paymentStatus }) {
  return (
    <div className="flex flex-wrap items-center gap-1" title="Fulfillment · Payment">
      <span
        className="inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold"
        style={fulfillmentBadgeStyle(orderStatus)}
      >
        {fulfillmentLabel(orderStatus)}
      </span>
      <span className="text-[10px]" style={{ color: "var(--text-muted)" }} aria-hidden>
        ·
      </span>
      <span
        className="inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold"
        style={paymentBadgeStyle(paymentStatus)}
      >
        {paymentLabel(paymentStatus)}
      </span>
    </div>
  );
}
