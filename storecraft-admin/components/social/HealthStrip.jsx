"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Clock, Camera, Music2 } from "lucide-react";
import { COLORS, cardClass, softCardStyle } from "./socialTheme";

function HealthCard({ title, ok, detail, fixHref }) {
  return (
    <div
      className={cardClass("p-4")}
      style={{
        ...softCardStyle(),
        borderColor: ok ? "#E8E8ED" : "#FECACA",
        background: ok ? "#fff" : "#FEF2F2",
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-[#111114]">{title}</p>
        {fixHref && !ok ? (
          <Link href={fixHref} className="text-xs font-semibold" style={{ color: COLORS.brand }}>
            Fix →
          </Link>
        ) : null}
      </div>
      <p className="mt-1 text-xs text-[#6B6B76]">{detail}</p>
    </div>
  );
}

export function HealthStrip({ nextScheduledAt }) {
  const [health, setHealth] = useState(null);

  const load = useCallback(async () => {
    try {
      const h = await fetch("/api/social/health", { credentials: "include" }).then((r) => r.json());
      if (h.success) setHealth(h);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const fbOk = health?.facebook?.ok !== false && health?.facebook?.connected;
  const igOk = health?.instagram?.ok !== false && health?.instagram?.connected;
  const tiktokMode = health?.tiktok?.mode || health?.mode?.tiktokMode || "off";
  const nextLabel = health?.nextPostIn || null;
  const nextAt = health?.nextPostAt || nextScheduledAt;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <HealthCard
        title={
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-3.5 w-3.5 rounded-sm" style={{ background: "#1877F2" }} />{" "}
            Facebook
          </span>
        }
        ok={Boolean(fbOk)}
        detail={fbOk ? "Connected ✓" : "Not connected — Fix"}
        fixHref="/social/settings"
      />
      <HealthCard
        title={
          <span className="inline-flex items-center gap-1.5">
            <Camera className="h-4 w-4 text-pink-600" /> Instagram
          </span>
        }
        ok={Boolean(igOk)}
        detail={igOk ? "Connected ✓" : "Not connected — Fix"}
        fixHref="/social/settings"
      />
      <HealthCard
        title={
          <span className="inline-flex items-center gap-1.5">
            <Music2 className="h-4 w-4" /> TikTok
          </span>
        }
        ok={tiktokMode !== "off"}
        detail={
          tiktokMode === "off"
            ? "Off (baad mein)"
            : tiktokMode === "metricool"
              ? "Metricool"
              : "API mode"
        }
        fixHref="/social/settings"
      />
      <HealthCard
        title={
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-4 w-4" /> Next post
          </span>
        }
        ok={Boolean(nextAt)}
        detail={nextLabel ? `in ${nextLabel}` : nextAt ? "Scheduled" : "Koi post schedule nahi"}
        fixHref="/social/import"
      />
    </div>
  );
}
