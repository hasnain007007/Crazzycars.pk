"use client";

import { FulfillmentStatusBadge, PaymentStatusBadge, StatusPill } from "./DualStatusBadges";
import { resolveAdvanceBadge } from "@/lib/advancePaymentBadge";

const STYLES = {
  pending: { background: "#FFEA8A", color: "#4F4700", dot: "#8A7C00" },
  received: { background: "#AEE9D1", color: "#0C5132", dot: "#29845A" },
};

/**
 * Fulfillment + payment pills, plus Advance pending / Advance received when applicable.
 * mode: "all" | "payment" | "fulfillment"
 */
export function OrderStatusBadges({ order, orderStatus, paymentStatus, mode = "all" }) {
  const advance = resolveAdvanceBadge(order || { paymentStatus, payment: order?.payment });
  const os = orderStatus ?? order?.orderStatus;
  const ps = paymentStatus ?? order?.paymentStatus;

  if (mode === "payment") {
    return <PaymentStatusBadge paymentStatus={ps} />;
  }

  if (mode === "fulfillment") {
    return (
      <span className="inline-flex max-w-[14rem] flex-wrap items-center gap-1">
        <FulfillmentStatusBadge orderStatus={os} />
        {advance ? (
          <StatusPill
            label={advance.label}
            style={STYLES[advance.kind] || STYLES.pending}
            title={
              advance.kind === "pending"
                ? "Customer still needs to pay shipping / advance before confirm"
                : "Advance / shipping payment recorded (partial)"
            }
          />
        ) : null}
      </span>
    );
  }

  return (
    <span className="inline-flex max-w-[20rem] flex-wrap items-center gap-1">
      <FulfillmentStatusBadge orderStatus={os} />
      <PaymentStatusBadge paymentStatus={ps} />
      {advance ? (
        <StatusPill
          label={advance.label}
          style={STYLES[advance.kind] || STYLES.pending}
          title={
            advance.kind === "pending"
              ? "Customer still needs to pay shipping / advance before confirm"
              : "Advance / shipping payment recorded (partial)"
          }
        />
      ) : null}
    </span>
  );
}
