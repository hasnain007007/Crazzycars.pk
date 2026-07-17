/**
 * Order status and payment status update cards.
 */
"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { orderStatusBadgeClass, paymentStatusBadgeClass } from "@/lib/orderUi";
import { OrderStatusHistory } from "./OrderStatusHistory";

const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "packed",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
  "disputed",
];
const PAYMENT_STATUSES = ["unpaid", "paid", "partial", "refunded", "failed"];

export function OrderStatusCard({ order, onUpdated }) {
  const [next, setNext] = useState(order.orderStatus);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setNext(order.orderStatus);
  }, [order.orderStatus, order.id]);

  async function submit(e) {
    e.preventDefault();
    if (next === order.orderStatus) {
      toast.error("Select a different status.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderStatus: next, statusChangeNote: note }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error || "Update failed.");
        return;
      }
      toast.success("Order status updated.");
      setNote("");
      onUpdated(json.order);
    } catch {
      toast.error("Network error.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Order status</h2>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-xs text-slate-500 dark:text-slate-400">Current</span>
        <span
          className={[
            "inline-flex rounded-full px-3 py-1 text-sm font-semibold capitalize",
            orderStatusBadgeClass(order.orderStatus),
          ].join(" ")}
        >
          {order.orderStatus}
        </span>
      </div>
      <form onSubmit={submit} className="mt-4 space-y-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">New status</label>
          <select
            value={next}
            onChange={(e) => setNext(e.target.value)}
            className="mt-0.5 w-full rounded-lg border border-slate-200 px-2 py-2 text-sm capitalize dark:border-slate-600 dark:bg-slate-800"
          >
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
            Add a note about this change
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            className="mt-0.5 w-full rounded-lg border border-slate-200 px-2 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-lg bg-[#1d6fb8] py-2 text-sm font-semibold text-white hover:bg-[#185d9c] disabled:opacity-50"
        >
          {saving ? "Updating…" : "Update status"}
        </button>
      </form>
      <div className="mt-6 border-t border-slate-100 pt-4 dark:border-slate-800">
        <OrderStatusHistory entries={order.statusHistory} />
      </div>
    </div>
  );
}

export function PaymentStatusCard({ order, onUpdated }) {
  const [next, setNext] = useState(order.paymentStatus);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setNext(order.paymentStatus);
  }, [order.paymentStatus, order.id]);

  async function submit(e) {
    e.preventDefault();
    if (next === order.paymentStatus) {
      toast.error("Select a different payment status.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentStatus: next }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error || "Update failed.");
        return;
      }
      toast.success("Payment status updated.");
      onUpdated(json.order);
    } catch {
      toast.error("Network error.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Payment status</h2>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-xs text-slate-500 dark:text-slate-400">Current</span>
        <span
          className={[
            "inline-flex rounded-full px-3 py-1 text-sm font-semibold capitalize",
            paymentStatusBadgeClass(order.paymentStatus),
          ].join(" ")}
        >
          {order.paymentStatus}
        </span>
      </div>
      <form onSubmit={submit} className="mt-4 space-y-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">Payment status</label>
          <select
            value={next}
            onChange={(e) => setNext(e.target.value)}
            className="mt-0.5 w-full rounded-lg border border-slate-200 px-2 py-2 text-sm capitalize dark:border-slate-600 dark:bg-slate-800"
          >
            {PAYMENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-lg border border-slate-200 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 disabled:opacity-50"
        >
          {saving ? "Updating…" : "Update payment"}
        </button>
      </form>
    </div>
  );
}
