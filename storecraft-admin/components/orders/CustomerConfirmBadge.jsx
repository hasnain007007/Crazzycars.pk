/**
 * Whether the customer tapped Yes/No on the WhatsApp confirm link.
 * Distinct from warehouse "Confirmed" in DualStatusBadges.
 */
"use client";

import {
  customerConfirmBadgeStyle,
  customerConfirmKind,
  customerConfirmLabel,
} from "@/lib/orderUi";

export function CustomerConfirmBadge({ order, compact = false }) {
  const kind = customerConfirmKind(order);
  const short = customerConfirmLabel(kind);
  const label = compact
    ? short
    : kind === "confirmed"
      ? "Customer confirmed"
      : kind === "waiting"
        ? "Awaiting customer"
        : kind === "cancelled"
          ? "Customer declined"
          : "No customer reply";
  const title =
    kind === "confirmed"
      ? "Customer confirmed via WhatsApp Yes link"
      : kind === "waiting"
        ? "Waiting for the customer to confirm on WhatsApp"
        : kind === "cancelled"
          ? "Customer cancelled via WhatsApp No link"
          : "No customer Yes/No — cancelled or refunded by staff";

  return (
    <span
      className={[
        "inline-flex whitespace-nowrap rounded-md px-2 py-0.5 font-semibold",
        compact ? "text-[11px]" : "text-xs",
      ].join(" ")}
      style={customerConfirmBadgeStyle(kind)}
      title={title}
    >
      {label}
    </span>
  );
}
