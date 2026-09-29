"use client";

import { useLayoutEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Force scroll to top on every App Router navigation.
 * Global `scroll-behavior: smooth` + soft nav often leaves iOS Safari
 * mid-page or at the footer on product opens.
 */
export default function ScrollToTop() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams?.toString() || "";

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;

    try {
      if ("scrollRestoration" in window.history) {
        window.history.scrollRestoration = "manual";
      }
    } catch {
      /* ignore */
    }

    const reset = () => {
      const html = document.documentElement;
      const prev = html.style.scrollBehavior;
      html.style.scrollBehavior = "auto";
      window.scrollTo(0, 0);
      html.scrollTop = 0;
      document.body.scrollTop = 0;
      html.style.scrollBehavior = prev;
    };

    reset();
    // Second pass after paint — related products / images can reflow height.
    const t1 = window.setTimeout(reset, 0);
    const t2 = window.setTimeout(reset, 120);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [pathname, search]);

  return null;
}
