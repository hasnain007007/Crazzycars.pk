/**
 * Whether the customer tapped Yes/No on the WhatsApp confirm link.
 * Distinct from warehouse "Confirmed" in DualStatusBadges.
 */
"use client";

import {
  badgeDotColor,
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

  const style = customerConfirmBadgeStyle(kind);
  if (kind === "na") {
    return (
      <span className="op-muted" title={title}>
        —
      </span>
    );
  }

  return (
    <span className="op-pill" style={{ background: style.background, color: style.color }} title={title}>
      <span className="op-pill-dot" style={{ background: badgeDotColor(style) }} aria-hidden />
      {label}
    </span>
  );
}
