/**
 * Full order detail: items, notes, status controls, customer/shipping, print invoice.
 */
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import OrderTimeline from "@/components/orders/OrderTimeline";
import {
  packingSlipInnerHtml,
  printDocumentShell,
  printHtmlWithIframe,
} from "./printOrderDocuments";
import { InternalNotes } from "./InternalNotes";
import { PrintInvoice } from "./PrintInvoice";
import { OrderStatusCard, PaymentStatusCard } from "./StatusUpdater";
import { OrderItemsEditor } from "./OrderItemsEditor";
import {
  buildWaLink,
  getAdminWhatsAppNumber,
  getCustomerOrderPhone,
  openWhatsApp,
  openWhatsAppWithOptionalImage,
  OrderWhatsAppButton,
} from "@/components/orders/OrderWhatsAppButton";
import { formatAdminPrice } from "@/lib/currency";
import { isPrepaidOrder, postexPublicTrackingUrl, storefrontTrackingUrl } from "@/lib/postex";
import {
  buildWhatsAppMessage,
  getLegacyTrackingWhatsAppMessage,
  getOrderShippedWhatsAppMessage,
  resolveTemplate,
} from "@/lib/whatsappTemplates";

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

function adminNotifyStorageKey(orderId) {
  return `admin-wa-notified-${orderId}`;
}

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

function customerFullName(order) {
  const fn = order?.customer?.firstName || "";
  const ln = order?.customer?.lastName || "";
  const combined = `${fn} ${ln}`.trim();
  return combined || order?.customer?.name || "—";
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

function InfoTableCard({ title, rows }) {
  const visibleRows = rows.filter(Boolean);
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        overflow: "hidden",
        marginBottom: 20,
      }}
      className="dark:border-slate-700 dark:bg-slate-900"
    >
      <div
        style={{
          background: "#f9fafb",
          padding: "14px 20px",
          borderBottom: "1px solid #e5e7eb",
        }}
        className="dark:border-slate-700 dark:bg-slate-800/80"
      >
        <h3
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: "#111827",
            margin: 0,
          }}
          className="dark:text-white"
        >
          {title}
        </h3>
      </div>
      <div style={{ padding: 20 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            {visibleRows.map((row, i) => (
              <tr
                key={row.label}
                style={{
                  borderBottom: i < visibleRows.length - 1 ? "1px solid #f3f4f6" : "none",
                }}
                className="dark:border-slate-800"
              >
                <td
                  style={{
                    padding: "10px 0",
                    fontSize: 13,
                    color: "#6b7280",
                    fontWeight: 500,
                    width: "40%",
                    verticalAlign: "top",
                  }}
                  className="dark:text-slate-400"
                >
                  {row.label}
                </td>
                <td
                  style={{
                    padding: "10px 0",
                    fontSize: 13,
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
      </div>
    </div>
  );
}

function OrderInformationCard({ order }) {
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

  return <InfoTableCard title="Order Information" rows={rows} />;
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
  const displayRows = [
    { label: "Full Name", value: addr.name || customerFullName(order) },
    { label: "Phone", value: addr.phone || order.customer?.phone || "—" },
    {
      label: "Address",
      value:
        [addr.street || addr.line1, addr.street2 || addr.line2]
          .filter(Boolean)
          .join(", ") ||
        addr.address ||
        "—",
    },
    { label: "Area", value: addr.area || "—" },
    { label: "City", value: addr.city || "—" },
    { label: "Province", value: addr.province || addr.state || "—" },
    {
      label: "Postal Code",
      value: addr.postcode || addr.postalCode || addr.zip || "—",
    },
    { label: "Country", value: addr.country || "Pakistan" },
    {
      label: "Notes / Instructions",
      value: shippingInstructionsFromOrder(order) || "—",
    },
  ];

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
        marginBottom: 20,
      }}
      className="dark:border-slate-700 dark:bg-slate-900"
    >
      <div
        style={{
          background: "#f9fafb",
          padding: "14px 20px",
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

      <div style={{ padding: 20 }}>
        {editing ? (
          <div className="space-y-4">
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
            <div>
              <label className={labelClass}>Area (optional)</label>
              <input
                type="text"
                value={form.area || ""}
                onChange={(e) => patchField("area", e.target.value)}
                placeholder="Colony / sector / mohalla"
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
                      padding: "10px 0",
                      fontSize: 13,
                      color: "#6b7280",
                      fontWeight: 500,
                      width: "40%",
                      verticalAlign: "top",
                    }}
                    className="dark:text-slate-400"
                  >
                    {row.label}
                  </td>
                  <td
                    style={{
                      padding: "10px 0",
                      fontSize: 13,
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

function PaymentInformationSection({ order, orderId, onRefunded }) {
  const pm = order.payment?.method || order.paymentMethod || "";

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

        {(order.paymentStatus === "partial"
          ? Number(order.payment?.paidAmount ?? order.payment?.amount) > 0
          : order.payment?.amount != null && order.payment.amount > 0) ? (
          <div>
            <p style={{ fontSize: 12, color: "#9ca3af", margin: "0 0 4px", textTransform: "uppercase", fontWeight: 600 }}>
              {order.paymentStatus === "partial" ? "Paid amount" : "Amount paid"}
            </p>
            <p style={{ fontSize: 15, fontWeight: 700, color: "#16a34a", margin: 0 }}>
              {formatMoney(order.payment?.paidAmount ?? order.payment.amount)}
            </p>
          </div>
        ) : null}

        {order.paymentStatus === "partial" && Number(order.payment?.remainingCod) > 0 ? (
          <div>
            <p style={{ fontSize: 12, color: "#9ca3af", margin: "0 0 4px", textTransform: "uppercase", fontWeight: 600 }}>
              Remaining COD
            </p>
            <p style={{ fontSize: 15, fontWeight: 700, color: "#c2410c", margin: 0 }}>
              {formatMoney(order.payment.remainingCod)}
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

      {order.paymentStatus === "paid" && order.payment?.stripePaymentIntentId ? (
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
            Issue refund (Stripe)
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function OrderDetail({ orderId }) {
  const router = useRouter();
  const [order, setOrder] = useState(null);
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
  const [sendingInvoice, setSendingInvoice] = useState(false);
  const [storeMeta, setStoreMeta] = useState({
    storeName: process.env.NEXT_PUBLIC_STORE_NAME || "Crazzycars.pk",
    logoUrl: "",
  });
  const [settings, setSettings] = useState(null);
  const [adminNotifiedSession, setAdminNotifiedSession] = useState(false);
  const [hasLabel, setHasLabel] = useState(false);
  const [courierSettings, setCourierSettings] = useState({});
  const [postexRebook, setPostexRebook] = useState(false);
  const [showPostexForm, setShowPostexForm] = useState(false);
  const [postexHandling, setPostexHandling] = useState("Normal");
  const [postexCodAmount, setPostexCodAmount] = useState(0);
  const [postexWeight, setPostexWeight] = useState(0.5);
  const [postexPieces, setPostexPieces] = useState(1);
  const [postexRemarks, setPostexRemarks] = useState(
    "Call customer before delivery. Do not leave parcel unattended."
  );
  const [bookingPostex, setBookingPostex] = useState(false);
  const [postexError, setPostexError] = useState("");
  const [postexSuccess, setPostexSuccess] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/orders/${orderId}`, { credentials: "include" });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || "Could not load order.");
        setOrder(null);
        return;
      }
      setOrder(json.order);
      setTrackingCarrier(json.order?.courier || json.order?.tracking?.carrier || "Postex");
      setTrackingNumber(json.order?.trackingNumber || json.order?.tracking?.number || "");
      setTrackingUrl(json.order?.trackingUrl || json.order?.tracking?.url || "");
      setHasLabel(Boolean(json.order?.hasPostexLabel));
      setPostexSuccess("");
      setPostexError("");
      setLiveTracking(null);
    } catch {
      setError("Network error.");
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    load();
  }, [load]);

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
      const total = Math.max(0, Number(order.pricing?.total ?? order.total ?? 0));
      const prepaid = isPrepaidOrder(order);
      setPostexCodAmount(prepaid ? 0 : Math.round(total));
      setPostexPieces(order.items?.length || orderItemCount(order) || 1);
      const grams = Number(order.pricing?.totalWeightGrams) || 0;
      const weightKg = grams > 0 ? Math.round((grams / 1000) * 100) / 100 : 0.5;
      setPostexWeight(Math.max(0.5, weightKg));
    }
  }, [order]);

  const notifyAdminOnWhatsApp = useCallback(
    async (isAuto = false) => {
      if (!order) return false;
      const adminPhone = getAdminWhatsAppNumber(settings);
      if (!adminPhone) {
        if (!isAuto) toast.error("Set WhatsApp number in Settings → WhatsApp.");
        return false;
      }

      let extras = {};
      try {
        const res = await fetch(`/api/orders/${order.id}/wa-links`, { credentials: "include" });
        const json = await res.json();
        if (json.success) {
          extras = {
            confirmUrl: json.confirmUrl,
            cancelUrl: json.cancelUrl,
          };
        }
      } catch {
        /* links optional */
      }

      const msg = getAdminNotifyMessage(order, settings || {}, extras);
      if (!msg) {
        if (!isAuto) toast.error("Admin new-order WhatsApp template is disabled.");
        return false;
      }

      const imageUrls = (order.items || []).map((i) => i.image).filter(Boolean);
      const result = await openWhatsAppWithOptionalImage(adminPhone, msg, imageUrls);
      if (!result.ok) {
        if (!isAuto) toast.error("Could not open WhatsApp.");
        return false;
      }
      try {
        sessionStorage.setItem(adminNotifyStorageKey(order.id), "1");
      } catch {
        /* ignore */
      }
      setAdminNotifiedSession(true);
      if (!isAuto) {
        toast.success("WhatsApp opened — tap Confirm/Cancel links in the message.");
      }
      return true;
    },
    [order, settings]
  );

  useEffect(() => {
    if (!order?.id || !settings) return;
    let already = false;
    try {
      already = Boolean(sessionStorage.getItem(adminNotifyStorageKey(order.id)));
    } catch {
      already = false;
    }
    if (already) {
      setAdminNotifiedSession(true);
      return;
    }
    const status = String(order.orderStatus || "").toLowerCase();
    if (status === "pending") {
      notifyAdminOnWhatsApp(true);
    }
  }, [order?.id, order?.orderStatus, settings, notifyAdminOnWhatsApp]);

  function printInvoice() {
    requestAnimationFrame(() => {
      window.print();
    });
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

  async function sendInvoiceEmail() {
    setSendingInvoice(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/send-invoice`, {
        method: "POST",
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error || "Failed to send invoice email.");
        return;
      }
      toast.success(`Invoice sent to ${order?.customer?.email || "customer"} (logged).`);
    } catch {
      toast.error("Network error.");
    } finally {
      setSendingInvoice(false);
    }
  }

  async function fetchLivePostexStatus(number) {
    const id = String(number || "").trim();
    if (!id) return null;
    setLiveTrackingLoading(true);
    try {
      const res = await fetch(`/api/postex/track?trackingNumber=${encodeURIComponent(id)}`, {
        credentials: "include",
      });
      const json = await res.json();
      if (json.success) {
        setLiveTracking(json);
        return json;
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

  async function saveTracking() {
    const num = String(trackingNumber || "").trim();
    if (!num) {
      toast.error("Enter a tracking number.");
      return;
    }

    const isPostex = String(trackingCarrier || "").toLowerCase() === "postex";
    if (isPostex) {
      const verified = await fetchLivePostexStatus(num);
      if (!verified) {
        toast.error("Postex could not verify this tracking number.");
        return;
      }
    }

    const url =
      String(trackingUrl || "").trim() ||
      storefrontTrackingUrl(num) ||
      (isPostex ? postexPublicTrackingUrl(num) : "");

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
      if (isPostex) await fetchLivePostexStatus(num);
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
      (String(trackingCarrier).toLowerCase() === "postex"
        ? postexPublicTrackingUrl(trackingNumber)
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
      const prepaid = isPrepaidOrder(order);
      const res = await fetch("/api/postex/create-shipment", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id || order._id,
          rebook: postexRebook,
          handling: postexHandling,
          weight: postexWeight,
          pieces: postexPieces,
          remarks: postexRemarks,
          pickupAddressCode: pickupCode,
          paymentMethod: prepaid ? "Prepaid" : "COD",
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
      <div className="mx-auto max-w-6xl space-y-4">
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
  const hasTracking = Boolean(order.trackingNumber || order.tracking?.number || trackingNumber);
  const orderPrepaid = isPrepaidOrder(order);
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
            setPostexRebook(false);
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
              {pmLower.includes("cod") || pmLower.includes("cash")
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
                COD Amount (Rs.)
              </label>
              <input
                type="number"
                value={postexCodAmount}
                disabled
                readOnly
                title="COD is locked to the order total. Edit the order total first if you need a different amount."
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  border: "1px solid #E5E7EB",
                  borderRadius: 6,
                  fontSize: 13,
                  background: "#F9FAFB",
                  color: "#6B7280",
                  cursor: "not-allowed",
                }}
              />
              <p style={{ margin: "6px 0 0", fontSize: 11, color: "#6B7280" }}>
                Locked to order total. Update the order pricing first if COD must change.
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
    <div className="mx-auto max-w-6xl">
      <div className="print:hidden">
        <Link href="/orders" className="mb-3 inline-block text-sm font-medium text-[#1d6fb8] hover:underline">
          ← Orders
        </Link>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 24,
            paddingBottom: 16,
            borderBottom: "1px solid #e5e7eb",
            flexWrap: "wrap",
            gap: 16,
          }}
          className="dark:border-slate-700"
        >
          <div>
            <h1
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: "#111827",
                margin: "0 0 4px",
              }}
              className="dark:text-white"
            >
              Order #{order.orderNumber}
            </h1>
            <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }} className="dark:text-slate-400">
              {placedAt}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={printInvoice}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
            >
              Print Invoice
            </button>
            <button
              type="button"
              onClick={printPackingSlip}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
            >
              Print Packing Slip
            </button>
            <button
              type="button"
              disabled={sendingInvoice}
              onClick={sendInvoiceEmail}
              className="rounded-lg bg-[#1d6fb8] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#185f9e] disabled:opacity-60"
            >
              {sendingInvoice ? "Sending..." : "Send Invoice Email"}
            </button>
            <OrderWhatsAppButton order={order} settings={settings} />
            <button
              type="button"
              onClick={() => notifyAdminOnWhatsApp(false)}
              title={
                adminNotifiedSession
                  ? "Admin notification sent this session"
                  : "Send new-order alert to admin WhatsApp"
              }
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
              style={{
                background: adminNotifiedSession ? "#f0fdf4" : undefined,
                borderColor: adminNotifiedSession ? "#86efac" : undefined,
              }}
            >
              📱 Notify Admin on WhatsApp
            </button>
          </div>
        </div>

        <div
          className="grid grid-cols-1 gap-5 items-start lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]"
        >
          <div className="min-w-0 space-y-5">
            <OrderInformationCard order={order} />
            <ShippingDetailsCard order={order} orderId={orderId} onUpdated={setOrder} />

            <OrderItemsEditor order={order} onUpdated={setOrder} />

            <InternalNotes order={order} onUpdated={setOrder} />
          </div>

          <div className="min-w-0 space-y-6">
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

            <OrderStatusCard order={order} onUpdated={setOrder} />
            <PaymentStatusCard order={order} onUpdated={setOrder} />

            <PaymentInformationSection order={order} orderId={orderId} onRefunded={load} />

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                <span aria-hidden>📦</span>
                Shipping &amp; Tracking
              </h2>

              {!hasTracking ? (
                <div
                  className="mt-3 rounded-lg border border-slate-200 p-4 dark:border-slate-600"
                  style={{ background: "#FAFAFA" }}
                >
                  <p className="text-sm font-bold text-slate-900 dark:text-white">📦 Book Postex Shipment</p>
                  {postexBookingSection}
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
                      <p className="mt-1">
                        Live status: <strong>{liveTracking.status}</strong>
                      </p>
                    ) : (
                      <button
                        type="button"
                        className="mt-1 text-xs text-[#1d6fb8] hover:underline"
                        onClick={() =>
                          fetchLivePostexStatus(order.trackingNumber || order.tracking?.number || trackingNumber)
                        }
                      >
                        Refresh Postex status
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
                        postexPublicTrackingUrl(order.trackingNumber || trackingNumber)
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-[#1d6fb8] hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800"
                    >
                      Track on Postex →
                    </a>
                    {(hasLabel || order.hasPostexLabel) ? (
                      <button
                        type="button"
                        onClick={openPostexLabel}
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
                          setPostexRebook(true);
                          setShowPostexForm(true);
                          setPostexError("");
                        }
                      }}
                      className="rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900 hover:bg-amber-100"
                    >
                      Re-book
                    </button>
                  </div>

                  {showPostexForm ? postexBookingSection : null}
                </div>
              )}

              <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Manual tracking (other couriers)
                </p>
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Courier</label>
                    <select
                      value={trackingCarrier}
                      onChange={(e) => setTrackingCarrier(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-600 dark:bg-slate-800"
                    >
                      {["Postex", "TCS", "Leopards", "M&P", "Other"].map((c) => (
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
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-600 dark:bg-slate-800"
                      placeholder="Enter tracking number"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={trackingSaving}
                    onClick={saveTracking}
                    className="w-full rounded-lg bg-[#1d6fb8] px-3 py-2 text-sm font-semibold text-white hover:bg-[#185f9e] disabled:opacity-60"
                  >
                    {trackingSaving ? "Saving..." : "Save Tracking"}
                  </button>
                  {hasTracking ? (
                    <button
                      type="button"
                      disabled={sendingTracking}
                      onClick={sendTrackingEmail}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800"
                    >
                      {sendingTracking ? "Sending..." : "Send tracking email"}
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <PrintInvoice order={order} storeName={storeMeta.storeName} logoUrl={storeMeta.logoUrl} />
    </div>
  );
}
