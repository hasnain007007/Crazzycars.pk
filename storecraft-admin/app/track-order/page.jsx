"use client";

import { useCallback, useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function statusStyle(status) {
  const s = String(status || "").toLowerCase();
  if (s.includes("deliver")) return { bg: "#DCFCE7", color: "#16A34A", border: "#86EFAC" };
  if (s.includes("transit") || s.includes("dispatch") || s.includes("hub")) {
    return { bg: "#DBEAFE", color: "#2563EB", border: "#93C5FD" };
  }
  if (s.includes("out for") || s.includes("attempt") || s.includes("delivery")) {
    return { bg: "#FFEDD5", color: "#D97706", border: "#FCD34D" };
  }
  if (s.includes("return") || s.includes("cancel") || s.includes("fail")) {
    return { bg: "#FEE2E2", color: "#DC2626", border: "#FECACA" };
  }
  return { bg: "#F3F4F6", color: "#6B7280", border: "#E5E7EB" };
}

function eventIcon(status) {
  const s = String(status || "").toLowerCase();
  if (s.includes("deliver")) return "✓";
  if (s.includes("transit") || s.includes("dispatch")) return "🚚";
  if (s.includes("return")) return "↩";
  return "•";
}

function TrackOrderInner() {
  const searchParams = useSearchParams();
  const initial = String(searchParams.get("tracking") || searchParams.get("trackingNumber") || "").trim();
  const [input, setInput] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);

  const track = useCallback(async (num) => {
    const id = String(num || "").trim();
    if (!id) {
      setError("Please enter a tracking number.");
      setData(null);
      return;
    }
    setLoading(true);
    setError("");
    setData(null);
    try {
      const res = await fetch(`/api/public/tracking?trackingNumber=${encodeURIComponent(id)}`);
      const json = await res.json();
      if (!json.success) {
        setError(
          json.error === "Invalid tracking number"
            ? "Tracking number not found. Please check and try again."
            : json.error || "Could not load tracking."
        );
        return;
      }
      setData(json);
    } catch {
      setError("Could not connect to courier. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initial) track(initial);
  }, [initial, track]);

  const badge = useMemo(() => (data ? statusStyle(data.status) : null), [data]);
  const storeUrl = String(process.env.NEXT_PUBLIC_STORE_URL || "https://homefy.pk").replace(/\/$/, "");

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f8fafc",
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
      }}
    >
      <header
        style={{
          background: "#111111",
          color: "#fff",
          padding: "16px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <strong style={{ fontSize: 18 }}>Homefy.pk</strong>
        <a href={storeUrl} style={{ color: "#fff", fontSize: 14, opacity: 0.85 }}>
          Back to shop
        </a>
      </header>

      <main style={{ maxWidth: 720, margin: "0 auto", padding: "40px 24px 80px" }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "#111", margin: "0 0 8px" }}>
          Track Your Order
        </h1>
        <p style={{ fontSize: 14, color: "#64748b", margin: "0 0 28px", lineHeight: 1.6 }}>
          Enter your PostEx tracking number to see live delivery updates.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            track(input);
          }}
          style={{ display: "flex", gap: 10, marginBottom: 32, flexWrap: "wrap" }}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. 22595920000288"
            style={{
              flex: "1 1 200px",
              padding: "12px 16px",
              border: "1px solid #e2e8f0",
              borderRadius: 8,
              fontSize: 15,
            }}
          />
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "12px 28px",
              background: loading ? "#94a3b8" : "#C6633B",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 700,
              cursor: loading ? "default" : "pointer",
            }}
          >
            {loading ? "Tracking…" : "Track"}
          </button>
        </form>

        {error ? (
          <div
            style={{
              padding: "16px 20px",
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: 8,
              color: "#991b1b",
              fontSize: 14,
            }}
          >
            {error}
          </div>
        ) : null}

        {data ? (
          <div>
            <div
              style={{
                display: "inline-block",
                padding: "10px 20px",
                borderRadius: 8,
                fontSize: 18,
                fontWeight: 700,
                marginBottom: 24,
                background: badge.bg,
                color: badge.color,
                border: `1px solid ${badge.border}`,
              }}
            >
              {data.status}
            </div>

            <div
              style={{
                background: "#fff",
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                padding: "20px 24px",
                marginBottom: 28,
                fontSize: 14,
                lineHeight: 1.8,
              }}
            >
              <p style={{ margin: "0 0 6px" }}>
                <strong>Tracking Number:</strong> {data.trackingNumber}
              </p>
              <p style={{ margin: "0 0 6px" }}>
                <strong>Courier:</strong> {data.courier || "PostEx"}
              </p>
              {data.origin || data.destination ? (
                <p style={{ margin: "0 0 6px" }}>
                  <strong>Route:</strong> {data.origin || "—"} → {data.destination || "—"}
                </p>
              ) : null}
              {data.estimatedDelivery ? (
                <p style={{ margin: 0 }}>
                  <strong>Estimated delivery:</strong> {data.estimatedDelivery}
                </p>
              ) : null}
            </div>

            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#111", margin: "0 0 16px" }}>
              Shipment timeline
            </h2>
            <div style={{ position: "relative", paddingLeft: 28 }}>
              {(data.events || []).map((ev, i) => (
                <div
                  key={`${ev.date}-${ev.time}-${ev.status}-${i}`}
                  style={{
                    position: "relative",
                    paddingBottom: i < (data.events?.length || 0) - 1 ? 24 : 0,
                    borderLeft: i < (data.events?.length || 0) - 1 ? "2px solid #e2e8f0" : "none",
                    marginLeft: 8,
                    paddingLeft: 24,
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      left: -21,
                      top: 0,
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: i === 0 ? "#C6633B" : "#fff",
                      border: `2px solid ${i === 0 ? "#C6633B" : "#cbd5e1"}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12,
                      color: i === 0 ? "#fff" : "#64748b",
                    }}
                  >
                    {eventIcon(ev.status)}
                  </span>
                  <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: 14, color: "#111" }}>
                    {ev.status}
                  </p>
                  {(ev.date || ev.time) && (
                    <p style={{ margin: "0 0 4px", fontSize: 12, color: "#64748b" }}>
                      {[ev.date, ev.time].filter(Boolean).join(" · ")}
                    </p>
                  )}
                  {ev.location ? (
                    <p style={{ margin: "0 0 4px", fontSize: 13, color: "#334155" }}>{ev.location}</p>
                  ) : null}
                  {ev.description && ev.description !== ev.status ? (
                    <p style={{ margin: 0, fontSize: 13, color: "#64748b", lineHeight: 1.5 }}>
                      {ev.description}
                    </p>
                  ) : null}
                </div>
              ))}
              {!(data.events || []).length ? (
                <p style={{ fontSize: 14, color: "#64748b" }}>No detailed events yet.</p>
              ) : null}
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}

export default function TrackOrderPage() {
  return (
    <Suspense
      fallback={
        <div style={{ padding: 48, textAlign: "center", color: "#64748b" }}>Loading…</div>
      }
    >
      <TrackOrderInner />
    </Suspense>
  );
}
