"use client";

import { useEffect, useMemo, useState } from "react";
import { pickStableCity } from "@/lib/fakeSocialProof";

function hashSeed(str) {
  let h = 0;
  const s = String(str || "product");
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/** Stable base viewers for a product (busier evenings). */
function baseViewers(productKey) {
  const h = hashSeed(productKey);
  const hour = typeof Date !== "undefined" ? new Date().getHours() : 12;
  const eveningBoost = hour >= 18 || hour < 1 ? 2 : hour >= 12 && hour < 18 ? 1 : 0;
  return 2 + (h % 5) + eveningBoost; // 2–8
}

/**
 * Soft social-proof strip: simulated live viewers on this PDP.
 * Count is seeded by product so it stays believable across refreshes.
 */
export function ProductLiveView({ productKey = "" }) {
  const base = useMemo(() => baseViewers(productKey), [productKey]);
  const city = useMemo(() => pickStableCity(productKey), [productKey]);
  const [count, setCount] = useState(base);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setCount(base);
    setReady(true);
    const tick = () => {
      setCount((prev) => {
        const delta = Math.random() < 0.5 ? -1 : 1;
        const next = prev + (Math.random() < 0.65 ? delta : 0);
        return Math.min(base + 3, Math.max(Math.max(2, base - 2), next));
      });
    };
    const id = setInterval(tick, 9000 + (hashSeed(productKey) % 4000));
    return () => clearInterval(id);
  }, [base, productKey]);

  if (!ready) return null;

  return (
    <div className="pdp-live-view" role="status" aria-live="polite">
      <span className="pdp-live-view__dot" aria-hidden />
      <div className="pdp-live-view__text">
        <p className="pdp-live-view__line">
          <strong>{count}</strong> {count === 1 ? "customer is" : "customers are"} viewing this right now
        </p>
        <p className="pdp-live-view__sub">Also browsing from {city}</p>
      </div>
    </div>
  );
}
