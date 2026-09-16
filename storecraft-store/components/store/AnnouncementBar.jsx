"use client";

import { useEffect, useMemo, useState } from "react";
import { useStoreSettings } from "@/context/StoreSettingsContext";
import { announcementAdvanceDeliveryText } from "@/lib/storePolicyCopy";

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
  // Always surface advance-delivery if the bar is enabled but empty after sanitize.
  const messages =
    active.length > 0
      ? active
      : [{ text: announcementAdvanceDeliveryText(), link: "/shipping-policy" }];
  return {
    hidden: false,
    messages,
    bg: bar.backgroundColor || "#111111",
    textColor: bar.textColor || "#ffffff",
  };
}

export default function AnnouncementBar() {
  const ctx = useStoreSettings();
  const derived = useMemo(() => deriveBar(ctx?.announcementBar), [ctx?.announcementBar]);
  const phone = String(ctx?.general?.phone || ctx?.phone || "").trim();
  const email = String(ctx?.general?.email || ctx?.email || "").trim();
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
        color: textColor,
        minHeight: "36px",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 12px",
        position: "relative",
      }}
    >
      <style>{`
        .store-announcement-bar .ann-inner {
          width: 100%;
          max-width: 1280px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          min-height: 36px;
          position: relative;
        }
        .store-announcement-bar .ann-msg-wrap {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 6px 8px;
          text-align: center;
        }
        .store-announcement-bar .ann-msg {
          transition: opacity 0.4s ease, transform 0.4s ease;
          color: inherit;
          font-size: 12px;
          font-weight: 500;
          letter-spacing: 0.2px;
          line-height: 1.3;
          text-align: center;
          text-decoration: none;
          margin: 0;
          max-width: 100%;
        }
        @media (min-width: 768px) {
          .store-announcement-bar .ann-msg { font-size: 13px; letter-spacing: 0.3px; }
        }
        a.ann-msg:hover { text-decoration: underline; }
        .store-announcement-bar .ann-msg.hidden { opacity: 0; transform: translateY(6px); }
        .store-announcement-bar .ann-msg.shown { opacity: 1; transform: translateY(0); }
        .store-announcement-bar .ann-dot {
          display: flex;
          gap: 4px;
          margin-top: 3px;
          justify-content: center;
        }
        .store-announcement-bar .ann-dot span {
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: currentColor;
          opacity: 0.35;
        }
        .store-announcement-bar .ann-dot span.active { opacity: 1; }
        .store-announcement-bar .ann-contact {
          display: none;
          flex-shrink: 0;
          align-items: center;
          gap: 1.25rem;
          font-size: 12px;
          white-space: nowrap;
          padding-right: 4px;
        }
        .store-announcement-bar .ann-contact a {
          color: inherit;
          text-decoration: none;
        }
        .store-announcement-bar .ann-contact a:hover { color: #F87171; }
        @media (min-width: 768px) {
          .store-announcement-bar .ann-inner { justify-content: space-between; padding: 0 8px; }
          .store-announcement-bar .ann-msg-wrap { position: absolute; left: 0; right: 0; pointer-events: none; }
          .store-announcement-bar .ann-msg-wrap a,
          .store-announcement-bar .ann-msg-wrap p { pointer-events: auto; }
          .store-announcement-bar .ann-contact { display: flex; position: relative; z-index: 1; margin-left: auto; }
        }
      `}</style>
      <div className="ann-inner">
        <div className="ann-msg-wrap">
          {href ? (
            <a href={href} className={`ann-msg ${visible ? "shown" : "hidden"}`}>
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
        {phone || email ? (
          <div className="ann-contact">
            {phone ? (
              <a href={`tel:${phone.replace(/\s/g, "")}`}>{phone}</a>
            ) : null}
            {email ? <a href={`mailto:${email}`}>{email}</a> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
