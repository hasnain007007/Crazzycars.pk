"use client";

import { standardDeliveryFeeStatement } from "@/lib/storePolicyCopy";

/**
 * Courier note on cart/checkout. This store does not waive delivery for order value.
 */
export function FreeDeliveryProgress({ className = "" }) {
  return (
    <div
      className={className}
      style={{
        padding: "12px 16px",
        background: "#FFF5F5",
        borderRadius: 8,
      }}
    >
      <p style={{ fontSize: 13, color: "#374151", margin: 0, lineHeight: 1.5 }}>
        {standardDeliveryFeeStatement()}
      </p>
    </div>
  );
}
