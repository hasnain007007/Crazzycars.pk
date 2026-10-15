"use client";

import { useEffect, useState } from "react";

/**
 * Defer third-party boot until the first user interaction or `delayMs` after
 * the window `load` event — whichever comes first.
 * Ensures analytics still runs for non-interactive visitors via the timeout.
 */
export function useDeferredThirdParty(delayMs = 3000) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (ready) return undefined;

    let cancelled = false;
    let armed = false;
    let timeoutId = 0;

    const arm = () => {
      if (cancelled || armed) return;
      armed = true;
      setReady(true);
      cleanup();
    };

    const onInteract = () => arm();
    const events = ["pointerdown", "keydown", "touchstart", "scroll"];

    const startTimer = () => {
      timeoutId = window.setTimeout(arm, delayMs);
    };

    function cleanup() {
      if (timeoutId) window.clearTimeout(timeoutId);
      window.removeEventListener("load", startTimer);
      for (const type of events) {
        window.removeEventListener(type, onInteract);
      }
    }

    if (document.readyState === "complete") {
      startTimer();
    } else {
      window.addEventListener("load", startTimer, { once: true });
    }
    for (const type of events) {
      window.addEventListener(type, onInteract, { once: true, passive: true });
    }

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [delayMs, ready]);

  return ready;
}
