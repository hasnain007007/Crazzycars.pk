"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

// The viewer (and its pictures) loads only after the shopper taps the button,
// so product pages pay nothing for it on first load.
const OnCarPreviewDialog = dynamic(() => import("./OnCarPreviewDialog"), { ssr: false });

/** "See it on your car" button for products that have on-car pictures. */
export function OnCarPreviewButton({ previews, productName }) {
  const [open, setOpen] = useState(false);
  const list = Array.isArray(previews) ? previews : [];
  if (!list.length) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mb-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[#C41E1E] bg-white px-4 py-2.5 text-sm font-semibold text-[#C41E1E] transition hover:bg-[#fff5f5]"
      >
        <span aria-hidden>🚗</span>
        See it on your car
        <span className="font-normal text-[#6b7280]">
          · {list.length} {list.length === 1 ? "car" : "cars"}
        </span>
      </button>
      {open ? (
        <OnCarPreviewDialog previews={list} productName={productName} onClose={() => setOpen(false)} />
      ) : null}
    </>
  );
}
