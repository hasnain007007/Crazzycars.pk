/**
 * Orders list table with badges, row navigation, pagination, and bulk selection.
 */
"use client";

import Link from "next/link";
import { useCallback, useMemo, useRef, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { orderStatusBadgeClass, paymentStatusBadgeClass } from "@/lib/orderUi";
import { BulkActionBar } from "./BulkActionBar";
import { formatAdminPrice } from "@/lib/currency";
import { getAdminWhatsAppNumber, openWhatsAppWithOptionalImage } from "@/components/orders/OrderWhatsAppButton";
import { buildWhatsAppMessage, resolveTemplate } from "@/lib/whatsappTemplates";

function adminOrderDetailUrl(order) {
  const orderId = order?.id || order?._id || "";
  const base =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || "";
  if (!base || !orderId) return "";
  return `${String(base).replace(/\/$/, "")}/orders/${orderId}`;
}

function buildAdminOrderNotifyVariables(order, extras = {}) {
  const addr = order?.shippingAddress || {};
  const items = Array.isArray(order?.items) ? order.items : [];
  const total = Number(order?.pricing?.total ?? order?.total ?? 0);
  const imageBlock = items
    .filter((i) => i?.image)
    .map((i) => `🖼️ ${String(i.name || "Item").slice(0, 60)}:\n${i.image}`)
    .join("\n\n");
  return {
    customerName: String(addr.name ?? "").trim() || "—",
    customerPhone: String(addr.phone ?? "").trim() || "—",
    orderNumber: String(order?.orderNumber ?? ""),
    city: String(addr.city ?? "").trim() || "—",
    province: String(addr.state ?? addr.province ?? "").trim() || "—",
    itemsList:
      items.map((i) => `• ${i.quantity ?? 1}x ${i.name ?? "Item"}`).join("\n") || "—",
    productImages: imageBlock ? `📸 *Product photos:*\n${imageBlock}` : "",
    total: total.toLocaleString("en-PK"),
    paymentMethod: String(order?.paymentMethod ?? order?.payment?.method ?? "—"),
    address: String(addr.street ?? addr.line1 ?? addr.address ?? "").trim() || "—",
    adminOrderUrl: adminOrderDetailUrl(order),
    confirmOrderUrl: extras.confirmUrl || adminOrderDetailUrl(order),
    cancelOrderUrl: extras.cancelUrl || adminOrderDetailUrl(order),
  };
}

function getAdminNotifyMessage(order, settings, extras = {}) {
  const { enabled, template } = resolveTemplate(settings, "adminNewOrder");
  if (!enabled) return "";
  return buildWhatsAppMessage(template, buildAdminOrderNotifyVariables(order, extras));
}

function formatMoney(n) {
  return formatAdminPrice(n);
}

function formatDate(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return "—";
  }
}

export function OrdersTable({ orders, page, totalPages, onPageChange, loading, onOrdersChanged }) {
  const router = useRouter();
  const [selected, setSelected] = useState({});
  const [settings, setSettings] = useState(null);
  const [waLoadingId, setWaLoadingId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/settings", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data?.success) {
          setSettings(data.settings || data.data || {});
        }
      })
      .catch(() => {
        /* ignore */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const pageIds = useMemo(() => (orders || []).map((o) => o.id), [orders]);
  const allOnPageSelected =
    pageIds.length > 0 && pageIds.every((id) => selected[id]);

  const selectedIds = useMemo(() => Object.keys(selected).filter((k) => selected[k]), [selected]);
  const selectedCount = selectedIds.length;
  const someOnPageSelected = pageIds.some((id) => selected[id]);
  const headerIndeterminate = someOnPageSelected && !allOnPageSelected;
  const headerRef = useRef(null);

  useEffect(() => {
    if (headerRef.current) headerRef.current.indeterminate = headerIndeterminate;
  }, [headerIndeterminate, allOnPageSelected, loading]);

  const toggleRow = useCallback((id, e) => {
    e?.stopPropagation?.();
    setSelected((p) => ({ ...p, [id]: !p[id] }));
  }, []);

  const toggleAllPage = useCallback(
    (e) => {
      e?.stopPropagation?.();
      setSelected((p) => {
        const next = { ...p };
        if (allOnPageSelected) {
          for (const id of pageIds) delete next[id];
        } else {
          for (const id of pageIds) next[id] = true;
        }
        return next;
      });
    },
    [allOnPageSelected, pageIds]
  );

  const clearSelection = useCallback(() => setSelected({}), []);

  const notifyAdminForOrder = useCallback(
    async (orderId, e) => {
      e?.stopPropagation?.();
      e?.preventDefault?.();
      const adminPhone = getAdminWhatsAppNumber(settings);
      if (!adminPhone) {
        toast.error("Set WhatsApp number in Settings → WhatsApp.");
        return;
      }
      setWaLoadingId(orderId);
      try {
        const res = await fetch(`/api/orders/${orderId}`, { credentials: "include" });
        const json = await res.json();
        if (!res.ok || !json.success || !json.order) {
          toast.error(json.error || "Could not load order.");
          return;
        }
        let extras = {};
        try {
          const linkRes = await fetch(`/api/orders/${orderId}/wa-links`, { credentials: "include" });
          const linkJson = await linkRes.json();
          if (linkJson.success) {
            extras = { confirmUrl: linkJson.confirmUrl, cancelUrl: linkJson.cancelUrl };
          }
        } catch {
          /* optional */
        }
        const msg = getAdminNotifyMessage(json.order, settings || {}, extras);
        if (!msg) {
          toast.error("Admin new-order WhatsApp template is disabled.");
          return;
        }
        const imageUrls = (json.order.items || []).map((i) => i.image).filter(Boolean);
        const result = await openWhatsAppWithOptionalImage(adminPhone, msg, imageUrls);
        if (!result.ok) {
          toast.error("Could not open WhatsApp.");
          return;
        }
        toast.success("WhatsApp opened — use Confirm/Cancel links in the message.");
      } catch {
        toast.error("Network error.");
      } finally {
        setWaLoadingId(null);
      }
    },
    [settings]
  );

  const getStoreSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/settings", { credentials: "include" });
      const json = await res.json();
      if (json.success) {
        const settings = json.settings || json.data || {};
        return {
          storeName:
            settings.general?.storeName || process.env.NEXT_PUBLIC_STORE_NAME || "Store",
          logoUrl: settings.general?.logo?.url || "",
        };
      }
    } catch {
      /* ignore */
    }
    return {
      storeName: process.env.NEXT_PUBLIC_STORE_NAME || "Store",
      logoUrl: "",
    };
  }, []);

  if (!loading && (!orders || !orders.length)) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-600 dark:bg-slate-900">
        <p className="text-sm font-medium text-slate-900 dark:text-white">No orders found</p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Try adjusting filters or date range.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <BulkActionBar
        selectedIds={selectedIds}
        selectedCount={selectedCount}
        onClear={clearSelection}
        onUpdated={onOrdersChanged}
        getStoreSettings={getStoreSettings}
      />

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="overflow-x-auto">
            <table className="min-w-[1040px] w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-600 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-400">
              <tr>
                <th className="w-10 px-3 py-3">
                  <input
                    ref={headerRef}
                    type="checkbox"
                    checked={allOnPageSelected && pageIds.length > 0}
                    onChange={toggleAllPage}
                    onClick={(e) => e.stopPropagation()}
                    className="h-4 w-4 rounded border-slate-300 text-[#2563eb] accent-[#2563eb] focus:ring-[#2563eb]"
                    aria-label="Select all on this page"
                  />
                </th>
                <th className="px-4 py-3">Order #</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Order status</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={10} className="px-4 py-3">
                        <div className="h-4 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                      </td>
                    </tr>
                  ))
                : orders.map((o) => {
                    const isRowSel = !!selected[o.id];
                    return (
                      <tr
                        key={o.id}
                        role="link"
                        tabIndex={0}
                        onClick={() => router.push(`/orders/${o.id}`)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            router.push(`/orders/${o.id}`);
                          }
                        }}
                        className={[
                          "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50",
                          isRowSel ? "bg-[#eff6ff] hover:bg-[#eff6ff] dark:bg-blue-950/30 dark:hover:bg-blue-950/30" : "",
                        ].join(" ")}
                      >
                        <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isRowSel}
                            onChange={(e) => toggleRow(o.id, e)}
                            onClick={(e) => e.stopPropagation()}
                            className="h-4 w-4 rounded border-slate-300 text-[#2563eb] accent-[#2563eb] focus:ring-[#2563eb]"
                            aria-label={`Select order ${o.orderNumber}`}
                          />
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-medium text-slate-900 dark:text-white">
                          {o.orderNumber}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-slate-300">{formatDate(o.createdAt)}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-900 dark:text-white">{o.customerName}</div>
                          {o.customerEmail ? (
                            <div className="text-xs text-slate-500 dark:text-slate-400">{o.customerEmail}</div>
                          ) : null}
                        </td>
                        <td className="px-4 py-3">
                          {o.shippingCity ? (
                            <span
                              style={{ fontSize: 12, color: "#6b7280" }}
                              className="dark:text-slate-400"
                            >
                              {o.shippingCity}
                              {o.shippingCountry ? `, ${o.shippingCountry}` : ""}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-700 dark:text-slate-300">
                          {o.lineCount} line{o.lineCount !== 1 ? "s" : ""} · {o.itemCount} pc
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 font-medium tabular-nums text-slate-900 dark:text-white">
                          {formatMoney(o.total)}
                        </td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <span
                            className={[
                              "inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                              orderStatusBadgeClass(o.orderStatus),
                            ].join(" ")}
                          >
                            {o.orderStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <span
                            className={[
                              "inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                              paymentStatusBadgeClass(o.paymentStatus),
                            ].join(" ")}
                          >
                            {o.paymentStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="inline-flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              title="Notify admin on WhatsApp"
                              disabled={waLoadingId === o.id}
                              onClick={(e) => notifyAdminForOrder(o.id, e)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-[#25D366] text-white hover:bg-[#1da851] disabled:opacity-50 dark:border-slate-600"
                              aria-label={`Notify admin for order ${o.orderNumber}`}
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                              </svg>
                            </button>
                            <Link
                              href={`/orders/${o.id}`}
                              className="inline-flex rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-[#1d6fb8] hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:hover:bg-slate-800"
                            >
                              View
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
        </div>
        {totalPages > 1 ? (
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm dark:border-slate-800">
            <span className="text-slate-600 dark:text-slate-400">
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => onPageChange(page - 1)}
                className="rounded-md border border-slate-200 px-3 py-1 font-medium disabled:opacity-40 dark:border-slate-600"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => onPageChange(page + 1)}
                className="rounded-md border border-slate-200 px-3 py-1 font-medium disabled:opacity-40 dark:border-slate-600"
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
