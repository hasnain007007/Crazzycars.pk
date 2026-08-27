/**
 * Order status and payment status update cards.
 */
"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { orderStatusBadgeClass, paymentStatusBadgeClass } from "@/lib/orderUi";

const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "packed",
  "shipped",
  "delivered",
  "returned",
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
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        Warehouse progress. Customer WhatsApp Yes/No is the badge next to the order number.
      </p>
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
    </div>
  );
}

function orderTotal(order) {
  const t = Number(order?.pricing?.total ?? order?.subtotal ?? 0);
  return Number.isFinite(t) ? t : 0;
}

export function PaymentStatusCard({ order, onUpdated, orderTotalOverride }) {
  const total =
    orderTotalOverride != null && Number.isFinite(Number(orderTotalOverride))
      ? Number(orderTotalOverride)
      : orderTotal(order);
  const [next, setNext] = useState(() => String(order.paymentStatus || "unpaid").toLowerCase());
  const [paidAmount, setPaidAmount] = useState("");
  const [remainingCod, setRemainingCod] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [saving, setSaving] = useState(false);

  const isPartial = String(next).toLowerCase() === "partial";
  const needsReference = String(next).toLowerCase() === "paid" || isPartial;

  useEffect(() => {
    const status = String(order.paymentStatus || "unpaid").toLowerCase();
    setNext(status);
    const paid = Number(order.payment?.paidAmount ?? order.payment?.amount ?? 0) || 0;
    const rem = Number(order.payment?.remainingCod ?? 0) || 0;
    setPaymentReference(
      order.paymentConfirmation?.reference || order.payment?.transactionId || ""
    );
    if (status === "partial") {
      setPaidAmount(paid > 0 ? String(paid) : "");
      setRemainingCod(rem > 0 ? String(rem) : total > 0 ? String(total) : "");
    } else {
      setPaidAmount("");
      setRemainingCod(total > 0 ? String(total) : "");
    }
  }, [
    order.paymentStatus,
    order.payment?.paidAmount,
    order.payment?.amount,
    order.payment?.remainingCod,
    order.payment?.transactionId,
    order.paymentConfirmation?.reference,
    order.id,
    total,
  ]);

  function selectStatus(value) {
    const v = String(value).toLowerCase();
    setNext(v);
    if (v === "partial") {
      const paid = Number(order.payment?.paidAmount ?? order.payment?.amount ?? 0) || 0;
      const rem = Number(order.payment?.remainingCod ?? 0) || 0;
      setPaidAmount(paid > 0 ? String(paid) : "");
      setRemainingCod(rem > 0 ? String(rem) : total > 0 ? String(total) : "");
    }
  }

  function onPaidChange(value) {
    setPaidAmount(value);
    const paid = Number(value);
    if (Number.isFinite(paid) && paid >= 0 && total > 0) {
      setRemainingCod(String(Math.max(0, Math.round((total - paid) * 100) / 100)));
    }
  }

  function onRemainingChange(value) {
    setRemainingCod(value);
    const rem = Number(value);
    if (Number.isFinite(rem) && rem >= 0 && total > 0) {
      setPaidAmount(String(Math.max(0, Math.round((total - rem) * 100) / 100)));
    }
  }

  async function submit(e) {
    e.preventDefault();
    const status = String(next).toLowerCase();
    const sameStatus = status === String(order.paymentStatus || "").toLowerCase();

    if (sameStatus && status !== "partial") {
      toast.error("Select a different payment status.");
      return;
    }

    let paid = 0;
    let remaining = 0;
    if (status === "partial") {
      paid = Number(paidAmount);
      remaining = Number(remainingCod);
      if (!Number.isFinite(paid) || paid < 0 || String(paidAmount).trim() === "") {
        toast.error("Enter how much was paid (partial payment).");
        return;
      }
      if (!Number.isFinite(remaining) || remaining < 0 || String(remainingCod).trim() === "") {
        toast.error("Enter the remaining COD amount.");
        return;
      }
    }

    const ref = String(paymentReference || "").trim();
    if (status === "paid" && !ref) {
      toast.error("Enter a transaction ID / payment reference.");
      return;
    }

    setSaving(true);
    try {
      const body = { paymentStatus: status };
      if (status === "partial") {
        body.paidAmount = paid;
        body.remainingCod = remaining;
      }
      if (status === "paid" || (status === "partial" && ref)) {
        body.paymentReference = ref;
      }
      const res = await fetch(`/api/orders/${order.id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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

      {String(order.paymentStatus).toLowerCase() === "partial" ? (
        <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
          <p>
            Paid:{" "}
            <strong>
              Rs. {(Number(order.payment?.paidAmount ?? order.payment?.amount) || 0).toLocaleString()}
            </strong>
          </p>
          <p className="mt-0.5">
            Remaining COD:{" "}
            <strong>
              Rs.{" "}
              {Math.max(
                0,
                Math.round(
                  (total - (Number(order.payment?.paidAmount ?? order.payment?.amount) || 0)) * 100
                ) / 100
              ).toLocaleString()}
            </strong>
          </p>
        </div>
      ) : null}

      {order.paymentConfirmation?.reference ? (
        <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-200">
          <p>
            Ref: <strong className="font-mono">{order.paymentConfirmation.reference}</strong>
          </p>
          {order.paymentConfirmation.confirmedBy ? (
            <p className="mt-0.5">
              Confirmed by {order.paymentConfirmation.confirmedBy}
              {order.paymentConfirmation.confirmedAt
                ? ` · ${new Date(order.paymentConfirmation.confirmedAt).toLocaleString("en-GB")}`
                : ""}
            </p>
          ) : null}
        </div>
      ) : null}

      <form onSubmit={submit} className="mt-4 space-y-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">Payment status</label>
          <select
            value={String(next).toLowerCase()}
            onChange={(e) => selectStatus(e.target.value)}
            className="mt-0.5 w-full rounded-lg border border-slate-200 px-2 py-2 text-sm capitalize dark:border-slate-600 dark:bg-slate-800"
          >
            {PAYMENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {isPartial ? (
          <div className="space-y-3 rounded-lg border-2 border-[#1d6fb8]/40 bg-[#1d6fb8]/5 p-3">
            <p className="text-xs font-semibold text-[#1d6fb8]">Partial payment details</p>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                How much is paid? (Rs.)
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={paidAmount}
                onChange={(e) => onPaidChange(e.target.value)}
                placeholder="e.g. 3000"
                required
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium dark:border-slate-600 dark:bg-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Remaining COD (Rs.)
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={remainingCod}
                onChange={(e) => onRemainingChange(e.target.value)}
                placeholder={total > 0 ? `Order total ${total}` : "e.g. 5850"}
                required
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium dark:border-slate-600 dark:bg-slate-900"
              />
              {total > 0 ? (
                <p className="mt-1 text-[11px] text-slate-500">
                  Order total Rs. {total.toLocaleString()}. Enter paid — remaining fills automatically.
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        {needsReference ? (
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
              Transaction ID / payment reference
              {String(next).toLowerCase() === "paid" ? " *" : " (optional)"}
            </label>
            <input
              type="text"
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
              placeholder="Bank TID, JazzCash/Easypaisa ID, or screenshot note"
              required={String(next).toLowerCase() === "paid"}
              className="mt-0.5 w-full rounded-lg border border-slate-200 px-2 py-2 font-mono text-sm dark:border-slate-600 dark:bg-slate-800"
            />
            <p className="mt-1 text-[11px] text-slate-500">
              Required when marking paid so money can be matched to this order.
            </p>
          </div>
        ) : null}

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
