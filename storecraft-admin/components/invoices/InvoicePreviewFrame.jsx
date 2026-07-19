/**
 * Renders professional invoice HTML into an iframe via document.write
 * (avoids srcDoc attribute truncation / escaping issues).
 */
"use client";

import { useEffect, useRef } from "react";
import { invoiceInnerHtml } from "@/components/orders/printOrderDocuments";

export function InvoicePreviewFrame({ invoice, storeMeta, className = "", style, title = "Invoice preview" }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!invoice || !ref.current) return;
    const body = invoiceInnerHtml(invoice, storeMeta || {});
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
      <base target="_blank"/>
      <style>
        html, body { margin: 0; padding: 0; background: #fff; }
        body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; padding: 24px; color: #111; }
        img { max-width: 100%; height: auto; }
      </style></head><body>${body}</body></html>`;
    const doc = ref.current.contentDocument;
    if (!doc) return;
    doc.open();
    doc.write(html);
    doc.close();
  }, [invoice, storeMeta]);

  return (
    <iframe
      ref={ref}
      title={title}
      className={className}
      style={style}
    />
  );
}
