/**
 * Print-only invoice layout (paired with window.print from parent).
 */
"use client";

import { formatAdminPrice } from "@/lib/currency";

function formatMoney(n) {
  return formatAdminPrice(n);
}

function formatAddr(a) {
  if (!a) return "";
  const region = a.state || a.province;
  return [a.name, a.street, [a.city, region, a.zip].filter(Boolean).join(", "), a.country, a.phone, a.nif ? `NIF: ${a.nif}` : ""]
    .filter(Boolean)
    .join("\n");
}

function measurementEntries(item) {
  if (!item?.customMeasurements || typeof item.customMeasurements !== "object") return [];
  return Object.entries(item.customMeasurements).filter(([k, v]) => k && String(v || "").trim());
}

export function PrintInvoice({ order, storeName, logoUrl }) {
  if (!order) return null;
  const p = order.pricing || { subtotal: 0, discount: 0, shippingCost: 0, total: 0 };
  const resolvedStoreName = storeName || process.env.NEXT_PUBLIC_STORE_NAME || 'Homefy.pk';

  return (
    <div className="hidden print:block print:bg-white print:p-10 print:text-black">
      <header className="flex items-start justify-between border-b border-slate-300 pb-6">
        <div>
          {logoUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoUrl} alt={resolvedStoreName} className="mb-2 h-12 w-auto object-contain" />
            </>
          ) : null}
          <h1 className="text-2xl font-bold">{resolvedStoreName}</h1>
          <p className="mt-1 text-sm text-slate-600">Invoice</p>
        </div>
        <div className="text-right text-sm">
          <p className="font-mono font-semibold">{order.orderNumber}</p>
          <p className="text-slate-600">
            {order.createdAt ? new Date(order.createdAt).toLocaleString() : "—"}
          </p>
        </div>
      </header>

      <div className="mt-6 grid gap-8 md:grid-cols-2">
        <div>
          <h2 className="text-xs font-bold uppercase text-slate-500">Bill to</h2>
          <p className="mt-1 text-sm font-semibold">{order.customer?.name || "—"}</p>
          <p className="text-sm text-slate-700">{order.customer?.email || ""}</p>
          <p className="text-sm text-slate-700">{order.customer?.phone || ""}</p>
        </div>
        <div>
          <h2 className="text-xs font-bold uppercase text-slate-500">Ship to</h2>
          <pre className="mt-1 whitespace-pre-wrap font-sans text-sm text-slate-800">{formatAddr(order.shippingAddress)}</pre>
        </div>
      </div>

      <table className="mt-8 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-black text-left">
            <th className="py-2 pr-2">Product</th>
            <th className="py-2 pr-2">Variation</th>
            <th className="py-2 pr-2 text-right">Qty</th>
            <th className="py-2 pr-2 text-right">Unit</th>
            <th className="py-2 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {(order.items || []).map((item, idx) => (
            <tr key={idx} className="border-b border-slate-200 align-top">
              <td className="py-2 pr-2">
                <div>{item.name}</div>
                {measurementEntries(item).length ? (
                  <div className="mt-1 text-xs text-slate-700">
                    <div className="font-semibold">Custom Measurements:</div>
                    {measurementEntries(item).map(([key, value]) => (
                      <div key={key}>
                        {key}: {String(value)}
                      </div>
                    ))}
                  </div>
                ) : null}
              </td>
              <td className="py-2 pr-2 text-slate-600">{item.variation || "—"}</td>
              <td className="py-2 pr-2 text-right tabular-nums">{item.quantity}</td>
              <td className="py-2 pr-2 text-right tabular-nums">{formatMoney(item.unitPrice)}</td>
              <td className="py-2 text-right tabular-nums font-medium">{formatMoney(item.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-8 flex justify-end">
        <div className="w-full max-w-xs space-y-1 text-sm">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span className="tabular-nums">{formatMoney(p.subtotal)}</span>
          </div>
          {p.discount > 0 ? (
            <div className="flex justify-between text-emerald-700">
              <span>Discount</span>
              <span className="tabular-nums">−{formatMoney(p.discount)}</span>
            </div>
          ) : null}
          <div className="flex justify-between">
            <span>Shipping</span>
            <span className="tabular-nums">{formatMoney(p.shippingCost)}</span>
          </div>
          <div className="mt-2 flex justify-between border-t border-black pt-2 text-base font-bold">
            <span>Total</span>
            <span className="tabular-nums">{formatMoney(p.total)}</span>
          </div>
        </div>
      </div>

      <footer className="mt-12 border-t border-slate-300 pt-6 text-center text-sm text-slate-600">
        Thank you for shopping with Homefy.pk.
      </footer>
    </div>
  );
}
