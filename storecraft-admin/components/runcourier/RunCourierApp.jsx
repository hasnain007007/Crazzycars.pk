"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  RUN_COURIER_APIS,
  RUN_COURIER_PRODUCT_TYPES,
  RUN_COURIER_SERVICE_TYPES,
} from "@/lib/runcourier";

const TABS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "booking", label: "Add Booking" },
  { id: "labels", label: "Print Labels" },
  { id: "cancel", label: "Cancel Shipments" },
  { id: "settings", label: "Settings" },
];

function downloadLabel(url) {
  if (!url) return;
  const w = window.open(url, "_blank", "noopener,noreferrer");
  if (!w) {
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
}

function ApiSearchSelect({ carriers = RUN_COURIER_APIS, value, onChange, className = "" }) {
  const rootRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const list = useMemo(() => {
    const base = Array.isArray(carriers) && carriers.length ? carriers : RUN_COURIER_APIS;
    const q = String(query || "")
      .trim()
      .toLowerCase();
    if (!q) return base;
    return base.filter((c) => String(c).toLowerCase().includes(q));
  }, [carriers, query]);

  useEffect(() => {
    function onDoc(e) {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <input
        type="text"
        autoComplete="off"
        className="h-8 w-full min-w-[8rem] rounded border border-slate-300 bg-white px-2 text-xs dark:border-slate-600 dark:bg-slate-900"
        placeholder={value || "Select API…"}
        value={open ? query : value || ""}
        onFocus={() => {
          setOpen(true);
          setQuery("");
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
      />
      {open ? (
        <ul className="absolute z-30 mt-1 max-h-48 w-full overflow-auto rounded border border-slate-200 bg-white shadow-lg dark:border-slate-600 dark:bg-slate-900">
          {list.map((c) => (
            <li key={c}>
              <button
                type="button"
                className={`block w-full px-2 py-1.5 text-left text-xs hover:bg-blue-50 dark:hover:bg-slate-800 ${
                  c === value ? "bg-blue-100 font-semibold dark:bg-slate-700" : ""
                }`}
                onClick={() => {
                  onChange(c);
                  setOpen(false);
                }}
              >
                {c}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export default function RunCourierApp() {
  const [tab, setTab] = useState("dashboard");
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState("unbooked");
  const [selected, setSelected] = useState(() => new Set());
  const [busy, setBusy] = useState(false);
  const [carriers, setCarriers] = useState(RUN_COURIER_APIS);
  const [defaultApi, setDefaultApi] = useState("Auto");
  const [rowApi, setRowApi] = useState({});
  const [settingsForm, setSettingsForm] = useState({
    runCourierApiKey: "",
    runCourierBaseUrl: "https://portal.runcourier.com",
    runCourierDefaultApi: "Auto",
    runCourierProductType: "Overnight",
    runCourierServiceType: "Overnight",
    runCourierOriginCity: "Gujranwala",
    runCourierEnabled: true,
  });

  async function loadOrders(nextMode = mode) {
    setLoading(true);
    try {
      const p = new URLSearchParams({ mode: nextMode, limit: "80" });
      if (search.trim()) p.set("search", search.trim());
      const res = await fetch(`/api/runcourier/orders?${p}`, { credentials: "include" });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error || "Could not load orders");
        return;
      }
      setOrders(json.orders || []);
      setTotal(json.total || 0);
      if (json.defaultApi) setDefaultApi(json.defaultApi);
      setSelected(new Set());
    } catch {
      toast.error("Network error loading orders");
    } finally {
      setLoading(false);
    }
  }

  async function loadCarriers() {
    try {
      const res = await fetch("/api/runcourier/carriers", { credentials: "include" });
      const json = await res.json();
      if (json.carriers?.length) setCarriers(json.carriers);
    } catch {
      /* keep defaults */
    }
  }

  async function loadSettings() {
    try {
      const res = await fetch("/api/settings", { credentials: "include" });
      const json = await res.json();
      if (!json.success) return;
      const c = json.settings?.courier || json.data?.courier || {};
      setSettingsForm((prev) => ({
        ...prev,
        runCourierApiKey: c.runCourierApiKey || "",
        runCourierBaseUrl: c.runCourierBaseUrl || prev.runCourierBaseUrl,
        runCourierDefaultApi: c.runCourierDefaultApi || "Auto",
        runCourierProductType: c.runCourierProductType || "Overnight",
        runCourierServiceType: c.runCourierServiceType || "Overnight",
        runCourierOriginCity: c.runCourierOriginCity || c.originCity || "Gujranwala",
        runCourierEnabled: c.runCourierEnabled !== false,
      }));
      setDefaultApi(c.runCourierDefaultApi || "Auto");
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    loadCarriers();
    loadSettings();
  }, []);

  useEffect(() => {
    if (tab === "booking") {
      setMode("unbooked");
      loadOrders("unbooked");
    } else if (tab === "labels" || tab === "cancel") {
      setMode("booked");
      loadOrders("booked");
    } else if (tab === "dashboard") {
      loadOrders("unbooked");
    } else if (tab === "settings") {
      loadSettings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  function toggleId(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function bookOne(orderId, selectedApi) {
    const res = await fetch("/api/runcourier/create-shipment", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId,
        selectedApi: selectedApi || defaultApi || "Auto",
      }),
    });
    const json = await res.json();
    if (res.ok && json.success) {
      if (json.labelDownloadUrl) downloadLabel(json.labelDownloadUrl);
      return { ok: true, json };
    }
    return { ok: false, error: json.error || "Failed" };
  }

  async function bookSelected() {
    const ids = [...selected];
    if (!ids.length) return;
    if (!window.confirm(`Book ${ids.length} order(s) with Run Courier?`)) return;
    setBusy(true);
    let ok = 0;
    let fail = 0;
    for (const id of ids) {
      const api = rowApi[id] || defaultApi;
      const r = await bookOne(id, api);
      if (r.ok) ok += 1;
      else fail += 1;
    }
    if (ok) toast.success(`Booked ${ok}`);
    if (fail) toast.error(`${fail} failed`);
    setBusy(false);
    loadOrders("unbooked");
  }

  async function cancelOne(orderId, trackingNumber) {
    const res = await fetch("/api/runcourier/cancel", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, trackingNumber }),
    });
    const json = await res.json();
    if (json.success) toast.success("Cancelled");
    else toast.error(json.error || "Cancel failed");
    loadOrders("booked");
  }

  async function saveSettings() {
    setBusy(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courier: settingsForm }),
      });
      const json = await res.json();
      if (json.success) toast.success("Run Courier settings saved");
      else toast.error(json.error || "Save failed");
    } catch {
      toast.error("Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1 border-b border-slate-200 dark:border-slate-700">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-3 py-2 text-sm font-semibold ${
              tab === t.id
                ? "border-b-2 border-emerald-600 text-emerald-700"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "dashboard" ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            <p className="text-xs font-semibold uppercase text-slate-500">Ready to book</p>
            <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{total}</p>
            <button
              type="button"
              className="mt-2 text-xs font-semibold text-emerald-700 hover:underline"
              onClick={() => setTab("booking")}
            >
              Open booking →
            </button>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            <p className="text-xs font-semibold uppercase text-slate-500">Select API</p>
            <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{defaultApi}</p>
            <p className="mt-1 text-xs text-slate-500">Default carrier from settings</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            <p className="text-xs font-semibold uppercase text-slate-500">Carriers</p>
            <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">
              {carriers.slice(0, 6).join(", ")}
              {carriers.length > 6 ? "…" : ""}
            </p>
            <Link href="/settings" className="mt-2 inline-block text-xs font-semibold text-emerald-700 hover:underline">
              Settings →
            </Link>
          </div>
        </div>
      ) : null}

      {tab === "booking" || tab === "labels" || tab === "cancel" ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search order #, name, phone…"
              className="h-9 min-w-[14rem] rounded-lg border border-slate-300 px-3 text-sm dark:border-slate-600 dark:bg-slate-900"
            />
            <button
              type="button"
              onClick={() => loadOrders(mode)}
              className="h-9 rounded-lg border border-slate-300 px-3 text-sm font-semibold dark:border-slate-600"
            >
              Search
            </button>
            {tab === "booking" ? (
              <button
                type="button"
                disabled={busy || !selected.size}
                onClick={bookSelected}
                className="h-9 rounded-lg bg-emerald-600 px-3 text-sm font-bold text-white disabled:opacity-50"
              >
                Book selected ({selected.size})
              </button>
            ) : null}
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <tr>
                  <th className="px-2 py-2">
                    <input
                      type="checkbox"
                      checked={orders.length > 0 && selected.size === orders.length}
                      onChange={(e) => {
                        if (e.target.checked) setSelected(new Set(orders.map((o) => o.id)));
                        else setSelected(new Set());
                      }}
                    />
                  </th>
                  <th className="px-2 py-2">Order</th>
                  <th className="px-2 py-2">Customer</th>
                  <th className="px-2 py-2">City</th>
                  <th className="px-2 py-2">COD</th>
                  {tab === "booking" ? <th className="px-2 py-2">Select API</th> : null}
                  {tab !== "booking" ? <th className="px-2 py-2">Tracking</th> : null}
                  <th className="px-2 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-6 text-center text-slate-500">
                      Loading…
                    </td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-6 text-center text-slate-500">
                      No orders
                    </td>
                  </tr>
                ) : (
                  orders.map((o) => (
                    <tr key={o.id} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="px-2 py-2">
                        <input
                          type="checkbox"
                          checked={selected.has(o.id)}
                          onChange={() => toggleId(o.id)}
                        />
                      </td>
                      <td className="px-2 py-2 font-semibold">
                        <Link href={`/orders/${o.id}`} className="text-[#1d6fb8] hover:underline">
                          {o.orderNumber}
                        </Link>
                      </td>
                      <td className="px-2 py-2">
                        <div>{o.name}</div>
                        <div className="text-slate-500">{o.phone}</div>
                      </td>
                      <td className="px-2 py-2">{o.city || "—"}</td>
                      <td className="px-2 py-2">Rs. {Number(o.codAmount || 0).toLocaleString()}</td>
                      {tab === "booking" ? (
                        <td className="px-2 py-2">
                          <ApiSearchSelect
                            carriers={carriers}
                            value={rowApi[o.id] || o.suggestedApi || defaultApi}
                            onChange={(v) => setRowApi((prev) => ({ ...prev, [o.id]: v }))}
                          />
                        </td>
                      ) : null}
                      {tab !== "booking" ? (
                        <td className="px-2 py-2">
                          <div className="font-mono">{o.trackingNumber || "—"}</div>
                          <div className="text-slate-500">
                            {o.runCourierApi || o.courier || ""}
                          </div>
                        </td>
                      ) : null}
                      <td className="px-2 py-2">
                        {tab === "booking" ? (
                          <button
                            type="button"
                            disabled={busy}
                            className="rounded bg-emerald-600 px-2 py-1 font-semibold text-white disabled:opacity-50"
                            onClick={async () => {
                              setBusy(true);
                              const r = await bookOne(
                                o.id,
                                rowApi[o.id] || o.suggestedApi || defaultApi
                              );
                              if (r.ok) toast.success(`Booked ${r.json.trackingNumber}`);
                              else toast.error(r.error);
                              setBusy(false);
                              loadOrders("unbooked");
                            }}
                          >
                            Book
                          </button>
                        ) : null}
                        {tab === "labels" ? (
                          <button
                            type="button"
                            className="rounded border border-slate-300 px-2 py-1 font-semibold"
                            onClick={() =>
                              downloadLabel(
                                `/api/runcourier/label?orderId=${encodeURIComponent(o.id)}&trackingNumber=${encodeURIComponent(o.trackingNumber)}&download=1`
                              )
                            }
                          >
                            Label
                          </button>
                        ) : null}
                        {tab === "cancel" ? (
                          <button
                            type="button"
                            className="rounded border border-red-300 bg-red-50 px-2 py-1 font-semibold text-red-800"
                            onClick={() => {
                              if (window.confirm(`Cancel ${o.trackingNumber}?`)) {
                                cancelOne(o.id, o.trackingNumber);
                              }
                            }}
                          >
                            Cancel
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {tab === "settings" ? (
        <div className="max-w-xl space-y-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <label className="flex items-center justify-between text-sm">
            <span>Enabled</span>
            <input
              type="checkbox"
              checked={settingsForm.runCourierEnabled !== false}
              onChange={(e) =>
                setSettingsForm((p) => ({ ...p, runCourierEnabled: e.target.checked }))
              }
            />
          </label>
          <div>
            <label className="text-xs font-medium text-slate-600">API Key</label>
            <input
              type="password"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
              value={settingsForm.runCourierApiKey}
              onChange={(e) =>
                setSettingsForm((p) => ({ ...p, runCourierApiKey: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Base URL</label>
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
              value={settingsForm.runCourierBaseUrl}
              onChange={(e) =>
                setSettingsForm((p) => ({ ...p, runCourierBaseUrl: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Default Select API</label>
            <ApiSearchSelect
              carriers={carriers}
              value={settingsForm.runCourierDefaultApi}
              onChange={(v) => setSettingsForm((p) => ({ ...p, runCourierDefaultApi: v }))}
              className="mt-1"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium text-slate-600">Product type</label>
              <select
                className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
                value={settingsForm.runCourierProductType}
                onChange={(e) =>
                  setSettingsForm((p) => ({ ...p, runCourierProductType: e.target.value }))
                }
              >
                {RUN_COURIER_PRODUCT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Service type</label>
              <select
                className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
                value={settingsForm.runCourierServiceType}
                onChange={(e) =>
                  setSettingsForm((p) => ({ ...p, runCourierServiceType: e.target.value }))
                }
              >
                {RUN_COURIER_SERVICE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Origin city</label>
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
              value={settingsForm.runCourierOriginCity}
              onChange={(e) =>
                setSettingsForm((p) => ({ ...p, runCourierOriginCity: e.target.value }))
              }
            />
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={saveSettings}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            Save Run Courier settings
          </button>
        </div>
      ) : null}
    </div>
  );
}
