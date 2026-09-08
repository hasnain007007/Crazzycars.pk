/**
 * Full order detail: items, notes, status controls, customer/shipping, print invoice.
 */
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import OrderTimeline from "@/components/orders/OrderTimeline";
import {
  packingSlipInnerHtml,
  printDocumentShell,
  printHtmlWithIframe,
} from "./printOrderDocuments";
import { formatCustomerListMeta } from "@/lib/guestCustomerDisplay";
import { DualStatusBadges } from "./DualStatusBadges";
import { CustomerConfirmBadge } from "./CustomerConfirmBadge";
import { InternalNotes } from "./InternalNotes";
import { OrderActivityFeed } from "./OrderActivityFeed";
import { OrderTagsEditor } from "./OrderTagsEditor";
import { OrderStatusCard, PaymentStatusCard } from "./StatusUpdater";
import { OrderItemsEditor } from "./OrderItemsEditor";
import { SendInvoicePanel } from "./SendInvoicePanel";
import {
  buildWaLink,
  getCustomerOrderPhone,
  openWhatsApp,
  OrderWhatsAppButton,
} from "@/components/orders/OrderWhatsAppButton";
import { formatAdminPrice } from "@/lib/currency";
import { printInvoice as printProfessionalInvoice } from "@/lib/downloadInvoicePdf";
import { getInvoiceStoreMeta } from "@/lib/invoiceStoreMeta";
import {
  isPrepaidOrder,
  POSTEX_SHIP_TYPES,
  postexPublicTrackingUrl,
  storefrontTrackingUrl,
} from "@/lib/postex";
import {
  isRunCourierOrder,
  runCourierPublicTrackingUrl,
} from "@/lib/runcourier";
import RunCourierBookingPanel from "@/components/runcourier/RunCourierBookingPanel";
import {
  getLegacyTrackingWhatsAppMessage,
  getOrderShippedWhatsAppMessage,
} from "@/lib/whatsappTemplates";

function orderItemCount(order) {
  const items = Array.isArray(order?.items) ? order.items : [];
  return items.reduce((s, i) => s + Math.max(1, Number(i.quantity) || 1), 0) || 1;
}

function formatMoney(n) {
  return formatAdminPrice(n);
}

function paymentMethodLabel(method) {
  const normalized = String(method || "").toLowerCase();
  if (normalized === "stripe") return "💳 Stripe";
  if (normalized === "paypal") return "🅿️ PayPal";
  return method || "—";
}

function formatCurrencyAmount(order, amount) {
  const currency = order?.currency || "PKR";
  return `${currency} ${Number(amount || 0).toFixed(2)}`;
}

function defaultPostexCodAmount(order, orderTotal, prepaid) {
  const status = String(order?.paymentStatus || "").toLowerCase();
  if (status === "partial") {
    const remaining = Number(order?.payment?.remainingCod);
    if (Number.isFinite(remaining) && remaining >= 0) return Math.round(remaining);
  }
  if (prepaid || status === "paid") return 0;
  return Math.max(0, Math.round(Number(orderTotal) || 0));
}

/** Collapse accidental single-letter spacing: "S h a" → "Sha", keep normal names. */
function normalizePersonName(raw) {
  const cleaned = String(raw || "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return "";
  return cleaned.replace(/\b(?:[A-Za-zÀ-ÿ]\s+){2,}[A-Za-zÀ-ÿ]\b/g, (chunk) =>
    chunk.replace(/\s+/g, "")
  );
}

function customerFullName(order) {
  const fromShipping = normalizePersonName(order?.shippingAddress?.name);
  if (fromShipping) return fromShipping;

  const fn = normalizePersonName(order?.customer?.firstName);
  const ln = normalizePersonName(order?.customer?.lastName);
  const combined = normalizePersonName(`${fn} ${ln}`);
  if (combined) return combined;

  const fromCustomer = normalizePersonName(order?.customer?.name);
  return fromCustomer || "—";
}

const SHIPPING_PROVINCES = [
  "Punjab",
  "Sindh",
  "KPK",
  "Balochistan",
  "Gilgit-Baltistan",
  "AJK",
];

function shippingInstructionsFromOrder(order) {
  const notes = order?.internalNotes || [];
  for (let i = notes.length - 1; i >= 0; i--) {
    const text = String(notes[i]?.note || "");
    if (text.startsWith("Shipping instructions:")) {
      return text.replace(/^Shipping instructions:\s*/i, "").trim();
    }
  }
  return "";
}

function addressFormFromOrder(order) {
  const addr = order?.shippingAddress || {};
  const combinedName = customerFullName(order);
  const fullName =
    String(addr.name || "").trim() ||
    (combinedName !== "—" ? combinedName : "");
  const line1 = String(addr.street || addr.line1 || "").trim();
  const fullAddr = String(addr.address || "").trim();
  let line2 = "";
  if (fullAddr && fullAddr !== line1) {
    line2 = fullAddr.startsWith(line1)
      ? fullAddr.slice(line1.length).replace(/^,\s*/, "").trim()
      : fullAddr;
  }

  return {
    fullName,
    phone: String(addr.phone || order?.customer?.phone || "").trim(),
    line1,
    line2: line2 || String(addr.street2 || addr.line2 || "").trim(),
    area: String(addr.area || "").trim(),
    city: String(addr.city || "").trim(),
    province:
      String(addr.province || addr.state || "").trim() || "Punjab",
    postalCode: String(addr.zip || addr.postcode || addr.postalCode || "").trim(),
    country: "Pakistan",
    instructions: shippingInstructionsFromOrder(order),
  };
}

function buildShippingAddressPayload(form) {
  const fullName = String(form.fullName || "").trim();
  const parts = fullName.split(/\s+/).filter(Boolean);
  const firstName = parts[0] || "";
  const lastName = parts.slice(1).join(" ");
  const line1 = String(form.line1 || "").trim();
  const line2 = String(form.line2 || "").trim();
  const area = String(form.area || "").trim();
  const province = String(form.province || "").trim();

  return {
    name: fullName,
    firstName,
    lastName,
    phone: String(form.phone || "").trim(),
    street: line1,
    street2: line2,
    line1,
    line2,
    address: [line1, line2].filter(Boolean).join(", "),
    area,
    city: String(form.city || "").trim(),
    state: province,
    province,
    zip: String(form.postalCode || "").trim(),
    postcode: String(form.postalCode || "").trim(),
    postalCode: String(form.postalCode || "").trim(),
    country: "Pakistan",
  };
}

function InfoTableCard({ title, rows, bare = false }) {
  const visibleRows = rows.filter(Boolean);
  const body = (
    <dl className="m-0 divide-y divide-slate-100 dark:divide-slate-800">
      {visibleRows.map((row) => (
        <div
          key={row.label}
          className="flex flex-col gap-0.5 py-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
        >
          <dt className="shrink-0 text-[13px] font-medium text-slate-500 dark:text-slate-400">
            {row.label}
          </dt>
          <dd className="m-0 min-w-0 break-words text-[13px] font-semibold text-slate-900 dark:text-slate-100 sm:text-right">
            {String(row.value ?? "—")}
          </dd>
        </div>
      ))}
    </dl>
  );
  if (bare) {
    return <div className="px-3 py-2 sm:px-4">{body}</div>;
  }
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-2.5 dark:border-slate-700 dark:bg-slate-800/80 sm:px-5">
        <h3 className="m-0 text-sm font-bold text-slate-900 dark:text-white">{title}</h3>
      </div>
      <div className="px-4 py-2 sm:px-5 sm:py-3">{body}</div>
    </div>
  );
}

function OrderInformationCard({ order, bare = false }) {
  const p = order.pricing || {};
  const subtotal = order.subtotal ?? p.subtotal ?? 0;
  const shippingCost = order.shippingCost ?? p.shippingCost ?? order.shipping ?? 0;
  const grandTotal = order.total ?? p.total ?? order.grandTotal ?? 0;

  const rows = [
    { label: "Order No.", value: order.orderNumber || order.id },
    { label: "Customer", value: customerFullName(order) },
    { label: "Currency", value: order.currency || "PKR" },
    { label: "Order Total", value: formatCurrencyAmount(order, subtotal) },
    { label: "Shipping Cost", value: formatCurrencyAmount(order, shippingCost) },
    { label: "Grand Total", value: formatCurrencyAmount(order, grandTotal) },
    { label: "Order Status", value: order.orderStatus || order.status || "—" },
    { label: "Payment Status", value: order.paymentStatus || "—" },
    { label: "Payment Method", value: order.paymentMethod || order.payment?.method || "—" },
    order.payment?.paypalOrderId
      ? { label: "PayPal Order ID", value: order.payment.paypalOrderId }
      : null,
    order.payment?.transactionId || order.payment?.paypalCaptureId
      ? {
          label: "Payment Transaction ID",
          value: order.payment?.transactionId || order.payment?.paypalCaptureId || "—",
        }
      : null,
    order.payment?.stripePaymentIntentId
      ? { label: "Stripe Payment ID", value: order.payment.stripePaymentIntentId }
      : null,
  ];

  return <InfoTableCard title="Order Information" rows={rows} bare={bare} />;
}

function ShippingDetailsCard({ order, orderId, onUpdated }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(() => addressFormFromOrder(order));

  useEffect(() => {
    if (!editing) {
      setForm(addressFormFromOrder(order));
    }
  }, [order, editing]);

  const addr = order.shippingAddress || {};
  const instructions = shippingInstructionsFromOrder(order);
  const displayRows = [
    { label: "Full Name", value: addr.name || customerFullName(order) },
    { label: "Phone", value: addr.phone || order.customer?.phone || "—" },
    {
      label: "Address",
      value:
        [addr.street || addr.line1, addr.street2 || addr.line2, addr.area]
          .filter(Boolean)
          .join(", ") ||
        addr.address ||
        "—",
    },
    { label: "City", value: addr.city || "—" },
    { label: "Province", value: addr.province || addr.state || "—" },
    {
      label: "Postal Code",
      value: addr.postcode || addr.postalCode || addr.zip || "—",
    },
    instructions ? { label: "Notes / Instructions", value: instructions } : null,
  ].filter(Boolean);

  function patchField(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function cancelEdit() {
    setForm(addressFormFromOrder(order));
    setEditing(false);
  }

  async function saveAddress() {
    if (!String(form.fullName || "").trim() || !String(form.phone || "").trim() || !String(form.city || "").trim()) {
      toast.error("Full name, phone, and city are required.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shippingAddress: buildShippingAddressPayload(form),
          shippingInstructions: String(form.instructions || "").trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error || "Failed to update address.");
        return;
      }
      toast.success("Address updated successfully");
      if (json.order) onUpdated?.(json.order);
      setEditing(false);
    } catch {
      toast.error("Network error.");
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100";
  const labelClass = "block text-xs font-medium text-slate-600 dark:text-slate-300";

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        overflow: "hidden",
      }}
      className="dark:border-slate-700 dark:bg-slate-900"
    >
      <div
        style={{
          background: "#f9fafb",
          padding: "10px 16px",
          borderBottom: "1px solid #e5e7eb",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
        className="dark:border-slate-700 dark:bg-slate-800/80"
      >
        <h3
          style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: 0 }}
          className="dark:text-white"
        >
          Shipping Address
        </h3>
        {!editing ? (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          >
            ✏️ Edit Address
          </button>
        ) : null}
      </div>

      <div style={{ padding: 12 }}>
        {editing ? (
          <div className="space-y-3">
            <div>
              <label className={labelClass}>Full Name</label>
              <input
                type="text"
                value={form.fullName}
                onChange={(e) => patchField("fullName", e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Phone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => patchField("phone", e.target.value)}
                placeholder="03XXXXXXXXX"
                className={inputClass}
              />
              <p className="mt-1 text-xs text-slate-500">Format: 03XXXXXXXXX</p>
            </div>
            <div>
              <label className={labelClass}>Address Line 1</label>
              <input
                type="text"
                value={form.line1}
                onChange={(e) => patchField("line1", e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Address Line 2 (optional)</label>
              <input
                type="text"
                value={form.line2}
                onChange={(e) => patchField("line2", e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>City</label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => patchField("city", e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Province</label>
                <select
                  value={form.province}
                  onChange={(e) => patchField("province", e.target.value)}
                  className={inputClass}
                >
                  {SHIPPING_PROVINCES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Postal Code (optional)</label>
                <input
                  type="text"
                  value={form.postalCode}
                  onChange={(e) => patchField("postalCode", e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Country</label>
                <input type="text" value="Pakistan" readOnly disabled className={`${inputClass} opacity-70`} />
              </div>
            </div>
            <div>
              <label className={labelClass}>Notes / Instructions (optional)</label>
              <textarea
                value={form.instructions}
                onChange={(e) => patchField("instructions", e.target.value)}
                rows={3}
                className={inputClass}
              />
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              <button
                type="button"
                disabled={saving}
                onClick={saveAddress}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save Address"}
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={cancelEdit}
                className="rounded-lg border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              {displayRows.map((row, i) => (
                <tr
                  key={row.label}
                  style={{
                    borderBottom: i < displayRows.length - 1 ? "1px solid #f3f4f6" : "none",
                  }}
                  className="dark:border-slate-800"
                >
                  <td
                    style={{
                      padding: "6px 0",
                      fontSize: 12,
                      color: "#6b7280",
                      fontWeight: 500,
                      width: "36%",
                      verticalAlign: "top",
                    }}
                    className="dark:text-slate-400"
                  >
                    {row.label}
                  </td>
                  <td
                    style={{
                      padding: "6px 0",
                      fontSize: 12,
                      color: "#111827",
                      fontWeight: 600,
                      verticalAlign: "top",
                    }}
                    className="dark:text-slate-100"
                  >
                    {String(row.value ?? "—")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function PaymentInformationSection({ order, orderId, onRefunded, orderTotal }) {
  const pm = order.payment?.method || order.paymentMethod || "";
  const total = Math.max(
    0,
    Number(orderTotal ?? order.pricing?.total ?? order.total ?? 0) || 0
  );
  const paidAmount = Number(order.payment?.paidAmount ?? order.payment?.amount ?? 0) || 0;
  const paymentStatus = String(order.paymentStatus || "unpaid").toLowerCase();
  const showOrderTotal = paymentStatus === "unpaid" || paymentStatus === "partial";
  const liveRemainingCod =
    paymentStatus === "partial"
      ? Math.max(0, Math.round((total - paidAmount) * 100) / 100)
      : 0;

  async function issueRefund() {
    if (!window.confirm("Issue a full refund for this order?")) return;
    try {
      const res = await fetch(`/api/orders/${orderId}/refund`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Refund recorded.");
        onRefunded?.();
      } else {
        toast.error(data.error || "Refund failed");
      }
    } catch {
      toast.error("Refund failed");
    }
  }

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: 20,
        marginTop: 0,
      }}
      className="dark:border-slate-700 dark:bg-slate-900"
    >
      <h3
        style={{
          fontSize: 15,
          fontWeight: 600,
          color: "#111827",
          marginBottom: 16,
          paddingBottom: 10,
          borderBottom: "1px solid #f3f4f6",
        }}
        className="dark:border-slate-700 dark:text-white"
      >
        Payment information
      </h3>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }} className="sm:grid-cols-2">
        <div>
          <p style={{ fontSize: 12, color: "#9ca3af", margin: "0 0 4px", textTransform: "uppercase", fontWeight: 600 }}>
            Payment method
          </p>
          <p style={{ fontSize: 15, fontWeight: 600, color: "#111827", margin: 0 }} className="dark:text-white">
            {pm === "stripe"
              ? "💳 Stripe (card)"
              : pm === "paypal"
                ? "🅿️ PayPal"
                : paymentMethodLabel(order.paymentMethod) || "—"}
          </p>
        </div>

        <div>
          <p style={{ fontSize: 12, color: "#9ca3af", margin: "0 0 4px", textTransform: "uppercase", fontWeight: 600 }}>
            Payment status
          </p>
          <span
            style={{
              display: "inline-block",
              padding: "4px 12px",
              borderRadius: 99,
              fontSize: 13,
              fontWeight: 700,
              background:
                order.paymentStatus === "paid"
                  ? "#dcfce7"
                  : order.paymentStatus === "refunded"
                    ? "#fee2e2"
                    : order.paymentStatus === "failed"
                      ? "#fee2e2"
                      : order.paymentStatus === "partial"
                        ? "#dbeafe"
                        : "#fef3c7",
              color:
                order.paymentStatus === "paid"
                  ? "#16a34a"
                  : order.paymentStatus === "refunded"
                    ? "#dc2626"
                    : order.paymentStatus === "failed"
                      ? "#dc2626"
                      : order.paymentStatus === "partial"
                        ? "#1d4ed8"
                        : "#92400e",
            }}
          >
            {order.paymentStatus === "paid"
              ? "Paid"
              : order.paymentStatus === "refunded"
                ? "Refunded"
                : order.paymentStatus === "failed"
                  ? "Failed"
                  : order.paymentStatus === "partial"
                    ? "Partial"
                    : order.paymentStatus === "unpaid"
                      ? "Unpaid"
                      : "Pending"}
          </span>
        </div>

        {order.payment?.paidAt ? (
          <div>
            <p style={{ fontSize: 12, color: "#9ca3af", margin: "0 0 4px", textTransform: "uppercase", fontWeight: 600 }}>
              Paid at
            </p>
            <p style={{ fontSize: 14, color: "#374151", margin: 0 }} className="dark:text-slate-300">
              {new Date(order.payment.paidAt).toLocaleString("en-GB")}
            </p>
          </div>
        ) : null}

        {order.paymentConfirmation?.reference || order.payment?.transactionId ? (
          <div style={{ gridColumn: "1 / -1" }}>
            <p style={{ fontSize: 12, color: "#9ca3af", margin: "0 0 4px", textTransform: "uppercase", fontWeight: 600 }}>
              Payment reference
            </p>
            <p style={{ fontSize: 14, color: "#374151", margin: 0 }} className="dark:text-slate-300 font-mono">
              {order.paymentConfirmation?.reference || order.payment?.transactionId}
            </p>
            {order.paymentConfirmation?.confirmedBy ? (
              <p style={{ fontSize: 12, color: "#6b7280", margin: "4px 0 0" }} className="dark:text-slate-400">
                Confirmed by {order.paymentConfirmation.confirmedBy}
                {order.paymentConfirmation.confirmedAt
                  ? ` · ${new Date(order.paymentConfirmation.confirmedAt).toLocaleString("en-GB")}`
                  : ""}
              </p>
            ) : null}
          </div>
        ) : null}

        {showOrderTotal ? (
          <div>
            <p style={{ fontSize: 12, color: "#9ca3af", margin: "0 0 4px", textTransform: "uppercase", fontWeight: 600 }}>
              Order total
            </p>
            <p style={{ fontSize: 15, fontWeight: 700, color: "#111827", margin: 0 }} className="dark:text-white">
              {formatMoney(total)}
            </p>
          </div>
        ) : null}

        {(paymentStatus === "partial"
          ? paidAmount > 0
          : paymentStatus === "paid" && paidAmount > 0) ? (
          <div>
            <p style={{ fontSize: 12, color: "#9ca3af", margin: "0 0 4px", textTransform: "uppercase", fontWeight: 600 }}>
              {paymentStatus === "partial" ? "Paid amount" : "Amount paid"}
            </p>
            <p style={{ fontSize: 15, fontWeight: 700, color: "#16a34a", margin: 0 }}>
              {formatMoney(paidAmount)}
            </p>
          </div>
        ) : paymentStatus === "unpaid" ? (
          <div>
            <p style={{ fontSize: 12, color: "#9ca3af", margin: "0 0 4px", textTransform: "uppercase", fontWeight: 600 }}>
              Amount paid
            </p>
            <p style={{ fontSize: 15, fontWeight: 700, color: "#16a34a", margin: 0 }}>
              {formatMoney(0)}
            </p>
          </div>
        ) : null}

        {paymentStatus === "partial" && liveRemainingCod > 0 ? (
          <div>
            <p style={{ fontSize: 12, color: "#9ca3af", margin: "0 0 4px", textTransform: "uppercase", fontWeight: 600 }}>
              Remaining COD
            </p>
            <p style={{ fontSize: 15, fontWeight: 700, color: "#c2410c", margin: 0 }}>
              {formatMoney(liveRemainingCod)}
            </p>
          </div>
        ) : null}

        {order.payment?.stripePaymentIntentId ? (
          <div style={{ gridColumn: "1 / -1" }}>
            <p style={{ fontSize: 12, color: "#9ca3af", margin: "0 0 4px", textTransform: "uppercase", fontWeight: 600 }}>
              Stripe payment intent
            </p>
            <p
              style={{
                fontSize: 13,
                color: "#374151",
                margin: 0,
                fontFamily: "monospace",
                background: "#f9fafb",
                padding: "6px 10px",
                borderRadius: 6,
              }}
              className="dark:bg-slate-800 dark:text-slate-200"
            >
              {order.payment.stripePaymentIntentId}
            </p>
          </div>
        ) : null}

        {order.payment?.paypalCaptureId ? (
          <div style={{ gridColumn: "1 / -1" }}>
            <p style={{ fontSize: 12, color: "#9ca3af", margin: "0 0 4px", textTransform: "uppercase", fontWeight: 600 }}>
              PayPal capture ID
            </p>
            <p
              style={{
                fontSize: 13,
                color: "#374151",
                margin: 0,
                fontFamily: "monospace",
                background: "#f9fafb",
                padding: "6px 10px",
                borderRadius: 6,
              }}
              className="dark:bg-slate-800 dark:text-slate-200"
            >
              {order.payment.paypalCaptureId}
            </p>
          </div>
        ) : null}

        {order.payment?.paypalEmail ? (
          <div>
            <p style={{ fontSize: 12, color: "#9ca3af", margin: "0 0 4px", textTransform: "uppercase", fontWeight: 600 }}>
              PayPal account
            </p>
            <p style={{ fontSize: 13, color: "#374151", margin: 0 }} className="dark:text-slate-300">
              {order.payment.paypalEmail}
            </p>
          </div>
        ) : null}

        {order.payment?.disputeStatus ? (
          <div style={{ gridColumn: "1 / -1" }}>
            <div style={{ background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 8, padding: "12px 16px" }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#dc2626", margin: "0 0 4px" }}>Dispute opened</p>
              <p style={{ fontSize: 12, color: "#dc2626", margin: 0 }}>
                Reason: {order.payment.disputeReason || "—"}
                {order.payment.disputeId ? ` | ID: ${order.payment.disputeId}` : ""}
              </p>
            </div>
          </div>
        ) : null}
      </div>

      {order.paymentStatus === "paid" ? (
        <div style={{ marginTop: 16 }}>
          <button
            type="button"
            onClick={issueRefund}
            style={{
              padding: "8px 20px",
              background: "#fee2e2",
              color: "#dc2626",
              border: "1px solid #fca5a5",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Issue refund
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function OrderDetail({ orderId }) {
  const router = useRouter();
  const [order, setOrder] = useState(null);
  const [neighbors, setNeighbors] = useState({ prev: null, next: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [trackingCarrier, setTrackingCarrier] = useState("Postex");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");
  const [trackingSaving, setTrackingSaving] = useState(false);
  const [sendingTracking, setSendingTracking] = useState(false);
  const [liveTracking, setLiveTracking] = useState(null);
  const [liveTrackingLoading, setLiveTrackingLoading] = useState(false);
  const [storeUrl, setStoreUrl] = useState(process.env.NEXT_PUBLIC_STORE_URL || "");
  const [showInvoicePanel, setShowInvoicePanel] = useState(false);
  const [invoiceStoreMeta, setInvoiceStoreMeta] = useState(null);
  const [storeMeta, setStoreMeta] = useState({
    storeName: process.env.NEXT_PUBLIC_STORE_NAME || "Crazzycars.pk",
    logoUrl: "",
  });
  const [settings, setSettings] = useState(null);
  const [hasLabel, setHasLabel] = useState(false);
  const [courierSettings, setCourierSettings] = useState({});
  const [postexRebook, setPostexRebook] = useState(false);
  const [showPostexForm, setShowPostexForm] = useState(false);
  const [postexHandling, setPostexHandling] = useState("Normal");
  const [postexShipType, setPostexShipType] = useState("Normal");
  const [postexCodAmount, setPostexCodAmount] = useState(0);
  const postexCodManual = useRef(false);
  const [postexWeight, setPostexWeight] = useState(0.5);
  const [postexPieces, setPostexPieces] = useState(1);
  const [postexRemarks, setPostexRemarks] = useState(
    "Call customer before delivery. Do not leave parcel unattended."
  );
  const [bookingPostex, setBookingPostex] = useState(false);
  const [postexError, setPostexError] = useState("");
  const [postexSuccess, setPostexSuccess] = useState("");
  const [draftPricing, setDraftPricing] = useState(null);
  const [showRunCourierForm, setShowRunCourierForm] = useState(false);
  const [runCourierRebook, setRunCourierRebook] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/orders/${orderId}`, { credentials: "include" });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || "Could not load order.");
        setOrder(null);
        setNeighbors({ prev: null, next: null });
        return;
      }
      setOrder(json.order);
      setDraftPricing(null);
      setNeighbors({
        prev: json.neighbors?.prev || null,
        next: json.neighbors?.next || null,
      });
      setTrackingCarrier(json.order?.courier || json.order?.tracking?.carrier || "Postex");
      setTrackingNumber(json.order?.trackingNumber || json.order?.tracking?.number || "");
      setTrackingUrl(json.order?.trackingUrl || json.order?.tracking?.url || "");
      setHasLabel(Boolean(json.order?.hasPostexLabel || json.order?.hasRunCourierLabel));
      setPostexSuccess("");
      setPostexError("");
      setLiveTracking(null);
    } catch {
      setError("Network error.");
      setOrder(null);
      setNeighbors({ prev: null, next: null });
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    load();
  }, [load]);

  // Shopify-style ↑ / ↓ keyboard navigation between orders
  useEffect(() => {
    function onKeyDown(e) {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = String(e.target?.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select" || e.target?.isContentEditable) {
        return;
      }
      if ((e.key === "ArrowUp" || e.key === "k") && neighbors.prev?.id) {
        e.preventDefault();
        router.push(`/orders/${neighbors.prev.id}`);
      } else if ((e.key === "ArrowDown" || e.key === "j") && neighbors.next?.id) {
        e.preventDefault();
        router.push(`/orders/${neighbors.next.id}`);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [neighbors, router]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/settings", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled || !data?.success) return;
        const loaded = data.settings || data.data || {};
        setSettings(loaded);
        setStoreMeta({
          storeName: loaded.general?.storeName || process.env.NEXT_PUBLIC_STORE_NAME || "Crazzycars.pk",
          logoUrl: loaded.general?.logo?.url || "",
        });
        setStoreUrl(loaded.general?.website || process.env.NEXT_PUBLIC_STORE_URL || "");
        setCourierSettings(loaded.courier || {});
        const savedRemarks = String(loaded.courier?.shipperRemarks || "").trim();
        if (savedRemarks) setPostexRemarks(savedRemarks);
      })
      .catch(() => {
        /* ignore */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (order) {
      const total = Math.max(
        0,
        Number(draftPricing?.total ?? order.pricing?.total ?? order.total ?? 0) || 0
      );
      const prepaid = isPrepaidOrder(order);
      if (!postexCodManual.current) {
        setPostexCodAmount(defaultPostexCodAmount(order, total, prepaid));
      }
      setPostexPieces(order.items?.length || orderItemCount(order) || 1);
      const grams = Number(order.pricing?.totalWeightGrams) || 0;
      const weightKg = grams > 0 ? Math.round((grams / 1000) * 100) / 100 : 0.5;
      setPostexWeight(Math.max(0.5, weightKg));
    }
  }, [order, draftPricing]);

  useEffect(() => {
    getInvoiceStoreMeta().then(setInvoiceStoreMeta).catch(() => {});
  }, []);

  function printInvoiceDoc() {
    if (!order) return;
    try {
      printProfessionalInvoice(order, invoiceStoreMeta || storeMeta || {});
      toast.success("Print dialog opened.");
    } catch {
      toast.error("Could not print invoice.");
    }
  }

  async function printPackingSlip() {
    try {
      const res = await fetch("/api/settings", { credentials: "include" });
      const json = await res.json().catch(() => ({}));
      const settings = json?.settings || json?.data || {};
      const body = packingSlipInnerHtml(order, {
        storeName: settings?.general?.storeName || "Store",
        logoUrl: settings?.general?.logo?.url || "",
      });
      printHtmlWithIframe(printDocumentShell(`Packing Slip ${order.orderNumber}`, body));
    } catch {
      toast.error("Could not print packing slip.");
    }
  }

  async function fetchLiveCourierStatus(number, orderHint = order) {
    const id = String(number || "").trim();
    if (!id) return null;
    setLiveTrackingLoading(true);
    try {
      const useRunCourier = isRunCourierOrder(orderHint);
      const endpoint = useRunCourier
        ? `/api/runcourier/track?trackingNumber=${encodeURIComponent(id)}`
        : `/api/postex/track?trackingNumber=${encodeURIComponent(id)}`;
      const res = await fetch(endpoint, { credentials: "include" });
      const json = await res.json();
      if (json.success) {
        setLiveTracking(json);
        return json;
      }
      // Fallback: try the other courier once
      const alt = useRunCourier
        ? `/api/postex/track?trackingNumber=${encodeURIComponent(id)}`
        : `/api/runcourier/track?trackingNumber=${encodeURIComponent(id)}`;
      const res2 = await fetch(alt, { credentials: "include" });
      const json2 = await res2.json();
      if (json2.success) {
        setLiveTracking(json2);
        return json2;
      }
      setLiveTracking(null);
      return null;
    } catch {
      setLiveTracking(null);
      return null;
    } finally {
      setLiveTrackingLoading(false);
    }
  }

  /** @deprecated alias — kept for existing call sites in this file */
  async function fetchLivePostexStatus(number) {
    return fetchLiveCourierStatus(number);
  }

  async function saveTracking() {
    const num = String(trackingNumber || "").trim();
    if (!num) {
      toast.error("Enter a tracking number.");
      return;
    }

    const carrierLower = String(trackingCarrier || "").toLowerCase();
    const isPostex = carrierLower === "postex";
    const isRun =
      carrierLower.includes("run courier") ||
      carrierLower === "trax" ||
      carrierLower === "tcs" ||
      carrierLower.includes("m&p") ||
      carrierLower.includes("leopard") ||
      Boolean(order?.runCourierApi);

    if (isPostex || isRun) {
      const verified = await fetchLiveCourierStatus(num, {
        ...order,
        courier: trackingCarrier,
        runCourierApi: isRun ? order?.runCourierApi || "Auto" : "",
      });
      if (!verified) {
        toast.error(
          isRun
            ? "Run Courier could not verify this tracking number."
            : "Postex could not verify this tracking number."
        );
        return;
      }
    }

    const url =
      String(trackingUrl || "").trim() ||
      storefrontTrackingUrl(num) ||
      (isPostex ? postexPublicTrackingUrl(num) : "") ||
      (isRun ? runCourierPublicTrackingUrl(num) : "");

    setTrackingSaving(true);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trackingNumber: num,
          courier: trackingCarrier,
          trackingUrl: url,
          tracking: {
            carrier: trackingCarrier,
            number: num,
            url,
          },
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error || "Failed to save tracking.");
        return;
      }
      setOrder(json.order);
      setTrackingUrl(json.order?.trackingUrl || url);
      toast.success("Tracking saved.");
      if (isPostex || isRun) await fetchLiveCourierStatus(num, json.order);
    } catch {
      toast.error("Network error.");
    } finally {
      setTrackingSaving(false);
    }
  }

  function copyTrackingLink() {
    const link =
      order?.trackingUrl ||
      trackingUrl ||
      storefrontTrackingUrl(trackingNumber) ||
      (String(trackingCarrier).toLowerCase() === "postex"
        ? postexPublicTrackingUrl(trackingNumber)
        : "") ||
      (isRunCourierOrder({ ...order, courier: trackingCarrier })
        ? runCourierPublicTrackingUrl(trackingNumber)
        : "");
    if (!link) {
      toast.error("No tracking link available.");
      return;
    }
    navigator.clipboard?.writeText(link).then(
      () => toast.success("Tracking link copied."),
      () => toast.error("Could not copy link.")
    );
  }

  function sendTrackingWhatsApp() {
    const num = order?.trackingNumber || order?.tracking?.number || trackingNumber;
    if (!num) {
      toast.error("Add tracking number first.");
      return;
    }
    const rawPhone = getCustomerOrderPhone(order);
    const customerTrackUrl = storefrontTrackingUrl(num, storeUrl);
    const msg =
      getOrderShippedWhatsAppMessage(order, settings || {}, {
        trackingNumber: num,
        courier: order.courier || trackingCarrier || "Postex",
        trackingUrl: customerTrackUrl || order.trackingUrl || trackingUrl || postexPublicTrackingUrl(num),
      }) ||
      getLegacyTrackingWhatsAppMessage({
        storeName: storeMeta.storeName,
        orderNumber: order.orderNumber,
        trackingNumber: num,
        storeUrl,
      });
    if (!buildWaLink(rawPhone, msg)) {
      toast.error("Customer phone number required.");
      return;
    }
    openWhatsApp(rawPhone, msg);
  }

  useEffect(() => {
    const num = order?.trackingNumber || order?.tracking?.number;
    const car = String(order?.courier || order?.tracking?.carrier || "").toLowerCase();
    if (num && car === "postex") {
      void fetchLivePostexStatus(num);
    }
  }, [order?.id, order?.trackingNumber, order?.tracking?.number, order?.courier]);

  const handleBookPostex = async () => {
    if (!order) return;
    setBookingPostex(true);
    setPostexError("");
    setPostexSuccess("");
    try {
      const pickupCode = String(courierSettings.postexAddressCode || "").trim();
      const cod = Math.max(0, Math.round(Number(postexCodAmount) || 0));
      const res = await fetch("/api/postex/create-shipment", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id || order._id,
          rebook: postexRebook,
          handling: postexHandling,
          type: postexShipType,
          codAmount: cod,
          weight: postexWeight,
          pieces: postexPieces,
          remarks: postexRemarks,
          pickupAddressCode: pickupCode,
          paymentMethod: cod > 0 ? "COD" : "Prepaid",
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPostexSuccess(`✅ Booked! Tracking: ${data.trackingNumber}`);
        setShowPostexForm(false);
        setPostexRebook(false);
        setTrackingNumber(data.trackingNumber || "");
        setTrackingCarrier("Postex");
        setTrackingUrl(data.trackingUrl || postexPublicTrackingUrl(data.trackingNumber));
        setHasLabel(Boolean(data.hasLabel));
        toast.success(`Shipment booked: ${data.trackingNumber}`);
        // Auto-download shipping slip PDF (PostEx demo slip)
        const labelUrl =
          data.labelDownloadUrl ||
          (data.trackingNumber
            ? `/api/postex/label?trackingNumber=${encodeURIComponent(data.trackingNumber)}&orderId=${encodeURIComponent(orderId)}&download=1`
            : "");
        if (labelUrl) {
          const a = document.createElement("a");
          a.href = labelUrl;
          a.rel = "noopener";
          a.download = `postex-label-${data.trackingNumber || "shipment"}.pdf`;
          document.body.appendChild(a);
          a.click();
          a.remove();
        }
        await load();
        if (data.trackingNumber) await fetchLivePostexStatus(data.trackingNumber);
      } else {
        setPostexError(data.error || "Booking failed");
        toast.error(data.error || "Booking failed");
      }
    } catch {
      setPostexError("Network error. Please try again.");
      toast.error("Network error. Please try again.");
    } finally {
      setBookingPostex(false);
    }
  };

  function openPostexLabel() {
    const tn = order?.trackingNumber || order?.tracking?.number || trackingNumber;
    if (!tn) {
      toast.error("No tracking number.");
      return;
    }
    window.open(
      `/api/postex/label?trackingNumber=${encodeURIComponent(tn)}&orderId=${encodeURIComponent(orderId)}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  function openRunCourierLabel() {
    const tn = order?.trackingNumber || order?.tracking?.number || trackingNumber;
    if (!tn) {
      toast.error("No tracking number.");
      return;
    }
    const a = document.createElement("a");
    a.href = `/api/runcourier/label?trackingNumber=${encodeURIComponent(tn)}&orderId=${encodeURIComponent(orderId)}&download=1`;
    a.rel = "noopener";
    a.download = `runcourier-airbill-${tn}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  async function sendTrackingEmail() {
    if (!order?.trackingNumber && !order?.tracking?.number) {
      toast.error("Add tracking number first.");
      return;
    }
    setSendingTracking(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/send-tracking-email`, {
        method: "POST",
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error || "Failed to send tracking email.");
        return;
      }
      toast.success("Tracking email logged.");
      load();
    } catch {
      toast.error("Network error.");
    } finally {
      setSendingTracking(false);
    }
  }

  if (loading) {
    return (
      <div className="w-full space-y-4">
        <div className="h-10 w-48 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
        <div className="h-96 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="mx-auto max-w-lg rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-100">
        {error || "Order not found."}
      </div>
    );
  }

  const p = order.pricing || { subtotal: 0, discount: 0, shippingCost: 0, total: 0 };
  const effectiveTotal = Math.max(
    0,
    Number(draftPricing?.total ?? p.total ?? order.total ?? 0) || 0
  );
  const hasTracking = Boolean(order.trackingNumber || order.tracking?.number || trackingNumber);
  const pmLower = String(order.paymentMethod || order.payment?.method || "").toLowerCase();

  const postexBookingSection = (
    <div style={{ marginTop: 16 }}>
      {postexSuccess ? (
        <div
          style={{
            padding: "12px 16px",
            background: "#F0FDF4",
            border: "1px solid #BBF7D0",
            borderRadius: 8,
            color: "#16A34A",
            marginBottom: 12,
            fontWeight: 600,
          }}
        >
          {postexSuccess}
        </div>
      ) : null}

      {!showPostexForm ? (
        <button
          type="button"
          onClick={() => {
            postexCodManual.current = false;
            setPostexRebook(false);
            setPostexShipType(courierSettings.defaultShipperType || "Normal");
            setPostexHandling(courierSettings.defaultHandling || "Normal");
            setShowPostexForm(true);
          }}
          style={{
            background: "#C41E1E",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "10px 20px",
            fontWeight: 700,
            fontSize: 14,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          🚀 Book with Postex
        </button>
      ) : (
        <div
          style={{
            background: "#F9FAFB",
            border: "1px solid #E5E7EB",
            borderRadius: 12,
            padding: 20,
            marginTop: 8,
          }}
        >
          <h4 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700, color: "#111" }}>
            📦 Review Shipment Details
            {postexRebook ? " (Re-book)" : ""}
          </h4>

          <div
            style={{
              background: "#fff",
              border: "1px solid #E5E7EB",
              borderRadius: 8,
              padding: 12,
              marginBottom: 16,
              fontSize: 13,
              color: "#374151",
            }}
          >
            <div>
              <strong>Customer:</strong> {order.shippingAddress?.name}
            </div>
            <div>
              <strong>Phone:</strong> {order.shippingAddress?.phone}
            </div>
            <div>
              <strong>City:</strong> {order.shippingAddress?.city}, {order.shippingAddress?.state}
            </div>
            <div>
              <strong>Address:</strong> {order.shippingAddress?.street}
            </div>
            <div>
              <strong>Payment:</strong>{" "}
              {Number(postexCodAmount) > 0
                ? `COD (Rs. ${Math.round(Number(postexCodAmount) || 0).toLocaleString()})`
                : pmLower.includes("cod") || pmLower.includes("cash")
                  ? "Cash on Delivery"
                  : "Prepaid"}
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              marginBottom: 12,
            }}
          >
            <div>
              <label
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#374151",
                  display: "block",
                  marginBottom: 4,
                }}
              >
                Handling
              </label>
              <select
                value={postexHandling}
                onChange={(e) => setPostexHandling(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  border: "1px solid #E5E7EB",
                  borderRadius: 6,
                  fontSize: 13,
                }}
              >
                <option value="Normal">Normal</option>
                <option value="Fragile">Fragile</option>
              </select>
            </div>

            <div>
              <label
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#374151",
                  display: "block",
                  marginBottom: 4,
                }}
              >
                Shipment type
              </label>
              <select
                value={postexShipType}
                onChange={(e) => setPostexShipType(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  border: "1px solid #E5E7EB",
                  borderRadius: 6,
                  fontSize: 13,
                }}
              >
                {POSTEX_SHIP_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#374151",
                  display: "block",
                  marginBottom: 4,
                }}
              >
                COD Amount (Rs.)
              </label>
              <input
                type="number"
                min={0}
                step={1}
                value={postexCodAmount}
                onChange={(e) => {
                  postexCodManual.current = true;
                  setPostexCodAmount(Math.max(0, Math.round(Number(e.target.value) || 0)));
                }}
                title="Editable COD collected by PostEx. For partial payments, defaults to remaining COD."
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  border: "1px solid #E5E7EB",
                  borderRadius: 6,
                  fontSize: 13,
                  background: "#fff",
                  color: "#111827",
                }}
              />
              <p style={{ margin: "6px 0 0", fontSize: 11, color: "#6B7280" }}>
                {Number(postexCodAmount) > 0
                  ? "PostEx will collect this COD amount on delivery."
                  : "Set to 0 for prepaid (no collection). Edit to collect remaining balance on delivery."}
              </p>
            </div>

            <div>
              <label
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#374151",
                  display: "block",
                  marginBottom: 4,
                }}
              >
                Weight (kg)
              </label>
              <input
                type="number"
                value={postexWeight}
                onChange={(e) => setPostexWeight(Number(e.target.value))}
                step="0.1"
                min="0.5"
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  border: "1px solid #E5E7EB",
                  borderRadius: 6,
                  fontSize: 13,
                }}
              />
            </div>

            <div>
              <label
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#374151",
                  display: "block",
                  marginBottom: 4,
                }}
              >
                Pieces
              </label>
              <input
                type="number"
                value={postexPieces}
                onChange={(e) => setPostexPieces(Number(e.target.value))}
                min="1"
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  border: "1px solid #E5E7EB",
                  borderRadius: 6,
                  fontSize: 13,
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "#374151",
                display: "block",
                marginBottom: 4,
              }}
            >
              Remarks
            </label>
            <textarea
              value={postexRemarks}
              onChange={(e) => setPostexRemarks(e.target.value)}
              rows={2}
              style={{
                width: "100%",
                padding: "8px 10px",
                border: "1px solid #E5E7EB",
                borderRadius: 6,
                fontSize: 13,
                resize: "vertical",
              }}
            />
          </div>

          {postexError ? (
            <div
              style={{
                padding: "10px 14px",
                background: "#FEF2F2",
                border: "1px solid #FECACA",
                borderRadius: 6,
                color: "#DC2626",
                marginBottom: 12,
                fontSize: 13,
              }}
            >
              {postexError}
            </div>
          ) : null}

          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              onClick={() => {
                setShowPostexForm(false);
                setPostexError("");
                setPostexRebook(false);
              }}
              style={{
                background: "#F3F4F6",
                color: "#374151",
                border: "none",
                borderRadius: 8,
                padding: "10px 20px",
                fontWeight: 600,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleBookPostex}
              disabled={bookingPostex}
              style={{
                background: bookingPostex ? "#9CA3AF" : "#C41E1E",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "10px 24px",
                fontWeight: 700,
                fontSize: 14,
                cursor: bookingPostex ? "not-allowed" : "pointer",
                flex: 1,
              }}
            >
              {bookingPostex ? "⏳ Booking..." : "✅ Confirm & Book with Postex"}
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const placedAt =
    order.createdAt != null
      ? new Date(order.createdAt).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "long",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "—";

  return (
    <div className="w-full max-w-none">
      <div className="print:hidden">
        <div className="mb-2">
          <Link href="/orders" className="text-sm font-medium text-[#1d6fb8] hover:underline">
            ← Orders
          </Link>
        </div>

        <div className="mb-3 border-b border-slate-200 pb-3 dark:border-slate-700">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="m-0 text-lg font-bold leading-tight text-slate-900 dark:text-white">
                  Order #{order.orderNumber}
                </h1>
                <DualStatusBadges
                  orderStatus={order.orderStatus || order.status}
                  paymentStatus={order.paymentStatus}
                />
                <CustomerConfirmBadge order={order} />
                {order.aiAttributedSource ? (
                  <span
                    className="inline-flex items-center rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-semibold text-violet-800 dark:bg-violet-900/40 dark:text-violet-200"
                    title={
                      order.aiAttributedAt
                        ? `AI first-touch ${new Date(order.aiAttributedAt).toLocaleString()}`
                        : "Attributed to AI agent traffic"
                    }
                  >
                    AI · {order.aiAttributedSource}
                  </span>
                ) : null}
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  {formatCurrencyAmount(order, effectiveTotal)}
                </span>
              </div>
              <p className="mt-0.5 mb-0 text-xs text-slate-500 dark:text-slate-400">
                {(() => {
                  const meta = formatCustomerListMeta({
                    name: customerFullName(order),
                    email: order.customer?.email,
                    phone: order.customer?.phone || order.shippingAddress?.phone,
                  });
                  return meta.isGuest
                    ? `${meta.primary} · ${meta.secondary}`
                    : meta.primary;
                })()}
                {order.paymentMethod || order.payment?.method
                  ? ` · ${order.paymentMethod || order.payment?.method}`
                  : ""}
                {" · "}
                {placedAt}
                {order.invoiceId || order.invoiceNumber ? (
                  <>
                    {" · Invoice "}
                    {order.invoiceId ? (
                      <Link
                        href={`/invoices/${order.invoiceId}`}
                        className="font-semibold text-[#1d6fb8] hover:underline"
                      >
                        {order.invoiceNumber || "View"}
                      </Link>
                    ) : (
                      <span className="font-semibold">{order.invoiceNumber}</span>
                    )}
                  </>
                ) : null}
              </p>
            </div>

            <div
              className="inline-flex shrink-0 overflow-hidden rounded-lg border border-slate-300 bg-white dark:border-slate-500 dark:bg-slate-800"
              role="group"
              aria-label="Go to previous or next order"
            >
              <button
                type="button"
                disabled={!neighbors.prev?.id}
                title={
                  neighbors.prev?.orderNumber
                    ? `Newer order (${neighbors.prev.orderNumber})`
                    : "No newer order"
                }
                aria-label="Previous order (newer)"
                onClick={() => neighbors.prev?.id && router.push(`/orders/${neighbors.prev.id}`)}
                className="flex h-9 min-w-[3.75rem] items-center justify-center gap-1 border-r border-slate-300 px-2.5 text-xs font-bold text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-500 dark:text-slate-100 dark:hover:bg-slate-700"
              >
                <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                  <path
                    fillRule="evenodd"
                    d="M14.77 12.79a.75.75 0 01-1.06-.02L10 8.832 6.29 12.77a.75.75 0 11-1.08-1.04l4.25-4.5a.75.75 0 011.08 0l4.25 4.5a.75.75 0 01-.02 1.06z"
                    clipRule="evenodd"
                  />
                </svg>
                Prev
              </button>
              <button
                type="button"
                disabled={!neighbors.next?.id}
                title={
                  neighbors.next?.orderNumber
                    ? `Older order (${neighbors.next.orderNumber})`
                    : "No older order"
                }
                aria-label="Next order (older)"
                onClick={() => neighbors.next?.id && router.push(`/orders/${neighbors.next.id}`)}
                className="flex h-9 min-w-[3.75rem] items-center justify-center gap-1 px-2.5 text-xs font-bold text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-100 dark:hover:bg-slate-700"
              >
                Next
                <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          </div>

          <div className="mt-2.5 flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={printInvoiceDoc}
              className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
            >
              Print Invoice
            </button>
            <button
              type="button"
              onClick={printPackingSlip}
              className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
            >
              Print Packing Slip
            </button>
            <button
              type="button"
              onClick={() => setShowInvoicePanel(true)}
              className="rounded-md bg-[#1d6fb8] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-[#185f9e]"
            >
              Send Invoice
            </button>
            <div className="min-w-[140px] [&_button]:!py-1.5 [&_button]:!text-xs">
              <OrderWhatsAppButton order={order} settings={settings} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 items-start gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(300px,360px)]">
          <div className="min-w-0 space-y-3">
            {/* Products first — visible without scrolling past tall meta cards */}
            <OrderItemsEditor
              order={order}
              onUpdated={(updated) => {
                if (updated) setOrder(updated);
                setDraftPricing(null);
              }}
              onDraftPricingChange={setDraftPricing}
            />

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              <ShippingDetailsCard order={order} orderId={orderId} onUpdated={setOrder} />
              <div className="space-y-3">
                <details className="group rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
                  <summary className="cursor-pointer list-none px-4 py-2.5 text-sm font-semibold text-slate-900 marker:content-none dark:text-white [&::-webkit-details-marker]:hidden">
                    <span className="flex items-center justify-between gap-2">
                      Order information
                      <span className="text-xs font-normal text-slate-400 group-open:hidden">Show</span>
                      <span className="hidden text-xs font-normal text-slate-400 group-open:inline">Hide</span>
                    </span>
                  </summary>
                  <div className="border-t border-slate-100 dark:border-slate-800">
                    <OrderInformationCard order={order} bare />
                  </div>
                </details>
                <OrderTagsEditor order={order} onUpdated={setOrder} />
                <InternalNotes order={order} onUpdated={setOrder} />
                <OrderActivityFeed order={order} />
              </div>
            </div>
          </div>

          <div className="min-w-0 space-y-3">
            <OrderStatusCard order={order} onUpdated={setOrder} />
            <PaymentStatusCard order={order} onUpdated={setOrder} orderTotalOverride={effectiveTotal} />

            <PaymentInformationSection
              order={order}
              orderId={orderId}
              onRefunded={load}
              orderTotal={effectiveTotal}
            />

            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                <span aria-hidden>📦</span>
                Shipping &amp; Tracking
              </h2>

              {!hasTracking ? (
                <div className="mt-2 space-y-3">
                  <div
                    className="rounded-lg border border-slate-200 p-3 dark:border-slate-600"
                    style={{ background: "#FAFAFA" }}
                  >
                    <p className="text-sm font-bold text-slate-900 dark:text-white">📦 Book Postex Shipment</p>
                    {postexBookingSection}
                  </div>
                  <div
                    className="rounded-lg border border-emerald-200 p-3 dark:border-emerald-900/40"
                    style={{ background: "#F0FDF4" }}
                  >
                    <p className="text-sm font-bold text-emerald-900 dark:text-emerald-100">
                      🚚 Book with Run Courier
                    </p>
                    {!showRunCourierForm ? (
                      <button
                        type="button"
                        onClick={() => {
                          setRunCourierRebook(false);
                          setShowRunCourierForm(true);
                          setShowPostexForm(false);
                        }}
                        style={{
                          marginTop: 10,
                          background: "#059669",
                          color: "#fff",
                          border: "none",
                          borderRadius: 8,
                          padding: "10px 20px",
                          fontWeight: 700,
                          fontSize: 14,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        🚚 Book with Run Courier
                      </button>
                    ) : (
                      <RunCourierBookingPanel
                        order={order}
                        orderTotal={effectiveTotal}
                        courierSettings={courierSettings}
                        rebook={false}
                        onCancelForm={() => {
                          setShowRunCourierForm(false);
                          setRunCourierRebook(false);
                        }}
                        onBooked={(data) => {
                          setTrackingNumber(data.trackingNumber || "");
                          setTrackingCarrier(data.order?.courier || data.selectedApi || "Run Courier");
                          setTrackingUrl(data.trackingUrl || "");
                          setHasLabel(Boolean(data.hasLabel));
                          setShowRunCourierForm(false);
                          load();
                        }}
                      />
                    )}
                  </div>
                </div>
              ) : (
                <div className="mt-3 space-y-3 text-sm">
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-100">
                    <p className="font-semibold">
                      ✓ {order.courier || trackingCarrier || "Postex"} —{" "}
                      {order.trackingNumber || order.tracking?.number || trackingNumber}
                    </p>
                    {liveTrackingLoading ? (
                      <p className="mt-1 text-xs">Loading live status…</p>
                    ) : liveTracking?.status ? (
                      <div className="mt-1 space-y-1">
                        <p>
                          Live status: <strong>{liveTracking.status}</strong>
                          {liveTracking.courier ? (
                            <span className="ml-1 text-xs opacity-80">({liveTracking.courier})</span>
                          ) : null}
                        </p>
                        {liveTracking.currentLocation || liveTracking.location ? (
                          <p className="text-xs">
                            Location: {liveTracking.currentLocation || liveTracking.location}
                          </p>
                        ) : null}
                        {Array.isArray(liveTracking.events) && liveTracking.events.length > 0 ? (
                          <ul className="mt-2 max-h-28 space-y-1 overflow-y-auto text-xs">
                            {liveTracking.events.slice(0, 6).map((ev, i) => (
                              <li key={`${ev.status}-${i}`} className="opacity-90">
                                {[ev.date, ev.time].filter(Boolean).join(" ")} — {ev.status}
                                {ev.location ? ` · ${ev.location}` : ""}
                              </li>
                            ))}
                          </ul>
                        ) : null}
                        <button
                          type="button"
                          className="text-xs text-[#1d6fb8] hover:underline"
                          onClick={() =>
                            fetchLiveCourierStatus(
                              order.trackingNumber || order.tracking?.number || trackingNumber
                            )
                          }
                        >
                          Refresh status
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="mt-1 text-xs text-[#1d6fb8] hover:underline"
                        onClick={() =>
                          fetchLiveCourierStatus(
                            order.trackingNumber || order.tracking?.number || trackingNumber
                          )
                        }
                      >
                        Refresh {isRunCourierOrder(order) ? "Run Courier" : "courier"} status
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const tn = order.trackingNumber || order.tracking?.number || trackingNumber;
                        navigator.clipboard?.writeText(tn).then(
                          () => toast.success("Tracking number copied."),
                          () => toast.error("Could not copy.")
                        );
                      }}
                      className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800"
                    >
                      Copy tracking #
                    </button>
                    <a
                      href={
                        order.trackingUrl ||
                        trackingUrl ||
                        storefrontTrackingUrl(
                          order.trackingNumber || trackingNumber
                        ) ||
                        (isRunCourierOrder(order)
                          ? runCourierPublicTrackingUrl(
                              order.trackingNumber || trackingNumber
                            )
                          : postexPublicTrackingUrl(order.trackingNumber || trackingNumber))
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-[#1d6fb8] hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800"
                    >
                      Track shipment →
                    </a>
                    {(hasLabel || order.hasPostexLabel || order.hasRunCourierLabel) ? (
                      <button
                        type="button"
                        onClick={() => {
                          if (order.hasRunCourierLabel || order.runCourierApi) openRunCourierLabel();
                          else openPostexLabel();
                        }}
                        className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800"
                      >
                        Download Label
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={sendTrackingWhatsApp}
                      className="rounded-md bg-[#25D366] px-2.5 py-1 text-xs font-semibold text-white"
                    >
                      Send tracking to customer
                    </button>
                    <button
                      type="button"
                      disabled={bookingPostex}
                      onClick={() => {
                        if (
                          window.confirm(
                            "Re-book will create a NEW Postex shipment and replace the tracking number. Continue?"
                          )
                        ) {
                          postexCodManual.current = false;
                          setPostexRebook(true);
                          setPostexShipType(courierSettings.defaultShipperType || "Normal");
                          setShowPostexForm(true);
                          setShowRunCourierForm(false);
                          setPostexError("");
                        }
                      }}
                      className="rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900 hover:bg-amber-100"
                    >
                      Re-book Postex
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          window.confirm(
                            "Re-book will create a NEW Run Courier shipment and replace the tracking number. Continue?"
                          )
                        ) {
                          setRunCourierRebook(true);
                          setShowRunCourierForm(true);
                          setShowPostexForm(false);
                        }
                      }}
                      className="rounded-md border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-900 hover:bg-emerald-100"
                    >
                      Re-book Run Courier
                    </button>
                  </div>

                  {showPostexForm ? postexBookingSection : null}
                  {showRunCourierForm ? (
                    <RunCourierBookingPanel
                      order={order}
                      orderTotal={effectiveTotal}
                      courierSettings={courierSettings}
                      rebook={runCourierRebook}
                      onCancelForm={() => {
                        setShowRunCourierForm(false);
                        setRunCourierRebook(false);
                      }}
                      onBooked={(data) => {
                        setTrackingNumber(data.trackingNumber || "");
                        setTrackingCarrier(data.order?.courier || data.selectedApi || "Run Courier");
                        setTrackingUrl(data.trackingUrl || "");
                        setHasLabel(Boolean(data.hasLabel));
                        setShowRunCourierForm(false);
                        setRunCourierRebook(false);
                        load();
                      }}
                    />
                  ) : null}
                </div>
              )}

              <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Manual tracking (other couriers)
                </p>
                <div className="space-y-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Courier</label>
                    <select
                      value={trackingCarrier}
                      onChange={(e) => setTrackingCarrier(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800"
                    >
                      {["Postex", "Run Courier", "TCS", "Leopards", "M&P", "Trax", "Other"].map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                      Tracking Number
                    </label>
                    <input
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800"
                      placeholder="Enter tracking number"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={trackingSaving}
                    onClick={saveTracking}
                    className="w-full rounded-lg bg-[#1d6fb8] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#185f9e] disabled:opacity-60"
                  >
                    {trackingSaving ? "Saving..." : "Save Tracking"}
                  </button>
                  {hasTracking ? (
                    <button
                      type="button"
                      disabled={sendingTracking}
                      onClick={sendTrackingEmail}
                      className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800"
                    >
                      {sendingTracking ? "Sending..." : "Send tracking email"}
                    </button>
                  ) : null}
                </div>
              </div>
            </div>

            <OrderTimeline
              order={order}
              onStatusChange={async (newStatus) => {
                try {
                  const res = await fetch(`/api/orders/${order.id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({ orderStatus: newStatus }),
                  });
                  const data = await res.json();
                  if (data.success) {
                    toast.success(`Order status updated to ${newStatus}`);
                    setOrder(data.order);
                    router.refresh();
                  } else {
                    toast.error(data.error || "Failed to update status");
                  }
                } catch {
                  toast.error("Failed to update status");
                }
              }}
            />
          </div>
        </div>
      </div>

      <SendInvoicePanel
        order={order}
        orderId={orderId}
        open={showInvoicePanel}
        onClose={() => setShowInvoicePanel(false)}
        onSent={(updated) => {
          if (updated) setOrder((prev) => ({ ...prev, ...updated }));
          load();
        }}
      />
    </div>
  );
}
