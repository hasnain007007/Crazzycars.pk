"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { tryOnStyleFor } from "@/lib/tryOnStyle";

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
        className="inline-flex min-h-11 w-full flex-1 items-center justify-center gap-2 rounded-[var(--radius-btn)] border border-[#C41E1E] bg-white px-4 py-2.5 text-sm font-semibold text-[#C41E1E] transition hover:bg-[#fff5f5]"
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

const TryOnDialog = dynamic(() => import("./TryOnDialog"), { ssr: false });

/** "Try it on your car photo" for front splitters: drag-and-fit on the shopper's own photo. */
export function TryOnButton({ product }) {
  const [open, setOpen] = useState(false);
  const style = tryOnStyleFor(product);
  if (!style) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 w-full flex-1 items-center justify-center gap-2 rounded-[var(--radius-btn)] border border-[#111827] bg-white px-4 py-2.5 text-sm font-semibold text-[#111827] transition hover:bg-[#f9fafb]"
      >
        <span aria-hidden>📷</span>
        Try it on your car photo
      </button>
      {open ? (
        <TryOnDialog productName={product?.name || ""} style={style} onClose={() => setOpen(false)} />
      ) : null}
    </>
  );
}
