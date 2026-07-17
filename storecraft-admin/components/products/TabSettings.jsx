/**
 * Product editor — QR code (collapsible; same generator as before).
 */
"use client";

import { QRCodeGenerator } from "./QRCodeGenerator";

export function TabSettings({ form, setForm, storeUrl, displaySlug, asideCardClass }) {
  const shell = asideCardClass || "rounded-xl border border-gray-200 bg-white p-5 shadow-sm";
  return (
    <details className={shell}>
      <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-[#111827] [&::-webkit-details-marker]:hidden">
        <span className="flex items-center justify-between gap-2">
          <span>QR Code</span>
          <span className="text-xs font-normal text-gray-500">Show / hide</span>
        </span>
      </summary>
      <div className="border-t border-gray-200 px-4 py-4">
        <QRCodeGenerator
          productName={form.name}
          productSlug={displaySlug}
          storeUrl={storeUrl}
          ean={form.ean || ""}
          onEanChange={(v) => setForm((f) => ({ ...f, ean: v }))}
        />
      </div>
    </details>
  );
}
