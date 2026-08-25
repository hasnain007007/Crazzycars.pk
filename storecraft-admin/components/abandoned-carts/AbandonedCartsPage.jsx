"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { formatAdminPrice } from "@/lib/currency";
import { getAbandonedCartWhatsAppMessage } from "@/lib/abandonedCart";
import { openWhatsApp } from "@/components/orders/OrderWhatsAppButton";
import { getAdminSettings } from "@/lib/adminSettingsCache";
import { AbandonedCartDetailModal } from "@/components/abandoned-carts/AbandonedCartDetailModal";

function formatWhen(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

const STATUS_TABS = [
  { key: "abandoned", label: "Abandoned" },
  { key: "active", label: "Active" },
  { key: "recovered", label: "Recovered" },
  { key: "dismissed", label: "Dismissed" },
  { key: "all", label: "All" },
];

export function AbandonedCartsPage() {
  const [status, setStatus] = useState("abandoned");
  const [q, setQ] = useState("");
  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState({
    active: 0,
    abandoned: 0,
    recovered: 0,
    dismissed: 0,
    abandonedValue: 0,
  });
  const [settings, setSettings] = useState({
    enabled: true,
    abandonAfterMinutes: 60,
    maxEmailReminders: 2,
    reminderIntervalHours: 24,
    emailAbandonedCart: true,
  });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [waSettings, setWaSettings] = useState(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [viewCart, setViewCart] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        status,
        page: String(page),
        limit: "20",
      });
      if (q.trim()) params.set("q", q.trim());
      const res = await fetch(`/api/abandoned-carts?${params}`, { credentials: "include" });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error || "Failed to load");
        return;
      }
      setRows(json.carts || []);
      if (json.stats) setStats(json.stats);
      if (json.settings) setSettings((s) => ({ ...s, ...json.settings }));
      setTotalPages(json.totalPages || 1);
      setViewCart((prev) => {
        if (!prev) return null;
        const next = (json.carts || []).find((c) => c.id === prev.id);
        return next || prev;
      });
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }, [status, page, q]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    getAdminSettings()
      .then((s) => setWaSettings(s || {}))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!viewCart) return;
    const onKey = (e) => {
      if (e.key === "Escape") setViewCart(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [viewCart]);

  async function patchAction(id, action) {
    try {
      const res = await fetch("/api/abandoned-carts", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error || "Action failed");
        return;
      }
      toast.success("Updated");
      if (action === "dismiss" || action === "reopen") setViewCart(null);
      load();
    } catch {
      toast.error("Network error");
    }
  }

  async function sendEmail(id) {
    try {
      const res = await fetch(`/api/abandoned-carts/${id}/remind`, {
        method: "POST",
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error || "Email failed");
        return;
      }
      toast.success("Recovery email sent");
      load();
    } catch {
      toast.error("Network error");
    }
  }

  async function sendWhatsApp(cart) {
    const phone = cart?.customer?.phone;
    if (!phone) {
      toast.error("No phone number on this cart");
      return;
    }
    const message = getAbandonedCartWhatsAppMessage(cart, waSettings || {});
    const ok = openWhatsApp(phone, message);
    if (!ok) {
      toast.error("Could not open WhatsApp");
      return;
    }
    await patchAction(cart.id, "log-whatsapp");
  }

  async function saveSettings() {
    setSavingSettings(true);
    try {
      const res = await fetch("/api/abandoned-carts", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error || "Save failed");
        return;
      }
      toast.success("Settings saved");
    } catch {
      toast.error("Network error");
    } finally {
      setSavingSettings(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Abandoned carts</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Recover shoppers who added items but did not finish checkout. Emails run hourly via cron;
          WhatsApp opens a ready message for you to send.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Abandoned", value: stats.abandoned, tone: "text-amber-700" },
          {
            label: "Abandoned value",
            value: formatAdminPrice(stats.abandonedValue || 0),
            tone: "text-slate-900",
          },
          { label: "Active carts", value: stats.active, tone: "text-sky-700" },
          { label: "Recovered", value: stats.recovered, tone: "text-emerald-700" },
        ].map((c) => (
          <div
            key={c.label}
            className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{c.label}</p>
            <p className={`mt-1 text-xl font-bold ${c.tone} dark:text-white`}>{c.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Recovery settings</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
            <input
              type="checkbox"
              checked={settings.enabled !== false}
              onChange={(e) => setSettings((s) => ({ ...s, enabled: e.target.checked }))}
            />
            System enabled
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
            <input
              type="checkbox"
              checked={settings.emailAbandonedCart !== false}
              onChange={(e) => setSettings((s) => ({ ...s, emailAbandonedCart: e.target.checked }))}
            />
            Auto email reminders
          </label>
          <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
            Mark abandoned after (minutes)
            <input
              type="number"
              min={15}
              value={settings.abandonAfterMinutes ?? 60}
              onChange={(e) =>
                setSettings((s) => ({ ...s, abandonAfterMinutes: Number(e.target.value) || 60 }))
              }
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800"
            />
          </label>
          <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
            Max email reminders
            <input
              type="number"
              min={0}
              max={5}
              value={settings.maxEmailReminders ?? 2}
              onChange={(e) =>
                setSettings((s) => ({ ...s, maxEmailReminders: Number(e.target.value) || 0 }))
              }
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800"
            />
          </label>
        </div>
        <button
          type="button"
          disabled={savingSettings}
          onClick={saveSettings}
          className="mt-3 rounded-lg bg-[#1d6fb8] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#185f9e] disabled:opacity-60"
        >
          {savingSettings ? "Saving…" : "Save settings"}
        </button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {STATUS_TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => {
                setPage(1);
                setStatus(t.key);
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                status === t.key
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                  : "border border-slate-200 bg-white text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            load();
          }}
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, phone, email…"
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800"
          />
          <button
            type="submit"
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold dark:border-slate-600 dark:bg-slate-800"
          >
            Search
          </button>
        </form>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-800/80">
              <tr>
                <th className="px-4 py-3 font-semibold">Customer</th>
                <th className="px-4 py-3 font-semibold">Items</th>
                <th className="px-4 py-3 font-semibold">Total</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Last activity</th>
                <th className="px-4 py-3 font-semibold">Reminders</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    Loading…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    No carts in this view yet. Carts appear after shoppers add products (and ideally enter
                    phone/email on checkout).
                  </td>
                </tr>
              ) : (
                rows.map((cart) => (
                  <tr key={cart.id} className="align-top">
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setViewCart(cart)}
                        className="text-left font-semibold text-slate-900 hover:text-[#1d6fb8] hover:underline dark:text-white"
                      >
                        {cart.customer?.name || "Guest"}
                      </button>
                      <div className="text-xs text-slate-500">{cart.customer?.phone || "—"}</div>
                      <div className="text-xs text-slate-500">{cart.customer?.email || "—"}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs text-slate-700 dark:text-slate-300">
                        {(cart.items || []).slice(0, 3).map((i) => (
                          <div key={`${i.productId}-${i.variantId}-${i.name}`}>
                            {i.name} × {i.quantity}
                          </div>
                        ))}
                        {(cart.items || []).length > 3 ? (
                          <div className="text-slate-400">+{cart.items.length - 3} more</div>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-semibold">{formatAdminPrice(cart.subtotal || 0)}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold capitalize dark:bg-slate-800">
                        {cart.status}
                      </span>
                      {cart.convertedOrderNumber ? (
                        <div className="mt-1 text-xs text-emerald-600">→ {cart.convertedOrderNumber}</div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      <div>{formatWhen(cart.lastActivityAt)}</div>
                      {cart.abandonedAt ? <div>Abandoned {formatWhen(cart.abandonedAt)}</div> : null}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      Email: {cart.emailReminderCount || 0}
                      <div>{(cart.reminders || []).length} log entries</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1.5">
                        <button
                          type="button"
                          onClick={() => setViewCart(cart)}
                          className="rounded-md bg-slate-900 px-2 py-1 text-[11px] font-semibold text-white dark:bg-white dark:text-slate-900"
                        >
                          View
                        </button>
                        {cart.customer?.phone ? (
                          <button
                            type="button"
                            onClick={() => sendWhatsApp(cart)}
                            className="rounded-md bg-[#25D366] px-2 py-1 text-[11px] font-semibold text-white"
                          >
                            WhatsApp
                          </button>
                        ) : null}
                        {cart.customer?.email ? (
                          <button
                            type="button"
                            onClick={() => sendEmail(cart.id)}
                            className="rounded-md bg-[#1d6fb8] px-2 py-1 text-[11px] font-semibold text-white"
                          >
                            Send email
                          </button>
                        ) : null}
                        <a
                          href={cart.recoverUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-md border border-slate-200 px-2 py-1 text-center text-[11px] font-semibold text-slate-700 dark:border-slate-600 dark:text-slate-200"
                        >
                          Open recover link
                        </a>
                        {cart.status !== "dismissed" ? (
                          <button
                            type="button"
                            onClick={() => patchAction(cart.id, "dismiss")}
                            className="rounded-md border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-600 dark:border-slate-600"
                          >
                            Dismiss
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => patchAction(cart.id, "reopen")}
                            className="rounded-md border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-600 dark:border-slate-600"
                          >
                            Reopen
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 ? (
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-xs dark:border-slate-700">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded border border-slate-200 px-2 py-1 disabled:opacity-40 dark:border-slate-600"
            >
              Prev
            </button>
            <span>
              Page {page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded border border-slate-200 px-2 py-1 disabled:opacity-40 dark:border-slate-600"
            >
              Next
            </button>
          </div>
        ) : null}
      </div>

      {viewCart ? (
        <AbandonedCartDetailModal
          cart={viewCart}
          onClose={() => setViewCart(null)}
          onWhatsApp={sendWhatsApp}
          onEmail={sendEmail}
          onDismiss={(id) => patchAction(id, "dismiss")}
          onReopen={(id) => patchAction(id, "reopen")}
        />
      ) : null}
    </div>
  );
}
