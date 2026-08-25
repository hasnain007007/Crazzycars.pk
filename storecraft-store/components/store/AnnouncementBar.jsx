"use client";

import { useEffect, useMemo, useState } from "react";
import { useStoreSettings } from "@/context/StoreSettingsContext";

function deriveBar(bar) {
  if (!bar || bar.enabled === false) {
    return { hidden: true, messages: [], bg: "#111111", textColor: "#ffffff" };
  }
  const active = (bar.items || [])
    .filter((m) => m.enabled !== false && String(m.text || "").trim())
    .map((m) => ({
      text: String(m.text).trim(),
      link: String(m.link || "").trim(),
    }));
  return {
    hidden: active.length === 0,
    messages: active,
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
  }, [messages.map((m) => `${m.text}|${m.link}`).join("||")]);

  if (hidden || !messages.length) return null;

  const current = messages[index % messages.length];
  const href = current?.link || "";

  return (
    <div
      className="store-announcement-bar"
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
          text-decoration: none;
        }
        a.ann-msg:hover { text-decoration: underline; }
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
      {href ? (
        <a
          href={href}
          className={`ann-msg ${visible ? "shown" : "hidden"}`}
        >
          {current.text}
        </a>
      ) : (
        <p className={`ann-msg ${visible ? "shown" : "hidden"}`}>{current.text}</p>
      )}
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
