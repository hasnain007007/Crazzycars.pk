"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const DEFAULT_ITEMS = [
  {
    text: "🚗 COD Available Nationwide | Free Delivery Over Rs. 2,999",
    link: "",
    enabled: true,
  },
];

export default function AnnouncementBar() {
  const [bar, setBar] = useState({
    enabled: true,
    items: DEFAULT_ITEMS,
    backgroundColor: "#F5A623",
    textColor: "#1A1A1A",
  });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const s = data?.data || data?.settings || data;
        const announcementBar = s?.announcementBar;
        if (announcementBar?.enabled === false) {
          setBar((prev) => ({ ...prev, enabled: false }));
          return;
        }
        if (announcementBar?.items?.length > 0) {
          setBar({
            enabled: announcementBar.enabled !== false,
            items: announcementBar.items,
            backgroundColor: announcementBar.backgroundColor || "#F5A623",
            textColor: announcementBar.textColor || "#1A1A1A",
          });
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!bar.enabled) return null;

  const enabledItems = bar.items.filter((item) => item.enabled !== false && item.text?.trim());
  if (enabledItems.length === 0) return null;

  const text = enabledItems[0]?.text || DEFAULT_ITEMS[0].text;
  const link = enabledItems[0]?.link;

  return (
    <div
      className="flex min-h-[36px] items-center justify-center px-4 text-center text-xs font-bold tracking-wide md:text-sm"
      style={{
        background: bar.backgroundColor,
        color: bar.textColor,
      }}
    >
      {link ? (
        <Link href={link} style={{ color: bar.textColor, textDecoration: "none" }}>
          {text}
        </Link>
      ) : (
        <span>{text}</span>
      )}
    </div>
  );
}
