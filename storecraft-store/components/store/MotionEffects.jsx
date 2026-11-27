"use client";

import { useEffect } from "react";

/**
 * Site-wide, cheap motion layer (no library, no layout shift):
 *  - Scroll reveal: product cards and section headings that start BELOW the fold fade/rise
 *    in once. Anything already on screen is never hidden (no LCP/CLS cost, no flash), and
 *    content stays in the HTML for Google.
 *  - 3D tilt: on desktop mouse only, product cards tilt toward the cursor with a soft glare.
 *  - Cart pop: the cart icon bounces when something is added (existing cart-item-added event).
 * All of it is skipped under prefers-reduced-motion. On slow data / low-end phones
 * (html[data-lite], set by lib/navLoaderScript) reveal + tilt are skipped too: the CPU and
 * battery go to loading the page, not decoration. The cart pop stays (it is feedback).
 */
const REVEAL = ".product-card,[data-product-card],main h2,[data-reveal]";
const TILT = ".product-card,[data-product-card]";

function setupReveal() {
  if (typeof IntersectionObserver === "undefined") return () => {};
  const seen = new WeakSet();
  const io = new IntersectionObserver(
    (entries) => {
      let i = 0;
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const el = entry.target;
        io.unobserve(el);
        const delay = Math.min(i++, 5) * 70;
        el.style.setProperty("--cc-reveal-delay", `${delay}ms`);
        el.classList.add("cc-revealed");
        // Drop the classes afterwards so hover/tilt transitions are not slowed by the reveal timing.
        window.setTimeout(() => {
          el.classList.remove("cc-reveal", "cc-revealed");
          el.style.removeProperty("--cc-reveal-delay");
        }, 700 + delay);
      }
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
  );

  const scan = () => {
    const vh = window.innerHeight || 800;
    for (const el of document.querySelectorAll(REVEAL)) {
      if (seen.has(el)) continue;
      seen.add(el);
      // Only hide what the shopper cannot see yet.
      if (el.getBoundingClientRect().top < vh) continue;
      el.classList.add("cc-reveal");
      io.observe(el);
    }
  };
  scan();

  let raf = 0;
  const mo = new MutationObserver(() => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      scan();
    });
  });
  const main = document.querySelector("main") || document.body;
  mo.observe(main, { childList: true, subtree: true });
  return () => {
    io.disconnect();
    mo.disconnect();
    if (raf) cancelAnimationFrame(raf);
  };
}

function setupTilt() {
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return () => {};
  let card = null;
  let raf = 0;
  let last = null;

  const apply = () => {
    raf = 0;
    if (!card || !last) return;
    const r = card.getBoundingClientRect();
    const x = (last.clientX - r.left) / r.width;
    const y = (last.clientY - r.top) / r.height;
    card.style.setProperty("--cc-rx", `${((0.5 - y) * 7).toFixed(2)}deg`);
    card.style.setProperty("--cc-ry", `${((x - 0.5) * 9).toFixed(2)}deg`);
    card.style.setProperty("--cc-gx", `${(x * 100).toFixed(1)}%`);
    card.style.setProperty("--cc-gy", `${(y * 100).toFixed(1)}%`);
  };
  const leave = (el) => {
    el.classList.remove("cc-tilting");
    el.style.removeProperty("--cc-rx");
    el.style.removeProperty("--cc-ry");
  };
  const onMove = (e) => {
    const next = e.target?.closest?.(TILT) || null;
    if (next !== card) {
      if (card) leave(card);
      card = next;
      if (card) card.classList.add("cc-tilting");
    }
    if (!card) return;
    last = e;
    if (!raf) raf = requestAnimationFrame(apply);
  };
  const onOut = (e) => {
    if (card && !card.contains(e.relatedTarget)) {
      leave(card);
      card = null;
    }
  };
  document.addEventListener("pointermove", onMove, { passive: true });
  document.addEventListener("pointerout", onOut, { passive: true });
  return () => {
    document.removeEventListener("pointermove", onMove);
    document.removeEventListener("pointerout", onOut);
    if (raf) cancelAnimationFrame(raf);
  };
}

function setupCartPop() {
  const onAdd = () => {
    for (const btn of document.querySelectorAll('[aria-label="Cart"]')) {
      btn.classList.remove("cc-cart-pop");
      // Force reflow so the animation restarts on every add.
      void btn.offsetWidth;
      btn.classList.add("cc-cart-pop");
    }
  };
  window.addEventListener("cart-item-added", onAdd);
  return () => window.removeEventListener("cart-item-added", onAdd);
}

export default function MotionEffects() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    let cleanups = [];
    const boot = () => {
      const lite = document.documentElement.getAttribute("data-lite") === "1";
      cleanups = lite ? [setupCartPop()] : [setupReveal(), setupTilt(), setupCartPop()];
    };
    const idle = window.requestIdleCallback || ((fn) => window.setTimeout(fn, 200));
    const id = idle(boot, { timeout: 1500 });
    return () => {
      (window.cancelIdleCallback || window.clearTimeout)(id);
      for (const fn of cleanups) fn();
    };
  }, []);
  return null;
}
