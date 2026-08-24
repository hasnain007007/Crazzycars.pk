/**
 * Renders professional invoice HTML in an iframe (blob URL — reliable in modals).
 */
"use client";

import { useEffect, useRef, useState } from "react";
import { invoiceInnerHtml } from "@/components/orders/printOrderDocuments";
import { enrichOrderForInvoice } from "@/lib/orderInvoice";

function buildPreviewHtml(invoice, storeMeta) {
  const body = invoiceInnerHtml(enrichOrderForInvoice(invoice), storeMeta || {});
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/>
    <base target="_blank"/>
    <style>
      html, body { margin: 0; padding: 0; background: #fff; }
      body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; padding: 24px; color: #111; }
      img { max-width: 100%; height: auto; }
    </style></head><body>${body}</body></html>`;
}

export function InvoicePreviewFrame({
  invoice,
  storeMeta,
  className = "",
  style,
  title = "Invoice preview",
}) {
  const ref = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!invoice || !ref.current) return undefined;
    setReady(false);

    const html = buildPreviewHtml(invoice, storeMeta);
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const frame = ref.current;

    const onLoad = () => setReady(true);
    frame.addEventListener("load", onLoad);
    frame.src = url;

    return () => {
      frame.removeEventListener("load", onLoad);
      URL.revokeObjectURL(url);
    };
  }, [invoice, storeMeta]);

  return (
    <div className="relative min-h-[280px] w-full bg-white dark:bg-slate-950">
      {!ready ? (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-50 text-sm text-slate-500 dark:bg-slate-900 dark:text-slate-400">
          Loading invoice preview…
        </div>
      ) : null}
      <iframe
        ref={ref}
        title={title}
        className={className}
        style={{ ...style, background: "#fff" }}
      />
    </div>
  );
}
