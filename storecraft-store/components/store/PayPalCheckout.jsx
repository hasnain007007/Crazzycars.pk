"use client";

import { useEffect, useState } from "react";

export default function PayPalCheckout({ amount, orderId, onError }) {
  const [processing, setProcessing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/payment/paypal/config")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (!data.clientId) {
          setError("PayPal is not configured");
          return;
        }
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load PayPal configuration");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handlePayPalClick = async () => {
    if (processing || loading || error) return;
    setProcessing(true);

    try {
      const res = await fetch("/api/payment/paypal/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          currency: "PKR",
          orderId,
        }),
      });
      const data = await res.json();

      if (!data.success || !data.paypalOrderId) {
        throw new Error(data.error || "Failed to create order");
      }

      const clientRes = await fetch("/api/payment/paypal/config");
      const clientData = await clientRes.json();

      if (!clientData.clientId) {
        throw new Error("PayPal not configured");
      }

      const mode = clientData.mode || "sandbox";
      const baseUrl = mode === "live" ? "https://www.paypal.com" : "https://www.sandbox.paypal.com";

      window.location.href = `${baseUrl}/checkoutnow?token=${encodeURIComponent(data.paypalOrderId)}`;
    } catch (e) {
      console.error("PayPal error:", e);
      const msg = e instanceof Error ? e.message : String(e);
      if (onError) onError(msg);
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        <div
          style={{
            width: 32,
            height: 32,
            border: "3px solid #E5E5E5",
            borderTop: "3px solid #003087",
            borderRadius: "50%",
            margin: "0 auto 12px",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <p style={{ fontSize: 13, color: "#888888", margin: 0 }}>Loading PayPal...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          background: "#fef2f2",
          border: "1px solid #fecaca",
          borderRadius: 8,
          padding: 16,
          textAlign: "center",
        }}
      >
        <p style={{ fontSize: 14, color: "#dc2626", margin: 0 }}>{error}</p>
      </div>
    );
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 12,
        }}
      >
        <div
          style={{
            flex: 1,
            height: 1,
            background: "#E5E5E5",
          }}
        />
        <span
          style={{
            fontSize: 11,
            color: "#888888",
            fontWeight: 600,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            whiteSpace: "nowrap",
          }}
        >
          Express Checkout
        </span>
        <div
          style={{
            flex: 1,
            height: 1,
            background: "#E5E5E5",
          }}
        />
      </div>

      <button
        type="button"
        onClick={handlePayPalClick}
        disabled={processing}
        style={{
          width: "100%",
          height: 48,
          background: processing ? "#E0A800" : "#FFC439",
          border: "none",
          borderRadius: 4,
          cursor: processing ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          boxShadow: "0 2px 4px rgba(0,0,0,0.15)",
          transition: "all 0.2s",
          padding: "0 20px",
          position: "relative",
          overflow: "hidden",
        }}
        onMouseEnter={(e) => {
          if (!processing) {
            e.currentTarget.style.background = "#F0B429";
            e.currentTarget.style.boxShadow = "0 4px 8px rgba(0,0,0,0.2)";
          }
        }}
        onMouseLeave={(e) => {
          if (!processing) {
            e.currentTarget.style.background = "#FFC439";
            e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.15)";
          }
        }}
      >
        {processing ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <div
              style={{
                width: 20,
                height: 20,
                border: "2px solid rgba(0,0,0,0.2)",
                borderTop: "2px solid #003087",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
              }}
            />
            <span
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: "#003087",
              }}
            >
              Processing...
            </span>
          </div>
        ) : (
          <>
            <svg width="80" height="20" viewBox="0 0 80 20" xmlns="http://www.w3.org/2000/svg" aria-hidden>
              <text x="0" y="16" fontFamily="Arial, sans-serif" fontSize="18" fontWeight="bold" fill="#003087">
                Pay
              </text>
              <text x="33" y="16" fontFamily="Arial, sans-serif" fontSize="18" fontWeight="bold" fill="#009cde">
                Pal
              </text>
            </svg>

            <div
              style={{
                width: 1,
                height: 24,
                background: "rgba(0,0,0,0.15)",
                margin: "0 4px",
              }}
            />

            <span
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: "#003087",
                letterSpacing: "0.02em",
              }}
            >
              Checkout
            </span>
          </>
        )}
      </button>

      <p
        style={{
          textAlign: "center",
          fontSize: 11,
          color: "#888888",
          margin: "8px 0 0",
        }}
      >
        You will be redirected to PayPal to complete payment
      </p>

      <div id="paypal-button-container" style={{ display: "none" }} />
    </div>
  );
}
