"use client";

import { useEffect, useRef, useState } from "react";

const PORTUGAL_CITIES = [
  "Lisboa",
  "Porto",
  "Braga",
  "Coimbra",
  "Aveiro",
  "Faro",
  "Setúbal",
  "Funchal",
  "Évora",
  "Viseu",
  "Guimarães",
  "Leiria",
  "Viana do Castelo",
  "Cascais",
  "Sintra",
  "Almada",
  "Amadora",
  "Matosinhos",
  "Loures",
  "Vila Nova de Gaia",
  "Odivelas",
  "Tomar",
  "Oeiras",
  "Barcelos",
  "Santarém",
  "Portimão",
  "Ponta Delgada",
];

const PORTUGAL_NAMES = [
  "João",
  "Maria",
  "Ana",
  "Pedro",
  "Sofia",
  "Miguel",
  "Inês",
  "Rui",
  "Catarina",
  "Tiago",
  "Mariana",
  "Filipe",
  "Beatriz",
  "André",
  "Sara",
  "Bruno",
  "Carolina",
  "Luís",
  "Diana",
  "Francisco",
];

function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomMinutes() {
  return Math.floor(Math.random() * 25) + 2;
}

export default function RecentPurchase({ productName }) {
  const [show, setShow] = useState(false);
  const [data, setData] = useState(null);
  const intervalRef = useRef(null);
  const hideTimeoutRef = useRef(null);

  useEffect(() => {
    const firstDelay = Math.random() * 4000 + 4000;
    const intervalMs = Math.random() * 15000 + 25000;

    const clearHide = () => {
      if (hideTimeoutRef.current != null) {
        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }
    };

    const showNotification = () => {
      clearHide();
      const city = getRandomItem(PORTUGAL_CITIES);
      const name = getRandomItem(PORTUGAL_NAMES);
      const minutes = getRandomMinutes();
      setData({ city, name, minutes });
      setShow(true);
      hideTimeoutRef.current = setTimeout(() => {
        setShow(false);
        hideTimeoutRef.current = null;
      }, 4000);
    };

    const firstTimer = setTimeout(() => {
      showNotification();
      intervalRef.current = setInterval(showNotification, intervalMs);
    }, firstDelay);

    return () => {
      clearTimeout(firstTimer);
      if (intervalRef.current != null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      clearHide();
    };
  }, []);

  if (!show || !data) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        left: 24,
        zIndex: 9999,
        animation: show ? "recentPurchaseSlideIn 0.4s ease" : "recentPurchaseSlideOut 0.4s ease",
        maxWidth: 320,
        width: "calc(100vw - 48px)",
      }}
    >
      <style>{`
        @keyframes recentPurchaseSlideIn {
          from {
            transform: translateX(-120%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes recentPurchaseSlideOut {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(-120%);
            opacity: 0;
          }
        }
      `}</style>

      <div
        role="status"
        aria-live="polite"
        aria-label={productName ? `Recent purchase: ${productName}` : "Recent purchase"}
        style={{
          background: "#FFFFFF",
          border: "1px solid #E5E5E5",
          borderRadius: 8,
          padding: "12px 16px",
          boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #D72323, #B01C1C)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            fontSize: 18,
          }}
          aria-hidden
        >
          🛍️
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "#111111",
              margin: "0 0 2px",
              lineHeight: 1.3,
            }}
          >
            {data.name} from {data.city}
          </p>
          <p
            style={{
              fontSize: 12,
              color: "#555555",
              margin: "0 0 2px",
              lineHeight: 1.3,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            purchased this {data.minutes} min ago
          </p>
          <p
            style={{
              fontSize: 10,
              color: "#D72323",
              margin: 0,
              fontWeight: 600,
              letterSpacing: "0.04em",
            }}
          >
            ✓ Verified Purchase
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShow(false)}
          aria-label="Dismiss notification"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#CCCCCC",
            fontSize: 16,
            padding: 0,
            flexShrink: 0,
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
}
