"use client";

import { DualStatusBadges } from "./DualStatusBadges";
import { resolveAdvanceBadge } from "@/lib/advancePaymentBadge";

const pillClass =
  "inline-flex max-w-[9.5rem] truncate whitespace-nowrap rounded-md px-2 py-0.5 text-[11px] font-semibold";

const STYLES = {
  pending: { background: "#FFF5D6", color: "#5C4400" },
  received: { background: "#CDFEE1", color: "#0C5132" },
};

/**
 * Fulfillment + payment pills, plus Advance pending / Advance received when applicable.
 */
export function OrderStatusBadges({ order, orderStatus, paymentStatus }) {
  const advance = resolveAdvanceBadge(order || { paymentStatus, payment: order?.payment });

  return (
    <span className="inline-flex max-w-[18rem] flex-wrap items-center gap-1">
      <DualStatusBadges
        orderStatus={orderStatus ?? order?.orderStatus}
        paymentStatus={paymentStatus ?? order?.paymentStatus}
      />
      {advance ? (
        <span
          className={pillClass}
          style={STYLES[advance.kind] || STYLES.pending}
          title={
            advance.kind === "pending"
              ? "Customer still needs to pay shipping / advance before confirm"
              : "Advance / shipping payment recorded (partial)"
          }
        >
          {advance.label}
        </span>
      ) : null}
    </span>
  );
}
