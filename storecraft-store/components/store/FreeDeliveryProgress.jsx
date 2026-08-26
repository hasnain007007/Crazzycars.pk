"use client";

import { formatPrice } from "@/lib/currency";
import { useStorePayment } from "@/context/StoreSettingsContext";
import { getCodFreeDeliveryProgress, getEffectiveFreeDeliveryThreshold } from "@/lib/freeDelivery";

/**
 * COD free-delivery progress (cart subtotal vs store threshold).
 */
export function FreeDeliveryProgress({ cartTotal, threshold: thresholdProp, className = "" }) {
  const storePayment = useStorePayment();
  const threshold =
    thresholdProp != null && Number(thresholdProp) > 0
      ? Number(thresholdProp)
      : getEffectiveFreeDeliveryThreshold(storePayment);

  const progress = getCodFreeDeliveryProgress(cartTotal, threshold);

  if (progress.unlocked) {
    return (
      <div
        className={className}
        style={{
          padding: "12px 16px",
          background: "#FFF5F5",
          borderRadius: 8,
        }}
      >
        <p style={{ fontSize: 13, color: "#16A34A", margin: "0 0 8px", fontWeight: 600 }}>
          🎉 You&apos;ve unlocked FREE delivery!
        </p>
        <div
          style={{
            height: 6,
            background: "#FEE2E2",
            borderRadius: 99,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: "100%",
              background: "#16A34A",
              borderRadius: 99,
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className={className}
      style={{
        padding: "12px 16px",
        background: "#FFF5F5",
        borderRadius: 8,
      }}
    >
      <p style={{ fontSize: 13, color: "#374151", margin: "0 0 8px", lineHeight: 1.5 }}>
        Add{" "}
        <strong style={{ color: "#C6633B" }}>{formatPrice(progress.remaining)}</strong> more for FREE
        delivery!
      </p>
      <div
        style={{
          height: 6,
          background: "#FEE2E2",
          borderRadius: 99,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${progress.percent}%`,
            background: "#C6633B",
            borderRadius: 99,
            transition: "width 0.3s ease",
          }}
        />
      </div>
    </div>
  );
}
