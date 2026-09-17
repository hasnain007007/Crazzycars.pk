"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";
import { GOOGLE_MERCHANT_ID } from "@/lib/googleCustomerReviews";

/**
 * Google Customer Reviews opt-in survey on the order confirmation page.
 * Renders once per order when required fields are present.
 */
export default function GoogleCustomerReviewsOptIn({ payload }) {
  const renderedRef = useRef("");

  const orderId = String(payload?.orderId || "").trim();
  const email = String(payload?.email || "").trim();
  const deliveryCountry = String(payload?.deliveryCountry || "PK").trim() || "PK";
  const estimatedDeliveryDate = String(payload?.estimatedDeliveryDate || "").trim();
  const products = Array.isArray(payload?.products) ? payload.products : [];

  const ready =
    Boolean(orderId) &&
    Boolean(email) &&
    Boolean(estimatedDeliveryDate) &&
    /^\d{4}-\d{2}-\d{2}$/.test(estimatedDeliveryDate);

  useEffect(() => {
    if (!ready) return undefined;
    const productsKey = JSON.stringify(products);
    const key = `${orderId}|${email}|${estimatedDeliveryDate}|${productsKey}`;
    if (renderedRef.current === key) return undefined;

    const run = () => {
      try {
        if (typeof window === "undefined" || !window.gapi?.load) return false;
        window.gapi.load("surveyoptin", () => {
          try {
            let parsedProducts = [];
            try {
              parsedProducts = JSON.parse(productsKey);
            } catch {
              parsedProducts = [];
            }
            const opts = {
              merchant_id: GOOGLE_MERCHANT_ID,
              order_id: orderId,
              email,
              delivery_country: deliveryCountry,
              estimated_delivery_date: estimatedDeliveryDate,
            };
            if (Array.isArray(parsedProducts) && parsedProducts.length) {
              opts.products = parsedProducts;
            }
            window.gapi.surveyoptin.render(opts);
            renderedRef.current = key;
          } catch (e) {
            console.warn("GCR opt-in render failed:", e);
          }
        });
        return true;
      } catch {
        return false;
      }
    };

    window.renderOptIn = run;
    if (run()) return undefined;

    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      if (run() || attempts > 40) window.clearInterval(timer);
    }, 150);

    return () => window.clearInterval(timer);
  }, [ready, orderId, email, deliveryCountry, estimatedDeliveryDate, products]);

  if (!ready) return null;

  return (
    <Script
      src="https://apis.google.com/js/platform.js?onload=renderOptIn"
      strategy="afterInteractive"
      onLoad={() => {
        if (typeof window !== "undefined" && typeof window.renderOptIn === "function") {
          window.renderOptIn();
        }
      }}
    />
  );
}
