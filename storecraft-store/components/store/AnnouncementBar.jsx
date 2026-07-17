"use client";
import { useEffect, useState } from "react";
import { useStoreSettings } from "@/context/StoreSettingsContext";

const FALLBACK = [
  "🚗 Free Delivery on Orders Over Rs. 2,999 — Pakistan Wide",
  "💰 Cash on Delivery Available — Pay When It Arrives",
  "⚡ Crazzycars.pk — Trusted by Customers Across Pakistan",
];

export default function AnnouncementBar() {
  const ctx = useStoreSettings();
  const [messages, setMessages] = useState(FALLBACK);
  const [bg, setBg] = useState("#C41E1E");
  const [textColor, setTextColor] = useState("#ffffff");
  const [hidden, setHidden] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setMounted(true);
    const apply = (bar) => {
      if (!bar) return;
      if (bar.enabled === false) {
        setHidden(true);
        return;
      }
      setHidden(false);
      const active = (bar.items || [])
        .filter((m) => m.enabled !== false && String(m.text || "").trim())
        .map((m) => String(m.text).trim());
      if (active.length) setMessages(active);
      if (bar.backgroundColor) setBg(bar.backgroundColor);
      if (bar.textColor) setTextColor(bar.textColor);
    };
    if (ctx?.announcementBar) {
      apply(ctx.announcementBar);
      return;
    }
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => apply(data?.data?.announcementBar))
      .catch(() => {});
  }, [ctx?.announcementBar]);

  useEffect(() => {
    if (!mounted || messages.length <= 1) return;
    const timer = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % messages.length);
        setVisible(true);
      }, 400);
    }, 5000);
    return () => clearInterval(timer);
  }, [mounted, messages.length]);

  if (!mounted) {
    return <div style={{ height: "36px", background: "#C41E1E" }} />;
  }

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
          background: color-mix(in srgb, ${textColor} 40%, transparent);
          display: inline-block;
        }
        .ann-dot span.active {
          background: ${textColor};
        }
      `}</style>

      {messages.length > 1 ? (
        <>
          <button
            type="button"
            onClick={() => {
              setVisible(false);
              setTimeout(() => {
                setIndex((i) => (i - 1 + messages.length) % messages.length);
                setVisible(true);
              }, 400);
            }}
            style={{
              position: "absolute",
              left: "12px",
              background: "none",
              border: "none",
              color: textColor,
              opacity: 0.7,
              fontSize: "18px",
              cursor: "pointer",
              lineHeight: 1,
            }}
            aria-label="Previous"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => {
              setVisible(false);
              setTimeout(() => {
                setIndex((i) => (i + 1) % messages.length);
                setVisible(true);
              }, 400);
            }}
            style={{
              position: "absolute",
              right: "12px",
              background: "none",
              border: "none",
              color: textColor,
              opacity: 0.7,
              fontSize: "18px",
              cursor: "pointer",
              lineHeight: 1,
            }}
            aria-label="Next"
          >
            ›
          </button>
        </>
      ) : null}

      <span suppressHydrationWarning className={`ann-msg ${visible ? "shown" : "hidden"}`}>
        {messages[index]}
      </span>

      {messages.length > 1 ? (
        <div className="ann-dot">
          {messages.map((_, i) => (
            <span key={i} className={i === index ? "active" : ""} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
