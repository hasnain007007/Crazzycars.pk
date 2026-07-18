"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { orderStatusBadgeClass, paymentStatusBadgeClass } from "@/lib/orderUi";
import { printHtmlWithIframe } from "../orders/printOrderDocuments";
import { formatAdminPrice } from "@/lib/currency";

function formatMoney(n) {
  return formatAdminPrice(n);
}

function formatAddr(a) {
  if (!a) return "—";
  const street = a.street || a.address || a.line1 || "";
  const street2 = a.street2 || a.line2 || "";
  const province = a.province || a.state || "";
  const zip = a.zip || a.postcode || "";
  if (!street && !a.city && !a.area) return "—";
  const country = a.country?.trim() || "Pakistan";
  return [street, street2, a.area, a.city, province, zip, country].filter(Boolean).join(", ");
}

function formatPhoneDisplay(phone) {
  const p = String(phone || "").trim();
  if (!p) return "—";
  if (p.startsWith("+")) return p;
  if (p.startsWith("92")) return `+${p}`;
  if (p.startsWith("0")) return `+92 ${p.slice(1)}`;
  return `+92 ${p}`;
}

function initials(n) {
  const p = String(n || "A").trim().split(/\s+/);
  return ((p[0]?.[0] || "A") + (p[1]?.[0] || "")).toUpperCase();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildCustomerStatementHtml(customer, orders, options = {}) {
  const { storeName = `${process.env.NEXT_PUBLIC_STORE_NAME || 'Crazzycars.pk'}`, logoUrl = "" } = options;
  const safeOrders = Array.isArray(orders) ? orders : [];
  const totalSpent = safeOrders.reduce((sum, o) => sum + (o?.pricing?.total || o?.total || 0), 0);
  const avgOrderValue = safeOrders.length ? Math.round(totalSpent / safeOrders.length) : 0;
  const orderRows = safeOrders
    .map((order) => {
      const amount = order?.pricing?.total || order?.total || 0;
      const paymentStatus = String(order?.paymentStatus || "unpaid").toLowerCase();
      const paymentClass =
        paymentStatus === "paid" ? "status-paid" : paymentStatus === "cancelled" ? "status-cancelled" : "status-pending";
      return `
    <tr>
      <td>${escapeHtml(order?.orderNumber || order?._id || "-")}</td>
      <td>${order?.createdAt ? new Date(order.createdAt).toLocaleDateString() : "-"}</td>
      <td>${order?.items?.length || order?.itemCount || 0} items</td>
      <td>${formatAdminPrice(Number(amount || 0))}</td>
      <td>${escapeHtml(order?.orderStatus || "pending")}</td>
      <td class="${paymentClass}">${escapeHtml(order?.paymentStatus || "unpaid")}</td>
    </tr>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Customer Statement - ${escapeHtml(customer?.name || "Customer")}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 13px; color: #333; padding: 40px; }
    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #009688; padding-bottom: 20px; }
    .header img { max-height: 60px; object-fit: contain; margin-bottom: 10px; }
    .header h1 { font-size: 24px; color: #009688; margin-bottom: 5px; }
    .header h2 { font-size: 16px; color: #666; font-weight: normal; }
    .customer-info { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; background: #f9f9f9; padding: 20px; border-radius: 8px; }
    .customer-info h3 { font-size: 14px; color: #009688; margin-bottom: 10px; text-transform: uppercase; }
    .customer-info p { margin-bottom: 5px; color: #555; }
    .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 30px; }
    .stat-box { background: #f0faf9; border: 1px solid #009688; border-radius: 8px; padding: 15px; text-align: center; }
    .stat-box .value { font-size: 20px; font-weight: bold; color: #009688; }
    .stat-box .label { font-size: 11px; color: #666; text-transform: uppercase; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    th { background: #009688; color: white; padding: 10px 12px; text-align: left; font-size: 12px; }
    td { padding: 10px 12px; border-bottom: 1px solid #eee; color: #444; }
    tr:nth-child(even) td { background: #f9f9f9; }
    .total-row td { font-weight: bold; background: #f0faf9 !important; border-top: 2px solid #009688; font-size: 14px; }
    .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; color: #999; font-size: 11px; }
    .status-paid { color: #16a34a; font-weight: bold; }
    .status-pending { color: #ca8a04; }
    .status-cancelled { color: #dc2626; }
    @media print { body { padding: 20px; } .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="header">
    ${logoUrl ? `<img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(storeName)}" />` : ""}
    <h1>${escapeHtml(storeName)}</h1>
    <h2>Customer Account Statement</h2>
    <p style="color:#666; margin-top:8px">Generated on: ${new Date().toLocaleDateString("en-PK", { year: "numeric", month: "long", day: "numeric" })}</p>
  </div>
  <div class="customer-info">
    <div>
      <h3>Customer Details</h3>
      <p><strong>${escapeHtml(customer?.name || "N/A")}</strong></p>
      <p>Email: ${escapeHtml(customer?.email || "N/A")}</p>
      <p>Phone: ${escapeHtml(formatPhoneDisplay(customer?.phone))}</p>
      <p>Member since: ${customer?.createdAt ? new Date(customer.createdAt).toLocaleDateString() : "-"}</p>
    </div>
    <div>
      <h3>Address</h3>
      <p>${escapeHtml(customer?.address?.street || "")}</p>
      <p>${escapeHtml([customer?.address?.city, customer?.address?.state].filter(Boolean).join(" "))}</p>
      <p>${escapeHtml(customer?.address?.country || "Pakistan")}</p>
    </div>
  </div>
  <div class="stats">
    <div class="stat-box"><div class="value">${safeOrders.length}</div><div class="label">Total Orders</div></div>
    <div class="stat-box"><div class="value">${formatAdminPrice(totalSpent)}</div><div class="label">Total Spent</div></div>
    <div class="stat-box"><div class="value">${formatAdminPrice(avgOrderValue)}</div><div class="label">Avg Order Value</div></div>
  </div>
  <h3 style="margin-bottom:15px; color:#333">Order History</h3>
  ${
    safeOrders.length > 0
      ? `<table>
          <thead><tr><th>Order #</th><th>Date</th><th>Items</th><th>Amount</th><th>Status</th><th>Payment</th></tr></thead>
          <tbody>
            ${orderRows}
            <tr class="total-row">
              <td colspan="3">TOTAL</td>
              <td>${formatAdminPrice(totalSpent)}</td>
              <td colspan="2"></td>
            </tr>
          </tbody>
        </table>`
      : '<p style="color:#999; text-align:center; padding:20px">No orders found</p>'
  }
  <div class="footer">
    <p>Thank you for being a valued customer of ${escapeHtml(storeName)}</p>
    <p style="margin-top:5px">This statement was generated automatically</p>
  </div>
</body>
</html>`;
}

export function CustomerDetailPage({ customerId }) {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [sendEmailNotif, setSendEmailNotif] = useState(true);
  const [resettingPassword, setResettingPassword] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/customers/${customerId}`, { credentials: "include" });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error || "Not found");
        setData(null);
        return;
      }
      setData(json);
    } catch {
      toast.error("Network error");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    load();
  }, [load]);

  async function setStatus(next) {
    const ok = window.confirm(next === "blocked" ? "Block this customer?" : "Activate this customer?");
    if (!ok) return;
    try {
      const res = await fetch(`/api/customers/${customerId}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: next,
          isActive: next === "active",
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error || "Failed");
        return;
      }
      toast.success("Updated");
      load();
    } catch {
      toast.error("Network error");
    }
  }

  async function handleResetPassword() {
    if (!newPassword || newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setResettingPassword(true);
    try {
      const res = await fetch(`/api/customers/${customerId}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          newPassword,
          sendEmail: sendEmailNotif,
        }),
      });
      const respJson = await res.json();
      if (respJson.success) {
        toast.success("Password reset successfully!");
        setShowResetPassword(false);
        setNewPassword("");
      } else {
        toast.error(respJson.error || "Reset failed");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setResettingPassword(false);
    }
  }

  async function deleteCustomer() {
    const ok = window.confirm("Delete this customer? This cannot be undone. Their orders will remain.");
    if (!ok) return;
    try {
      const res = await fetch(`/api/customers/${customerId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error || "Delete failed");
        return;
      }
      toast.success("Customer deleted");
      router.push("/customers");
      router.refresh();
    } catch {
      toast.error("Network error");
    }
  }

  async function handlePrintStatement() {
    if (!data?.customer) return;
    try {
      const settingsRes = await fetch("/api/settings", { credentials: "include" });
      const settingsData = await settingsRes.json().catch(() => ({}));
      const logoUrl =
        settingsData?.data?.logoUrl ||
        settingsData?.general?.logo?.url ||
        settingsData?.settings?.general?.logo?.url ||
        "";
      const storeName =
        settingsData?.data?.storeName ||
        settingsData?.general?.storeName ||
        settingsData?.settings?.general?.storeName ||
        process.env.NEXT_PUBLIC_APP_NAME ||
        `${process.env.NEXT_PUBLIC_STORE_NAME || 'Crazzycars.pk'}`;
      const statementHtml = buildCustomerStatementHtml(data.customer, data.orders || [], {
        storeName,
        logoUrl,
      });
      printHtmlWithIframe(statementHtml);
    } catch {
      toast.error("Failed to prepare customer statement.");
    }
  }

  if (loading) {
    return <div className="h-64 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />;
  }
  if (!data?.customer) {
    return <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-800">Customer not found.</div>;
  }

  const c = data.customer;
  const s = data.stats || {};
  const orders = data.orders || [];
  const isAccountBlocked =
    c.status === "blocked" || c.status === "inactive" || c.isActive === false;

  return (
    <div className="space-y-6">
      <Link href="/customers" className="text-sm font-medium text-[#1d6fb8] hover:underline">
        ← Customers
      </Link>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[13fr_7fr]">
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="flex gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#1d6fb8] text-lg font-bold text-white">
                {initials(c.name)}
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">{c.name}</h1>
                <a href={`mailto:${c.email}`} className="text-sm text-[#1d6fb8]">
                  {c.email}
                </a>
                <p className="text-sm text-slate-600 dark:text-slate-300">{formatPhoneDisplay(c.phone)}</p>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{formatAddr(c.address)}</p>
                <p className="mt-2 text-xs text-slate-500">Joined {c.joinedAt ? new Date(c.joinedAt).toLocaleString() : "—"}</p>
              </div>
            </div>
          </div>

          {Array.isArray(c.addresses) && c.addresses.length > 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Saved addresses</h2>
              <ul className="mt-3 space-y-3">
                {c.addresses.map((a, idx) => (
                  <li
                    key={a._id || a.id || idx}
                    className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950/40"
                  >
                    <p className="font-medium text-slate-900 dark:text-white">
                      {a.label || "Address"}
                      {a.isDefault ? (
                        <span className="ml-2 rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-semibold text-white dark:bg-white dark:text-slate-900">
                          Default
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-1 text-slate-600 dark:text-slate-400">{formatAddr(a)}</p>
                    {a.phone ? <p className="mt-1 text-xs text-slate-500">{formatPhoneDisplay(a.phone)}</p> : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Order history</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="border-b text-left text-xs uppercase text-slate-500 dark:border-slate-700">
                  <tr>
                    <th className="py-2 pr-2">Order</th>
                    <th className="py-2 pr-2">Date</th>
                    <th className="py-2 pr-2">Total</th>
                    <th className="py-2 pr-2">Status</th>
                    <th className="py-2">Payment</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-slate-800">
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-500">
                        No orders yet.
                      </td>
                    </tr>
                  ) : (
                    orders.map((o) => (
                      <tr key={o.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                        <td className="py-2 pr-2">
                          <Link href={`/orders/${o.id}`} className="font-mono text-xs text-[#1d6fb8] hover:underline">
                            {o.orderNumber}
                          </Link>
                        </td>
                        <td className="py-2 pr-2 text-slate-600">{o.createdAt ? new Date(o.createdAt).toLocaleDateString() : "—"}</td>
                        <td className="py-2 pr-2 tabular-nums">{formatMoney(o.total)}</td>
                        <td className="py-2 pr-2">
                          <span
                            className={[
                              "rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                              orderStatusBadgeClass(o.orderStatus),
                            ].join(" ")}
                          >
                            {o.orderStatus}
                          </span>
                        </td>
                        <td className="py-2">
                          <span
                            className={[
                              "rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                              paymentStatusBadgeClass(o.paymentStatus),
                            ].join(" ")}
                          >
                            {o.paymentStatus}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {[
              ["Total orders", s.totalOrders],
              ["Total spent", formatMoney(s.totalSpent)],
              ["Avg order", formatMoney(s.avgOrderValue)],
              ["Last order", s.lastOrderDate ? new Date(s.lastOrderDate).toLocaleDateString() : "—"],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <p className="text-xs font-semibold uppercase text-slate-500">{k}</p>
                <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{v}</p>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Account status</h2>
            <p className="mt-2 text-sm text-slate-600">
              Current:{" "}
              <span
                className={!isAccountBlocked ? "font-semibold text-emerald-700" : "font-semibold text-red-700"}
              >
                {isAccountBlocked ? "blocked" : "active"}
              </span>
            </p>
            <div className="mt-4 flex gap-2">
              {!isAccountBlocked ? (
                <button
                  type="button"
                  onClick={() => setStatus("blocked")}
                  className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700"
                >
                  Block customer
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setStatus("active")}
                  className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  Unblock customer
                </button>
              )}
            </div>
          </div>

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
                justifyContent: "space-between",
                alignItems: "center",
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
                Reset Password
              </h3>
              <button
                type="button"
                onClick={() => setShowResetPassword((p) => !p)}
                style={{
                  padding: "6px 14px",
                  background: showResetPassword ? "#f3f4f6" : "#FEF3C7",
                  color: showResetPassword ? "#374151" : "#92400E",
                  border: "1px solid",
                  borderColor: showResetPassword ? "#e5e7eb" : "#FCD34D",
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {showResetPassword ? "Cancel" : "🔐 Reset Password"}
              </button>
            </div>

            {showResetPassword ? (
              <div style={{ padding: 20 }}>
                <p
                  style={{
                    fontSize: 13,
                    color: "#6b7280",
                    margin: "0 0 16px",
                    lineHeight: 1.5,
                  }}
                  className="dark:text-slate-400"
                >
                  Set a new password for this customer. They will need to use this to login.
                </p>

                <div style={{ marginBottom: 14 }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#374151",
                      marginBottom: 6,
                    }}
                    className="dark:text-slate-300"
                  >
                    New Password
                  </label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      type="text"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min 6 characters"
                      autoComplete="new-password"
                      style={{
                        flex: 1,
                        padding: "9px 12px",
                        border: "1px solid #e5e7eb",
                        borderRadius: 6,
                        fontSize: 14,
                        color: "#111827",
                        outline: "none",
                        fontFamily: "monospace",
                      }}
                      className="dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
                        let pwd = "";
                        for (let i = 0; i < 10; i++) {
                          pwd += chars.charAt(Math.floor(Math.random() * chars.length));
                        }
                        setNewPassword(pwd);
                      }}
                      style={{
                        padding: "9px 14px",
                        background: "#f3f4f6",
                        border: "1px solid #e5e7eb",
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 600,
                        color: "#374151",
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      }}
                      className="dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                    >
                      Generate
                    </button>
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 16,
                    padding: "10px 14px",
                    background: "#f9fafb",
                    borderRadius: 8,
                    border: "1px solid #e5e7eb",
                  }}
                  className="dark:border-slate-600 dark:bg-slate-800/50"
                >
                  <label
                    style={{
                      position: "relative",
                      display: "inline-block",
                      width: 36,
                      height: 20,
                      cursor: "pointer",
                      flexShrink: 0,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={sendEmailNotif}
                      onChange={(e) => setSendEmailNotif(e.target.checked)}
                      style={{ display: "none" }}
                    />
                    <span
                      style={{
                        position: "absolute",
                        inset: 0,
                        background: sendEmailNotif ? "#009688" : "#d1d5db",
                        borderRadius: 99,
                        transition: "background 0.2s",
                      }}
                    />
                    <span
                      style={{
                        position: "absolute",
                        top: 2,
                        left: sendEmailNotif ? 18 : 2,
                        width: 16,
                        height: 16,
                        background: "#fff",
                        borderRadius: "50%",
                        transition: "left 0.2s",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                      }}
                    />
                  </label>
                  <div>
                    <p
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#111827",
                        margin: "0 0 2px",
                      }}
                      className="dark:text-white"
                    >
                      Send email notification
                    </p>
                    <p style={{ fontSize: 11, color: "#6b7280", margin: 0 }} className="dark:text-slate-400">
                      Send new password to customer email
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleResetPassword}
                  disabled={resettingPassword || !newPassword}
                  style={{
                    width: "100%",
                    padding: "10px",
                    background: resettingPassword || !newPassword ? "#9ca3af" : "#dc2626",
                    color: "#fff",
                    border: "none",
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: resettingPassword || !newPassword ? "not-allowed" : "pointer",
                    letterSpacing: "0.04em",
                  }}
                >
                  {resettingPassword ? "Resetting..." : "🔐 Reset Password"}
                </button>
              </div>
            ) : null}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <button
              type="button"
              onClick={handlePrintStatement}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            >
              Print Customer Statement
            </button>
          </div>

          <div className="rounded-xl border border-red-200 bg-red-50 p-4 shadow-sm dark:border-red-900/40 dark:bg-red-950/20">
            <h2 className="text-sm font-semibold text-red-700 dark:text-red-300">Delete Customer</h2>
            <p className="mt-2 text-sm text-red-700/90 dark:text-red-200/90">
              This will permanently delete the customer and cannot be undone. Their orders will remain.
            </p>
            <button
              type="button"
              onClick={deleteCustomer}
              className="mt-4 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700"
            >
              Delete Customer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
