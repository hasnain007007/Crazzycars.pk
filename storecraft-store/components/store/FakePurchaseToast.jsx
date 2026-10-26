"use client";

import { useEffect, useState } from "react";
import { pickSocialProof } from "@/lib/fakeSocialProof";

/**
 * Floating “someone just bought this” toast — soft social proof on PDPs.
 * Uses Pakistani Islamic names + local cities.
 */
export function FakePurchaseToast({ productName = "", productImage = "" }) {
  const [toast, setToast] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!productName) return undefined;
    let cancelled = false;
    let hideTimer = null;
    let showTimer = null;

    const showNext = () => {
      if (cancelled || document.visibilityState === "hidden") return;
      const proof = pickSocialProof(productName);
      setToast({
        ...proof,
        productName: String(productName).slice(0, 72),
        productImage: productImage || "",
      });
      setVisible(true);
      hideTimer = setTimeout(() => {
        if (cancelled) return;
        setVisible(false);
        showTimer = setTimeout(showNext, 14000 + Math.floor(Math.random() * 12000));
      }, 5500);
    };

    // First popup after the buyer has looked at the page a bit
    showTimer = setTimeout(showNext, 6000 + Math.floor(Math.random() * 5000));

    const onVis = () => {
      if (document.visibilityState === "hidden") {
        setVisible(false);
      }
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      cancelled = true;
      clearTimeout(hideTimer);
      clearTimeout(showTimer);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [productName, productImage]);

  if (!toast) return null;

  return (
    <aside
      className={`fake-purchase-toast${visible ? " is-on" : ""}`}
      role="status"
      aria-live="polite"
      aria-hidden={!visible}
    >
      <button
        type="button"
        className="fake-purchase-toast__close"
        aria-label="Dismiss"
        onClick={() => setVisible(false)}
      >
        ×
      </button>
      {toast.productImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className="fake-purchase-toast__img"
          src={toast.productImage}
          alt=""
          width={48}
          height={48}
          loading="lazy"
          decoding="async"
        />
      ) : (
        <span className="fake-purchase-toast__badge" aria-hidden>
          ✓
        </span>
      )}
      <div className="fake-purchase-toast__body">
        <p className="fake-purchase-toast__title">
          <strong>{toast.name}</strong> from {toast.city}
        </p>
        <p className="fake-purchase-toast__msg">purchased this item</p>
        <p className="fake-purchase-toast__product">{toast.productName}</p>
        <p className="fake-purchase-toast__time">{toast.timeAgo}</p>
      </div>
    </aside>
  );
}
