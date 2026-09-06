/**
 * Product edit sidebar: sold qty, revenue, customers who ordered this SKU.
 */
"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { formatAdminPrice } from "@/lib/currency";

function formatDate(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("en-PK", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

export function ProductSalesPanel({ productId, asideCardClass }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("customers");

  const load = useCallback(async () => {
    if (!productId) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/products/${productId}/sales?customers=40&orders=25`, {
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to load sales");
      setData(json);
    } catch (e) {
      setData(null);
      setError(e.message || "Failed to load sales");
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    load();
  }, [load]);

  if (!productId) return null;

  return (
    <section className={asideCardClass}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-gray-900">Sales</h2>
        <button
          type="button"
          onClick={load}
          className="text-xs font-medium text-[#1d6fb8] hover:underline"
          disabled={loading}
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading sales…</p>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
              <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">Qty sold</p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums text-gray-900">
                {Number(data?.qtySold || 0).toLocaleString("en-PK")}
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
              <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">Orders</p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums text-gray-900">
                {Number(data?.orderCount || 0).toLocaleString("en-PK")}
              </p>
            </div>
            {data?.showRevenue ? (
              <div className="col-span-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
                <p className="text-[11px] font-medium uppercase tracking-wide text-emerald-700">
                  Revenue
                </p>
                <p className="mt-0.5 text-lg font-semibold tabular-nums text-emerald-900">
                  {formatAdminPrice(data?.revenue || 0)}
                </p>
              </div>
            ) : null}
            <div className="col-span-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
              <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
                Customers
              </p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums text-gray-900">
                {Number(data?.customerCount || 0).toLocaleString("en-PK")}
              </p>
            </div>
          </div>

          <p className="text-[11px] text-gray-500">
            Excludes cancelled &amp; refunded orders. Line totals only (not shipping).
          </p>

          <Link
            href={`/orders?productId=${encodeURIComponent(String(productId))}`}
            className="inline-flex w-full items-center justify-center rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50"
          >
            View orders for this product
          </Link>

          <div className="flex gap-1 rounded-lg border border-gray-200 bg-gray-50 p-0.5">
            {[
              { id: "customers", label: "Customers" },
              { id: "orders", label: "Recent orders" },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={[
                  "flex-1 rounded-md px-2 py-1.5 text-xs font-semibold transition",
                  tab === t.id
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700",
                ].join(" ")}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === "customers" ? (
            <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {(data?.customers || []).length === 0 ? (
                <p className="text-sm text-gray-500">No customers yet.</p>
              ) : (
                (data.customers || []).map((c) => (
                  <div
                    key={c.key}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-gray-900">{c.name || "Guest"}</p>
                        {c.phone ? (
                          <p className="truncate text-xs text-gray-500">{c.phone}</p>
                        ) : null}
                        {c.email ? (
                          <p className="truncate text-xs text-gray-400">{c.email}</p>
                        ) : null}
                      </div>
                      <div className="shrink-0 text-right text-xs text-gray-600">
                        <p className="tabular-nums font-medium">{c.qtyBought} pcs</p>
                        <p className="tabular-nums">{c.orderCount} order{c.orderCount === 1 ? "" : "s"}</p>
                        {data?.showRevenue ? (
                          <p className="tabular-nums text-emerald-700">
                            {formatAdminPrice(c.revenue || 0)}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    {c.lastOrderAt ? (
                      <p className="mt-1 text-[11px] text-gray-400">
                        Last order {formatDate(c.lastOrderAt)}
                      </p>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {(data?.recentOrders || []).length === 0 ? (
                <p className="text-sm text-gray-500">No orders yet.</p>
              ) : (
                (data.recentOrders || []).map((o) => (
                  <Link
                    key={o.id}
                    href={`/orders/${o.id}`}
                    className="block rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm hover:border-[#1d6fb8]/40 hover:bg-[#f8fbff]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-[#1d6fb8]">{o.orderNumber || o.id}</p>
                        <p className="truncate text-xs text-gray-600">
                          {o.customerName || "Guest"}
                          {o.customerPhone ? ` · ${o.customerPhone}` : ""}
                        </p>
                      </div>
                      <div className="shrink-0 text-right text-xs text-gray-600">
                        <p className="tabular-nums font-medium">{o.qty} pcs</p>
                        {data?.showRevenue ? (
                          <p className="tabular-nums text-emerald-700">
                            {formatAdminPrice(o.revenue || 0)}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <p className="mt-1 text-[11px] text-gray-400">
                      {formatDate(o.createdAt)} · {o.orderStatus} · {o.paymentStatus}
                    </p>
                  </Link>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
