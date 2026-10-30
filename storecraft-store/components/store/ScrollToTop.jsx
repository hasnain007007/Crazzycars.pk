"use client";

import { useEffect, useLayoutEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Scroll handling for App Router navigations:
 * - New page (link click): start at the top. Soft nav + smooth scroll otherwise leaves iOS
 *   Safari mid-page or at the footer on product opens.
 * - Back / Forward: return to where the shopper was on that page (e.g. the product they
 *   tapped in a long listing), not the top.
 * Positions are kept per URL in sessionStorage; the restore retries while the listing
 * (client-loaded products, images) grows tall enough.
 */
const KEY = "cc-scroll-positions";

function readPositions() {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) || "{}") || {};
  } catch {
    return {};
  }
}

function savePosition(url, y) {
  try {
    const all = readPositions();
    all[url] = Math.max(0, Math.round(y));
    // keep the store small
    const keys = Object.keys(all);
    if (keys.length > 60) delete all[keys[0]];
    sessionStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* storage blocked — back goes to the top */
  }
}

function jumpTo(y) {
  const html = document.documentElement;
  const prev = html.style.scrollBehavior;
  html.style.scrollBehavior = "auto";
  window.scrollTo(0, y);
  html.style.scrollBehavior = prev;
}

/** Full page load that came from the Back/Forward button (product cards are plain links). */
function loadedFromHistory() {
  try {
    const nav = performance.getEntriesByType("navigation")[0];
    return nav?.type === "back_forward";
  } catch {
    return false;
  }
}

export default function ScrollToTop() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams?.toString() || "";
  const url = `${pathname}${search ? `?${search}` : ""}`;

  // Mark Back/Forward navigations so the next route change restores instead of resetting.
  useEffect(() => {
    try {
      if ("scrollRestoration" in window.history) window.history.scrollRestoration = "manual";
    } catch {
      /* ignore */
    }
    const onPop = () => {
      window.__ccPopNav = true;
    };
    // Navigation API (Chrome/Edge/Firefox/Safari 26): "traverse" fires before Next.js re-renders,
    // popstate only afterwards. popstate (capture) stays as the fallback for older browsers.
    const nav = window.navigation;
    const onNavigate = (e) => {
      if (e.navigationType === "traverse") window.__ccPopNav = true;
    };
    nav?.addEventListener?.("navigate", onNavigate);
    window.addEventListener("popstate", onPop, true);
    return () => {
      nav?.removeEventListener?.("navigate", onNavigate);
      window.removeEventListener("popstate", onPop, true);
    };
  }, []);

  // Remember each page's position while the shopper scrolls.
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        // Key by the URL now in the address bar: the reset-to-top of a new page must not
        // overwrite the position of the page we just left.
        if (!window.__ccRestoring) savePosition(`${window.location.pathname}${window.location.search}`, window.scrollY);
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, []);

  useLayoutEffect(() => {
    if (typeof window === "undefined") return undefined;
    // Soft Back (popstate) or a full reload reached through Back (checked once per document).
    const firstRun = !window.__ccScrollInit;
    window.__ccScrollInit = true;
    const isPop = Boolean(window.__ccPopNav) || (firstRun && loadedFromHistory());
    window.__ccPopNav = false;

    if (!isPop) {
      jumpTo(0);
      // Second pass after paint — related products / images can reflow height.
      const t1 = window.setTimeout(() => jumpTo(0), 0);
      const t2 = window.setTimeout(() => jumpTo(0), 120);
      return () => {
        window.clearTimeout(t1);
        window.clearTimeout(t2);
      };
    }

    const target = readPositions()[url] || 0;
    window.__ccRestoring = true;
    let tries = 0;
    let timer = 0;
    const attempt = () => {
      const maxY = document.documentElement.scrollHeight - window.innerHeight;
      jumpTo(Math.min(target, Math.max(0, maxY)));
      tries += 1;
      // Listing may still be loading products/images: retry until reached (≈2 s max).
      if (Math.abs(window.scrollY - target) > 4 && tries < 25) {
        timer = window.setTimeout(attempt, 80);
      } else {
        window.__ccRestoring = false;
      }
    };
    attempt();
    return () => {
      window.clearTimeout(timer);
      window.__ccRestoring = false;
    };
  }, [url]);

  return null;
}
