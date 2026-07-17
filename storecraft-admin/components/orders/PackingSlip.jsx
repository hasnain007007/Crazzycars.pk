/**
 * Packing slip markup (for reuse; bulk print uses the same HTML via printOrderDocuments).
 */
"use client";

import { packingSlipInnerHtml } from "./printOrderDocuments";

export function PackingSlip({ order, storeName = "Store", logoUrl = "" }) {
  if (!order) return null;
  return (
    <div
      className="packing-slip-root text-black"
      dangerouslySetInnerHTML={{ __html: packingSlipInnerHtml(order, { storeName, logoUrl }) }}
    />
  );
}
