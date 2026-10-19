"use client";

/**
 * "My car" on the website: car pages remember the shopper's car; product pages show a green
 * "Fits your …" tag when the product is listed for it. No warning when it is not.
 */
import { useEffect, useState } from "react";

const KEY = "cc-my-car";

function readCar() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "null");
    return v && typeof v.slug === "string" && v.slug ? v : null;
  } catch {
    return null;
  }
}

/** Render on /cars/[slug]: saves this car as the shopper's car. */
export function RememberMyCar({ slug, label }) {
  useEffect(() => {
    try {
      if (slug) localStorage.setItem(KEY, JSON.stringify({ slug, label: label || slug }));
    } catch {
      /* storage blocked — nothing to remember */
    }
  }, [slug, label]);
  return null;
}

/** Render on product pages: green tag when the product fits the remembered car. */
export function MyCarFitTag({ productSlug }) {
  const [car, setCar] = useState(null);
  const [fits, setFits] = useState(false);

  useEffect(() => {
    const saved = readCar();
    if (!saved || !productSlug) return undefined;
    let cancelled = false;
    fetch(`/api/fits?product=${encodeURIComponent(productSlug)}&vehicle=${encodeURIComponent(saved.slug)}`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && d?.fits) {
          setCar(saved);
          setFits(true);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [productSlug]);

  if (!fits || !car) return null;
  return (
    <p
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        margin: "4px 0 8px",
        padding: "6px 12px 6px 6px",
        borderRadius: 999,
        background: "#ECFDF5",
        color: "#047857",
        fontSize: 13,
        fontWeight: 700,
      }}
    >
      <span
        aria-hidden
        style={{
          width: 20,
          height: 20,
          borderRadius: 10,
          background: "#047857",
          color: "#fff",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 12,
        }}
      >
        ✓
      </span>
      Fits your {car.label}
    </p>
  );
}
