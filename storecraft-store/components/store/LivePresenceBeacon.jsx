"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const STORAGE_KEY = "cc_presence_sid";
const HEARTBEAT_MS = 60_000;

function getOrCreateSessionId() {
  try {
    let id = localStorage.getItem(STORAGE_KEY);
    if (id && /^[a-zA-Z0-9_-]{8,80}$/.test(id)) return id;
    id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID().replace(/-/g, "")
        : `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
    localStorage.setItem(STORAGE_KEY, id);
    return id;
  } catch {
    return `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
  }
}

async function ping(path) {
  try {
    const sessionId = getOrCreateSessionId();
    await fetch("/api/presence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, path: path || "/" }),
      keepalive: true,
    });
  } catch {
    /* ignore offline / blocked */
  }
}

function whenIdle(fn) {
  if (typeof window === "undefined") return () => {};
  if (typeof window.requestIdleCallback === "function") {
    const id = window.requestIdleCallback(() => fn(), { timeout: 4000 });
    return () => window.cancelIdleCallback?.(id);
  }
  const t = setTimeout(fn, 2500);
  return () => clearTimeout(t);
}

/**
 * Invisible beacon: deferred so it does not compete with LCP / first paint.
 */
export function LivePresenceBeacon() {
  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;
    let interval = null;

    const send = () => {
      if (cancelled || document.visibilityState === "hidden") return;
      ping(pathname || window.location.pathname || "/");
    };

    const cancelIdle = whenIdle(() => {
      if (cancelled) return;
      send();
      interval = setInterval(send, HEARTBEAT_MS);
    });

    const onVis = () => {
      if (document.visibilityState === "visible") send();
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      cancelled = true;
      cancelIdle();
      if (interval) clearInterval(interval);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [pathname]);

  return null;
}
