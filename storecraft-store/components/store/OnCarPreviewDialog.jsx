"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { readCar } from "@/components/store/MyCar";
import { STORE_CONTACT } from "@/config/store-policy";

function words(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/** Pick the shopper's saved car if one of the pictures matches it (car page slug, else make + model). */
function initialIndex(previews) {
  const saved = readCar();
  if (!saved) return 0;
  const bySlug = previews.findIndex((p) => p.vehicleSlug && p.vehicleSlug === saved.slug);
  if (bySlug >= 0) return bySlug;
  const savedWords = new Set([...words(saved.label), ...words(String(saved.slug).replace(/-/g, " "))]);
  const byName = previews.findIndex((p) => {
    const [make, model] = words(p.car);
    return make && model && savedWords.has(make) && savedWords.has(model);
  });
  return byName >= 0 ? byName : 0;
}

export default function OnCarPreviewDialog({ previews, productName, onClose }) {
  const [index, setIndex] = useState(() => initialIndex(previews));
  const closeRef = useRef(null);
  const current = previews[index] || previews[0];

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const waLink = useMemo(() => {
    const text = `Hi, I'd like to see "${productName}" on my car. My car is: `;
    return `https://wa.me/${STORE_CONTACT.phoneE164.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
  }, [productName]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`See ${productName} on your car`}
      className="fixed inset-0 z-[100000] flex items-end justify-center bg-black/60 sm:items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white p-4 sm:max-w-2xl sm:rounded-2xl sm:p-5">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#C41E1E]">See it on your car</p>
            <p className="truncate text-sm text-[#374151]">{productName}</p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#e5e7eb] text-lg text-[#374151] hover:bg-[#f9fafb]"
          >
            ×
          </button>
        </div>

        {previews.length > 1 ? (
          <div className="mb-3 flex flex-wrap gap-2" role="tablist" aria-label="Choose a car">
            {previews.map((p, i) => (
              <button
                key={`${p.car}-${i}`}
                type="button"
                role="tab"
                aria-selected={i === index}
                onClick={() => setIndex(i)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  i === index
                    ? "border-[#C41E1E] bg-[#C41E1E] text-white"
                    : "border-[#e5e7eb] bg-white text-[#374151] hover:border-[#C41E1E]"
                }`}
              >
                {p.car}
                {p.aiGenerated ? <span className="ml-1 opacity-70">· AI</span> : null}
              </button>
            ))}
          </div>
        ) : null}

        <div className="relative overflow-hidden rounded-xl bg-[#f3f4f6]">
          {current.aiGenerated ? (
            <span className="absolute left-2 top-2 z-10 rounded-full bg-black/70 px-2.5 py-1 text-[11px] font-semibold text-white">
              AI preview
            </span>
          ) : null}
          {/* eslint-disable-next-line @next/next/no-img-element -- on-demand viewer, plain img keeps it light */}
          <img
            key={current.image}
            src={current.image}
            alt={`${productName} fitted on ${current.car}`}
            decoding="async"
            className="block aspect-[4/3] w-full object-contain"
          />
        </div>
        <p className="mt-2 text-xs text-[#6b7280]">
          {current.aiGenerated
            ? `AI-made preview of how it could look on a ${current.car}, not a photo of a fitted car. Final look depends on your bumper shape and colour.`
            : `Real photo on ${current.car}. Final look can vary slightly with bumper shape and colour.`}
        </p>

        <a
          href={waLink}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 block rounded-lg bg-[#f0fdf4] px-3 py-2.5 text-center text-sm font-medium text-[#166534] hover:bg-[#dcfce7]"
        >
          Your car not listed? Send us a photo on WhatsApp and we&apos;ll show you how it looks
        </a>
      </div>
    </div>
  );
}
