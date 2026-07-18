"use client";

import { useEffect, useMemo, useState } from "react";
import { useStoreSettings } from "@/context/StoreSettingsContext";

const FALLBACK = [
  "🚗 Free Delivery on Orders Over Rs. 2,999 — Pakistan Wide",
  "💰 Cash on Delivery Available — Pay When It Arrives",
  "⚡ CrazzyCars.pk — Trusted by Customers Across Pakistan",
];

function deriveBar(bar) {
  if (!bar || bar.enabled === false) {
    return { hidden: true, messages: [], bg: "#111111", textColor: "#ffffff" };
  }
  const active = (bar.items || [])
    .filter((m) => m.enabled !== false && String(m.text || "").trim())
    .map((m) => String(m.text).trim());
  return {
    hidden: false,
    messages: active.length ? active : FALLBACK,
    bg: bar.backgroundColor || "#111111",
    textColor: bar.textColor || "#ffffff",
  };
}

export default function AnnouncementBar() {
  const ctx = useStoreSettings();
  // Sync from SSR context on first paint — no red placeholder / FALLBACK flash.
  const derived = useMemo(() => deriveBar(ctx?.announcementBar), [ctx?.announcementBar]);
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  const { hidden, messages, bg, textColor } = derived;

  useEffect(() => {
    if (hidden || messages.length <= 1) return undefined;
    const timer = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % messages.length);
        setVisible(true);
      }, 400);
    }, 5000);
    return () => clearInterval(timer);
  }, [hidden, messages.length]);

  useEffect(() => {
    setIndex(0);
  }, [messages.join("|")]);

  if (hidden || !messages.length) return null;

  return (
    <div
      style={{
        background: bg,
        height: "36px",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 48px",
        position: "relative",
      }}
    >
      <style>{`
        .ann-msg {
          transition: opacity 0.4s ease, transform 0.4s ease;
          color: ${textColor};
          font-size: 13px;
          font-weight: 500;
          letter-spacing: 0.3px;
          white-space: nowrap;
          text-align: center;
        }
        .ann-msg.hidden { opacity: 0; transform: translateY(6px); }
        .ann-msg.shown { opacity: 1; transform: translateY(0); }
        .ann-dot {
          position: absolute;
          bottom: 4px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 4px;
        }
        .ann-dot span {
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: ${textColor};
          opacity: 0.35;
        }
        .ann-dot span.active { opacity: 1; }
      `}</style>
      <p className={`ann-msg ${visible ? "shown" : "hidden"}`}>{messages[index % messages.length]}</p>
      {messages.length > 1 ? (
        <div className="ann-dot" aria-hidden>
          {messages.map((_, i) => (
            <span key={i} className={i === index % messages.length ? "active" : ""} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
