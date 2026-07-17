"use client";

import { useEffect, useState } from "react";
import { useStoreSettings } from "@/context/StoreSettingsContext";

const FALLBACK = [
  { icon: "🚚", title: "Free Delivery over Rs. 2,999", description: "" },
  { icon: "💳", title: "Cash on Delivery", description: "" },
  { icon: "🔄", title: "7-Day Returns", description: "" },
  { icon: "✅", title: "Genuine Products", description: "" },
];

function mapTrustItems(items) {
  if (!Array.isArray(items) || !items.length) return FALLBACK;
  const mapped = items
    .filter((b) => b.enabled !== false)
    .map((b) => ({
      icon: String(b.icon || "").trim() || "✓",
      title: String(b.title || b.label || "").trim(),
      description: String(b.description || b.subtitle || "").trim(),
    }))
    .filter((b) => b.title);
  return mapped.length ? mapped : FALLBACK;
}

export default function TrustBadges({ items: itemsProp, enabled: enabledProp }) {
  const ctx = useStoreSettings();
  const [badges, setBadges] = useState(itemsProp ? mapTrustItems(itemsProp) : FALLBACK);
  const [visible, setVisible] = useState(enabledProp !== false);

  useEffect(() => {
    const apply = (tb) => {
      if (!tb) return;
      setVisible(tb.enabled !== false);
      setBadges(mapTrustItems(tb.items));
    };
    if (itemsProp) {
      setBadges(mapTrustItems(itemsProp));
      setVisible(enabledProp !== false);
      return;
    }
    if (ctx?.trustBadges) {
      apply(ctx.trustBadges);
      return;
    }
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => apply(data?.data?.trustBadges))
      .catch(() => {});
  }, [itemsProp, enabledProp, ctx?.trustBadges]);

  if (!visible || !badges.length) return null;

  return (
    <section className="homepage-section bg-[#F8F8F8] py-12 md:py-20">
      <div className="store-container">
        <h2 className="font-heading text-[32px] font-bold text-[#111111]">Trust & Service</h2>
        <div style={{ width: 48, height: 3, background: "#C41E1E", marginTop: 8 }} />
        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          {badges.map((b, i) => (
          <div
            key={`${b.title}-${i}`}
            className="group flex flex-col items-center justify-center rounded-xl border border-[#E5E7EB] bg-white px-4 py-6 text-center transition-all duration-200 hover:-translate-y-1 hover:border-[#C41E1E] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)]"
          >
            <span className="text-[40px] leading-none text-[#C41E1E]" aria-hidden>
              {b.icon}
            </span>
            <span className="mt-3 text-sm font-semibold" style={{ color: "#111111" }}>
              {b.title}
            </span>
            <span className="mt-1 text-xs" style={{ color: "#6B7280" }}>{b.description || "Trusted nationwide support"}</span>
          </div>
        ))}
      </div>
      </div>
    </section>
  );
}
