"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  RUN_COURIER_APIS,
  RUN_COURIER_DEFAULT_API,
  RUN_COURIER_PRODUCT_TYPES,
  RUN_COURIER_SERVICE_TYPES,
} from "@/lib/runcourier";

const TABS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "booking", label: "Add Booking" },
  { id: "labels", label: "Print Labels" },
  { id: "track", label: "Track" },
  { id: "cancel", label: "Cancel Shipments" },
  { id: "settings", label: "Settings" },
];

const CELL_INPUT =
  "h-8 w-full min-w-[8rem] rounded border border-slate-300 bg-white px-2 text-xs dark:border-slate-600 dark:bg-slate-900";

/** Local calendar YYYY-MM-DD (Pakistan shop day — not UTC ISO). */
function localYmd(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function localMonthStart(d = new Date()) {
  return localYmd(new Date(d.getFullYear(), d.getMonth(), 1));
}

function downloadLabelBase64(base64, trackingNumber = "") {
  const raw = String(base64 || "").replace(/^data:application\/pdf;base64,/, "");
  if (!raw) return false;
  try {
    const binary = atob(raw);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.rel = "noopener";
    a.download = `runcourier-airbill-${trackingNumber || "shipment"}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
    return true;
  } catch {
    return false;
  }
}

async function downloadAirbillPdf({ orderId, trackingNumber, orderIds, trackingNumbers } = {}) {
  const { downloadRunCourierLabelPdf, downloadRunCourierLabelsPdf } = await import(
    "@/lib/downloadRunCourierLabelPdf"
  );
  if (Array.isArray(orderIds) && orderIds.length > 1) {
    const items = orderIds.map((id, i) => ({
      orderId: id,
      trackingNumber: trackingNumbers?.[i] || trackingNumber,
    }));
    return downloadRunCourierLabelsPdf(items);
  }
  return downloadRunCourierLabelPdf({ orderId, trackingNumber, orderIds, trackingNumbers });
}

async function printAirbillPdf({ orderId, trackingNumber, orderIds, trackingNumbers } = {}) {
  const { printRunCourierLabelPdf, printRunCourierLabelsPdf } = await import(
    "@/lib/downloadRunCourierLabelPdf"
  );
  if (Array.isArray(orderIds) && orderIds.length > 1) {
    const items = orderIds.map((id, i) => ({
      orderId: id,
      trackingNumber: trackingNumbers?.[i] || trackingNumber,
    }));
    return printRunCourierLabelsPdf(items);
  }
  return printRunCourierLabelPdf({ orderId, trackingNumber, orderIds, trackingNumbers });
}

async function autoDownloadAirbill(json, orderId) {
  const tn = String(json?.trackingNumber || "").trim();
  if (downloadLabelBase64(json?.labelPdfBase64, tn)) return true;
  try {
    await downloadAirbillPdf({ orderId, trackingNumber: tn });
    return true;
  } catch {
    return false;
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
  const [labelSearch, setLabelSearch] = useState("");
  const [mode, setMode] = useState("unbooked");
  const [selected, setSelected] = useState(() => new Set());
  const [busy, setBusy] = useState(false);
  const [carriers, setCarriers] = useState(RUN_COURIER_APIS);
  const [defaultApi, setDefaultApi] = useState(RUN_COURIER_DEFAULT_API);
  const [rowApi, setRowApi] = useState({});
  const [rows, setRows] = useState({});
  const [labelFrom, setLabelFrom] = useState(() => localMonthStart());
  const [labelTo, setLabelTo] = useState(() => localYmd());
  const [trackInput, setTrackInput] = useState("");
  const [trackLoading, setTrackLoading] = useState(false);
  const [trackResult, setTrackResult] = useState(null);
  const [trackError, setTrackError] = useState("");
  const [bulkTrackBusy, setBulkTrackBusy] = useState(false);
  const [settingsForm, setSettingsForm] = useState({
    runCourierEnabled: true,
    runCourierApiKey: "",
    runCourierClientCode: "",
    runCourierProfileId: "",
    runCourierBaseUrl: "https://portal.runcourier.com",
    runCourierDefaultApi: RUN_COURIER_DEFAULT_API,
    runCourierProductType: "Overnight",
    runCourierServiceType: "Overnight",
    runCourierOriginCity: "Gujranwala",
    runCourierPickupCode: "",
    runCourierShipperName: "",
    runCourierShipperPhone: "",
    runCourierShipperAddress: "",
    runCourierDefaultWeight: 0.5,
    runCourierShipperRemarks:
      "Call customer before delivery. Do not leave parcel unattended.",
    runCourierPrintItemDetails: false,
    runCourierPrintItemDetailsSku: false,
    runCourierAutoCreateShipment: false,
    runCourierAutoSaveTracking: true,
    runCourierAutoCalculateWeight: false,
    runCourierAutoCalculatePieces: false,
    runCourierPaidOrdersCodZero: false,
    runCourierAddOrderNotesInRemarks: false,
    runCourierCreatePath: "",
    runCourierTrackPath: "",
    runCourierLabelPath: "",
    runCourierCancelPath: "",
  });

  function patchRow(id, partial) {
    setRows((prev) => ({ ...prev, [id]: { ...prev[id], ...partial } }));
  }

  function patchSettings(partial) {
    setSettingsForm((p) => ({ ...p, ...partial }));
  }

  async function loadOrders(nextMode = mode, dateRange = null, opts = {}) {
    setLoading(true);
    try {
      let from = dateRange?.from || "";
      let to = dateRange?.to || "";
      if (from && to && from > to) {
        const tmp = from;
        from = to;
        to = tmp;
        if (dateRange) {
          setLabelFrom(from);
          setLabelTo(to);
        }
      }

      const q =
        opts.search != null
          ? String(opts.search)
          : nextMode === "booked"
            ? labelSearch
            : search;

      const p = new URLSearchParams({
        mode: nextMode,
        limit: nextMode === "booked" ? "500" : "100",
      });
      if (String(q || "").trim()) p.set("search", String(q).trim());
      if (from) p.set("from", from);
      if (to) p.set("to", to);
      const res = await fetch(`/api/runcourier/orders?${p}`, { credentials: "include" });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error || "Could not load orders");
        return;
      }
      const list = json.orders || [];
      setOrders(list);
      setTotal(json.total || 0);
      if (json.defaultApi) setDefaultApi(json.defaultApi);
      if (nextMode === "unbooked") {
        const next = {};
        const nextApi = {};
        for (const o of list) {
          next[o.id] = {
            name: o.name || "",
            phone: o.phone || "",
            city: o.city || "",
            address: o.address || "",
            cod: o.codAmount ?? 0,
          };
          nextApi[o.id] = o.suggestedApi || json.defaultApi || RUN_COURIER_DEFAULT_API;
        }
        setRows(next);
        setRowApi(nextApi);
      }
      if (opts.selectAll && list.length) {
        setSelected(new Set(list.map((o) => o.id)));
      } else {
        setSelected(new Set());
      }
    } catch {
      toast.error("Network error loading orders");
    } finally {
      setLoading(false);
    }
  }

  function searchLabelBookings({ selectAll = true } = {}) {
    return loadOrders(
      "booked",
      { from: labelFrom, to: labelTo },
      { selectAll, search: labelSearch }
    );
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
      setSettingsForm({
        runCourierEnabled: c.runCourierEnabled !== false,
        runCourierApiKey: c.runCourierApiKey || "",
        runCourierClientCode: c.runCourierClientCode || "",
        runCourierProfileId: c.runCourierProfileId || "",
        runCourierBaseUrl: c.runCourierBaseUrl || "https://portal.runcourier.com",
        runCourierDefaultApi: c.runCourierDefaultApi || RUN_COURIER_DEFAULT_API,
        runCourierProductType: c.runCourierProductType || "Overnight",
        runCourierServiceType: c.runCourierServiceType || "Overnight",
        runCourierOriginCity: c.runCourierOriginCity || c.originCity || "Gujranwala",
        runCourierPickupCode: c.runCourierPickupCode || "",
        runCourierShipperName: c.runCourierShipperName || "",
        runCourierShipperPhone: c.runCourierShipperPhone || "",
        runCourierShipperAddress: c.runCourierShipperAddress || "",
        runCourierDefaultWeight: c.runCourierDefaultWeight ?? c.defaultWeight ?? 0.5,
        runCourierShipperRemarks:
          c.runCourierShipperRemarks ||
          c.shipperRemarks ||
          "Call customer before delivery. Do not leave parcel unattended.",
        runCourierPrintItemDetails: Boolean(c.runCourierPrintItemDetails ?? c.printItemDetails),
        runCourierPrintItemDetailsSku: Boolean(
          c.runCourierPrintItemDetailsSku ?? c.printItemDetailsSku
        ),
        runCourierAutoCreateShipment: Boolean(
          c.runCourierAutoCreateShipment ?? c.autoCreateShipment
        ),
        runCourierAutoSaveTracking: c.runCourierAutoSaveTracking !== false,
        runCourierAutoCalculateWeight: Boolean(
          c.runCourierAutoCalculateWeight ?? c.autoCalculateWeight
        ),
        runCourierAutoCalculatePieces: Boolean(
          c.runCourierAutoCalculatePieces ?? c.autoCalculatePieces
        ),
        runCourierPaidOrdersCodZero: Boolean(
          c.runCourierPaidOrdersCodZero ?? c.paidOrdersCodZero
        ),
        runCourierAddOrderNotesInRemarks: Boolean(
          c.runCourierAddOrderNotesInRemarks ?? c.addOrderNotesInRemarks
        ),
        runCourierCreatePath: c.runCourierCreatePath || "",
        runCourierTrackPath: c.runCourierTrackPath || "",
        runCourierLabelPath: c.runCourierLabelPath || "",
        runCourierCancelPath: c.runCourierCancelPath || "",
      });
      setDefaultApi(c.runCourierDefaultApi || RUN_COURIER_DEFAULT_API);
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
    } else if (tab === "labels" || tab === "cancel" || tab === "track") {
      setMode("booked");
      loadOrders(
        "booked",
        tab === "labels" ? { from: labelFrom, to: labelTo } : null,
        { selectAll: tab === "labels", search: tab === "labels" ? labelSearch : "" }
      );
    } else if (tab === "dashboard") {
      loadOrders("unbooked");
    } else if (tab === "settings") {
      loadSettings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  async function lookupTracking(code) {
    const tn = String(code || trackInput || "").trim();
    if (!tn) {
      setTrackError("Enter a tracking / CN number.");
      setTrackResult(null);
      return;
    }
    setTrackLoading(true);
    setTrackError("");
    setTrackResult(null);
    try {
      const res = await fetch(`/api/runcourier/track?trackingNumber=${encodeURIComponent(tn)}`, {
        credentials: "include",
      });
      const json = await res.json();
      if (!json.success) {
        setTrackError(json.error || "Tracking not found.");
        return;
      }
      setTrackResult(json);
      setTrackInput(tn);
    } catch {
      setTrackError("Network error.");
    } finally {
      setTrackLoading(false);
    }
  }

  async function refreshBookedLiveStatus() {
    const ids = orders.filter((o) => o.trackingNumber).map((o) => o.id);
    if (!ids.length) {
      toast.error("No booked orders with tracking numbers.");
      return;
    }
    setBulkTrackBusy(true);
    try {
      const res = await fetch("/api/runcourier/track-bulk", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderIds: ids.slice(0, 40), syncOrderStatus: true }),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error || "Live status failed");
        return;
      }
      const parts = [];
      if (json.okCount) parts.push(`${json.okCount} updated`);
      if (json.syncedCount) parts.push(`${json.syncedCount} synced`);
      if (json.failCount) parts.push(`${json.failCount} failed`);
      toast.success(parts.join(" · ") || "Done");
      loadOrders("booked");
    } catch {
      toast.error("Network error");
    } finally {
      setBulkTrackBusy(false);
    }
  }

  async function downloadSelectedLabels() {
    const list = orders.filter((o) => selected.has(o.id) && o.trackingNumber);
    if (!list.length) {
      toast.error("Select booked orders with tracking numbers.");
      return;
    }
    const toastId = toast.loading(
      list.length === 1 ? "Preparing airbill PDF…" : `Preparing ${list.length} airbill PDFs…`
    );
    try {
      await downloadAirbillPdf({
        orderIds: list.map((o) => o.id),
        trackingNumbers: list.map((o) => o.trackingNumber),
        orderId: list[0].id,
        trackingNumber: list[0].trackingNumber,
      });
      toast.success(
        list.length === 1 ? "Airbill PDF downloaded" : `${list.length} airbill PDFs downloaded`,
        { id: toastId }
      );
    } catch (e) {
      toast.error(e?.message || "Could not download airbill PDF", { id: toastId });
    }
  }

  async function printSelectedLabels() {
    const list = orders.filter((o) => selected.has(o.id) && o.trackingNumber);
    if (!list.length) {
      toast.error("Select booked orders with tracking numbers.");
      return;
    }
    const toastId = toast.loading(
      list.length === 1 ? "Opening print…" : `Preparing ${list.length} labels to print…`
    );
    try {
      await printAirbillPdf({
        orderIds: list.map((o) => o.id),
        trackingNumbers: list.map((o) => o.trackingNumber),
        orderId: list[0].id,
        trackingNumber: list[0].trackingNumber,
      });
      toast.success("Print dialog opened", { id: toastId });
    } catch (e) {
      toast.error(e?.message || "Could not print airbill", { id: toastId });
    }
  }

  function SettingsToggle({ label, keyName }) {
    return (
      <label className="flex items-center justify-between gap-3 rounded border border-slate-200 px-3 py-2 text-sm dark:border-slate-700">
        <span>{label}</span>
        <input
          type="checkbox"
          checked={Boolean(settingsForm[keyName])}
          onChange={(e) => patchSettings({ [keyName]: e.target.checked })}
        />
      </label>
    );
  }

  function toggleId(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function bookOne(order, selectedApi) {
    const id = typeof order === "string" ? order : order.id;
    const base = typeof order === "string" ? orders.find((o) => o.id === id) || {} : order;
    const row = rows[id] || {};
    const name = String(row.name ?? base.name ?? "").trim();
    const phone = String(row.phone ?? base.phone ?? "").trim();
    const city = String(row.city ?? base.city ?? "").trim();
    const address = String(row.address ?? base.address ?? "").trim();
    const cod = Math.max(
      0,
      Math.round(Number(row.cod != null && row.cod !== "" ? row.cod : base.codAmount) || 0)
    );
    const api = selectedApi || rowApi[id] || base.suggestedApi || defaultApi || RUN_COURIER_DEFAULT_API;

    const res = await fetch("/api/runcourier/create-shipment", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId: id,
        selectedApi: api,
        customerName: name,
        customerPhone: phone,
        cityName: city,
        deliveryAddress: address,
        codAmount: cod,
        paymentMethod: cod > 0 ? "COD" : "Prepaid",
        remarks: settingsForm.runCourierShipperRemarks || undefined,
        weight: settingsForm.runCourierDefaultWeight || undefined,
        productType: settingsForm.runCourierProductType || undefined,
        serviceType: settingsForm.runCourierServiceType || undefined,
        shippingAddress: {
          name,
          phone,
          city,
          street: address,
          address,
        },
      }),
    });
    const json = await res.json();
    if (res.ok && json.success) {
      if (await autoDownloadAirbill(json, id)) {
        toast.success(
          json.trackingNumber
            ? `Airbill PDF downloaded: ${json.trackingNumber}`
            : "Airbill PDF downloaded"
        );
      }
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
      const order = orders.find((o) => o.id === id);
      const r = await bookOne(order || id, rowApi[id] || defaultApi);
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
        body: JSON.stringify({
          courier: {
            ...settingsForm,
            runCourierDefaultWeight: Math.max(
              0.1,
              Number(settingsForm.runCourierDefaultWeight) || 0.5
            ),
            runCourierApiKey: String(settingsForm.runCourierApiKey || "").trim(),
            runCourierClientCode: String(settingsForm.runCourierClientCode || "").trim(),
            runCourierProfileId: String(settingsForm.runCourierProfileId || "").trim(),
            runCourierBaseUrl: String(settingsForm.runCourierBaseUrl || "").trim(),
            runCourierOriginCity:
              String(settingsForm.runCourierOriginCity || "").trim() || "Gujranwala",
            runCourierShipperRemarks: String(settingsForm.runCourierShipperRemarks || "").trim(),
          },
        }),
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
          <div className="flex flex-wrap items-end gap-2">
            {tab === "booking" ? (
              <>
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
                <button
                  type="button"
                  disabled={busy || !selected.size}
                  onClick={bookSelected}
                  className="h-9 rounded-lg bg-emerald-600 px-3 text-sm font-bold text-white disabled:opacity-50"
                >
                  Book selected ({selected.size})
                </button>
              </>
            ) : (
              <>
                <span className="mr-1 text-lg font-black text-emerald-700">Run Courier</span>
                <input
                  type="search"
                  value={labelSearch}
                  onChange={(e) => setLabelSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") searchLabelBookings();
                  }}
                  placeholder="Order # or customer name…"
                  className="h-9 min-w-[12rem] rounded border border-slate-300 px-3 text-sm dark:border-slate-600 dark:bg-slate-900"
                />
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Booking date
                </label>
                <input
                  type="date"
                  title="Courier booking date (not order received date)"
                  className="h-9 rounded border border-slate-300 px-2 text-sm dark:border-slate-600 dark:bg-slate-900"
                  value={labelFrom}
                  onChange={(e) => setLabelFrom(e.target.value)}
                />
                <span className="text-xs text-slate-400">to</span>
                <input
                  type="date"
                  title="Courier booking date (not order received date)"
                  className="h-9 rounded border border-slate-300 px-2 text-sm dark:border-slate-600 dark:bg-slate-900"
                  value={labelTo}
                  onChange={(e) => setLabelTo(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => searchLabelBookings({ selectAll: true })}
                  className="h-9 rounded bg-emerald-600 px-4 text-sm font-bold text-white"
                >
                  Search
                </button>
                {tab === "labels" ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setSelected(new Set(orders.map((o) => o.id)))}
                      disabled={!orders.length}
                      className="h-9 rounded border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
                    >
                      Select all ({orders.length})
                    </button>
                    <span className="text-xs font-semibold text-slate-500">
                      {total ? `${orders.length} shown · ${total} total` : null}
                    </span>
                    <button
                      type="button"
                      disabled={!selected.size}
                      onClick={printSelectedLabels}
                      className="ml-auto h-9 rounded border border-emerald-600 bg-white px-4 text-sm font-bold text-emerald-700 disabled:opacity-60 dark:bg-slate-900"
                    >
                      Print Label
                    </button>
                    <button
                      type="button"
                      disabled={!selected.size}
                      onClick={downloadSelectedLabels}
                      className="h-9 rounded bg-emerald-500 px-4 text-sm font-bold text-white disabled:opacity-60"
                    >
                      Download Label
                    </button>
                  </>
                ) : null}
              </>
            )}
          </div>
          {tab === "labels" ? (
            <p className="text-xs text-slate-500">
              Filter by <strong>booking date</strong> (when Run Courier was booked), and/or search by{" "}
              <strong>order number</strong> or <strong>customer name</strong>. Print / Download opens a
              single <strong>A4 PDF</strong> like PostEx (1 label = top third of the page; up to 3 per
              sheet).
            </p>
          ) : null}

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <tr>
                  <th className="px-2 py-2">
                    <input
                      type="checkbox"
                      title="Select all orders booked on these dates"
                      aria-label="Select all"
                      checked={orders.length > 0 && selected.size === orders.length}
                      onChange={(e) => {
                        if (e.target.checked) setSelected(new Set(orders.map((o) => o.id)));
                        else setSelected(new Set());
                      }}
                    />
                  </th>
                  <th className="px-2 py-2">Order</th>
                  {tab === "booking" ? (
                    <>
                      <th className="px-2 py-2">Name</th>
                      <th className="px-2 py-2">Mobile</th>
                      <th className="px-2 py-2">Address</th>
                      <th className="px-2 py-2">City</th>
                      <th className="px-2 py-2">COD</th>
                      <th className="px-2 py-2">Select API</th>
                    </>
                  ) : (
                    <>
                      <th className="px-2 py-2">Customer</th>
                      <th className="px-2 py-2">City</th>
                      <th className="px-2 py-2">COD</th>
                      <th className="px-2 py-2">Booked</th>
                      <th className="px-2 py-2">Tracking</th>
                    </>
                  )}
                  <th className="px-2 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={10} className="px-3 py-6 text-center text-slate-500">
                      Loading…
                    </td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-3 py-6 text-center text-slate-500">
                      No orders
                    </td>
                  </tr>
                ) : (
                  orders.map((o) => {
                    const row = rows[o.id] || {};
                    return (
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
                      {tab === "booking" ? (
                        <>
                          <td className="px-2 py-2">
                            <input
                              className={CELL_INPUT}
                              value={row.name ?? o.name ?? ""}
                              onChange={(e) => patchRow(o.id, { name: e.target.value })}
                              aria-label={`Name for ${o.orderNumber}`}
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              className={`${CELL_INPUT} min-w-[9rem] font-mono`}
                              value={row.phone ?? o.phone ?? ""}
                              onChange={(e) => patchRow(o.id, { phone: e.target.value })}
                              aria-label={`Mobile for ${o.orderNumber}`}
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              className={`${CELL_INPUT} min-w-[14rem]`}
                              value={row.address ?? o.address ?? ""}
                              onChange={(e) => patchRow(o.id, { address: e.target.value })}
                              title={row.address ?? o.address ?? ""}
                              aria-label={`Address for ${o.orderNumber}`}
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              className={`${CELL_INPUT} min-w-[8rem]`}
                              value={row.city ?? o.city ?? ""}
                              onChange={(e) => patchRow(o.id, { city: e.target.value })}
                              aria-label={`City for ${o.orderNumber}`}
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="number"
                              min={0}
                              step={1}
                              className="h-8 w-24 rounded border border-slate-300 px-1 text-xs dark:border-slate-600 dark:bg-slate-900"
                              value={row.cod ?? o.codAmount ?? 0}
                              onChange={(e) =>
                                patchRow(o.id, {
                                  cod: Math.max(0, Math.round(Number(e.target.value) || 0)),
                                })
                              }
                              aria-label={`COD for ${o.orderNumber}`}
                            />
                          </td>
                          <td className="px-2 py-2">
                            <ApiSearchSelect
                              carriers={carriers}
                              value={rowApi[o.id] || o.suggestedApi || defaultApi}
                              onChange={(v) => setRowApi((prev) => ({ ...prev, [o.id]: v }))}
                            />
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-2 py-2">
                            <div className="font-medium">{o.name}</div>
                            <div className="font-mono text-slate-500">{o.phone}</div>
                            <div className="mt-0.5 max-w-[14rem] truncate text-[10px] text-slate-400" title={o.address}>
                              {o.address || "—"}
                            </div>
                          </td>
                          <td className="px-2 py-2">{o.city || "—"}</td>
                          <td className="px-2 py-2">
                            Rs. {Number(o.codAmount || 0).toLocaleString()}
                          </td>
                          <td className="px-2 py-2 whitespace-nowrap text-slate-600">
                            {o.bookedAt
                              ? new Date(o.bookedAt).toLocaleDateString("en-GB", {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "numeric",
                                })
                              : "—"}
                          </td>
                          <td className="px-2 py-2">
                            <div className="font-mono">{o.trackingNumber || "—"}</div>
                            <div className="text-slate-500">
                              {o.runCourierApi || o.courier || ""} · {o.orderStatus || ""}
                            </div>
                          </td>
                        </>
                      )}
                      <td className="px-2 py-2">
                        {tab === "booking" ? (
                          <button
                            type="button"
                            disabled={busy}
                            className="rounded bg-emerald-600 px-2 py-1 font-semibold text-white disabled:opacity-50"
                            onClick={async () => {
                              setBusy(true);
                              const r = await bookOne(
                                o,
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
                          <div className="flex flex-wrap gap-1">
                            <button
                              type="button"
                              className="rounded border border-emerald-600 px-2 py-1 font-semibold text-emerald-700"
                              onClick={async () => {
                                const toastId = toast.loading("Opening print…");
                                try {
                                  await printAirbillPdf({
                                    orderId: o.id,
                                    trackingNumber: o.trackingNumber,
                                  });
                                  toast.success("Print dialog opened", { id: toastId });
                                } catch (e) {
                                  toast.error(e?.message || "Could not print", { id: toastId });
                                }
                              }}
                            >
                              Print
                            </button>
                            <button
                              type="button"
                              className="rounded border border-slate-300 px-2 py-1 font-semibold"
                              onClick={async () => {
                                const toastId = toast.loading("Preparing airbill PDF…");
                                try {
                                  await downloadAirbillPdf({
                                    orderId: o.id,
                                    trackingNumber: o.trackingNumber,
                                  });
                                  toast.success("Airbill PDF downloaded", { id: toastId });
                                } catch (e) {
                                  toast.error(e?.message || "Could not download PDF", {
                                    id: toastId,
                                  });
                                }
                              }}
                            >
                              Download
                            </button>
                          </div>
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
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {tab === "track" ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Track a shipment</h2>
            <p className="mt-1 text-xs text-slate-500">
              Look up live status from Run Courier API (portal fallback if API path is not ready).
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <input
                value={trackInput}
                onChange={(e) => setTrackInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") lookupTracking();
                }}
                placeholder="Tracking / CN number"
                className="h-10 min-w-[16rem] flex-1 rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-950"
              />
              <button
                type="button"
                disabled={trackLoading}
                onClick={() => lookupTracking()}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {trackLoading ? "Tracking…" : "Track"}
              </button>
              <button
                type="button"
                disabled={bulkTrackBusy || loading}
                onClick={refreshBookedLiveStatus}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              >
                {bulkTrackBusy ? "Refreshing…" : "Refresh all booked statuses"}
              </button>
            </div>
            {trackError ? <p className="mt-2 text-sm text-red-600">{trackError}</p> : null}
            {trackResult?.success ? (
              <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm dark:border-emerald-900/40 dark:bg-emerald-950/30">
                <p className="font-semibold text-emerald-900 dark:text-emerald-100">
                  {trackResult.trackingNumber} — {trackResult.status}
                </p>
                {trackResult.currentLocation || trackResult.location ? (
                  <p className="mt-1 text-xs text-emerald-800 dark:text-emerald-200">
                    Location: {trackResult.currentLocation || trackResult.location}
                  </p>
                ) : null}
                {trackResult.destination ? (
                  <p className="text-xs text-emerald-800 dark:text-emerald-200">
                    Destination: {trackResult.destination}
                  </p>
                ) : null}
                {Array.isArray(trackResult.events) && trackResult.events.length ? (
                  <ul className="mt-3 max-h-56 space-y-1 overflow-y-auto text-xs">
                    {trackResult.events.map((ev, i) => (
                      <li key={`${ev.status}-${i}`}>
                        {[ev.date, ev.time].filter(Boolean).join(" ")} — <strong>{ev.status}</strong>
                        {ev.location ? ` · ${ev.location}` : ""}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2 dark:border-slate-700">
              <p className="text-sm font-semibold">Recent booked shipments</p>
              <button
                type="button"
                className="text-xs font-semibold text-emerald-700 hover:underline"
                onClick={() => loadOrders("booked")}
              >
                Reload
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800">
                  <tr>
                    <th className="px-2 py-2">Order</th>
                    <th className="px-2 py-2">Tracking</th>
                    <th className="px-2 py-2">API</th>
                    <th className="px-2 py-2">Last status</th>
                    <th className="px-2 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-6 text-center text-slate-500">
                        Loading…
                      </td>
                    </tr>
                  ) : orders.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-6 text-center text-slate-500">
                        No booked Run Courier shipments.
                      </td>
                    </tr>
                  ) : (
                    orders.map((o) => (
                      <tr key={o.id} className="border-t border-slate-100 dark:border-slate-800">
                        <td className="px-2 py-2">
                          <Link
                            href={`/orders/${o.id}`}
                            className="font-semibold text-emerald-700 hover:underline"
                          >
                            {o.orderNumber}
                          </Link>
                        </td>
                        <td className="px-2 py-2 font-mono">{o.trackingNumber || "—"}</td>
                        <td className="px-2 py-2">{o.runCourierApi || o.courier || "—"}</td>
                        <td className="px-2 py-2">{o.lastStatus || o.tracking?.lastStatus || "—"}</td>
                        <td className="px-2 py-2">
                          {o.trackingNumber ? (
                            <button
                              type="button"
                              className="text-xs font-semibold text-emerald-700 hover:underline"
                              onClick={() => lookupTracking(o.trackingNumber)}
                            >
                              Track
                            </button>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}

      {tab === "settings" ? (
        <div className="mx-auto max-w-2xl space-y-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Run Courier</h2>
            <p className="text-sm text-slate-500">
              Token, pickup/shipper defaults, and booking options — parallel to PostEx. Support:{" "}
              info@runcourier.com
            </p>
          </div>

          <SettingsToggle label="Enable Run Courier booking" keyName="runCourierEnabled" />

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-semibold uppercase text-slate-500">
              Client Code
              <input
                className="mt-1 w-full rounded border px-3 py-2 font-mono text-sm dark:border-slate-600 dark:bg-slate-800"
                value={settingsForm.runCourierClientCode}
                onChange={(e) => patchSettings({ runCourierClientCode: e.target.value })}
                placeholder="e.g. 991200"
              />
            </label>
            <label className="block text-xs font-semibold uppercase text-slate-500">
              Profile ID
              <input
                className="mt-1 w-full rounded border px-3 py-2 font-mono text-sm dark:border-slate-600 dark:bg-slate-800"
                value={settingsForm.runCourierProfileId}
                onChange={(e) => patchSettings({ runCourierProfileId: e.target.value })}
                placeholder="From Api Setting → Generate Profile ID"
              />
            </label>
          </div>

          <label className="block text-xs font-semibold uppercase text-slate-500">
            Token (API Auth Key)
            <input
              type="password"
              className="mt-1 w-full rounded border px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
              value={settingsForm.runCourierApiKey}
              onChange={(e) => patchSettings({ runCourierApiKey: e.target.value })}
              placeholder="UUID from portal Api Setting"
            />
          </label>

          <label className="block text-xs font-semibold uppercase text-slate-500">
            API Base URL
            <input
              className="mt-1 w-full rounded border px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
              value={settingsForm.runCourierBaseUrl}
              onChange={(e) => patchSettings({ runCourierBaseUrl: e.target.value })}
            />
          </label>

          <div>
            <span className="text-xs font-semibold uppercase text-slate-500">Pickup / Shipper</span>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <label className="block text-xs font-medium text-slate-600 sm:col-span-2">
                Pickup code (optional)
                <input
                  className="mt-1 w-full rounded border px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
                  value={settingsForm.runCourierPickupCode}
                  onChange={(e) => patchSettings({ runCourierPickupCode: e.target.value })}
                  placeholder="e.g. profile / warehouse code from portal"
                />
              </label>
              <label className="block text-xs font-medium text-slate-600">
                Shipper name
                <input
                  className="mt-1 w-full rounded border px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
                  value={settingsForm.runCourierShipperName}
                  onChange={(e) => patchSettings({ runCourierShipperName: e.target.value })}
                />
              </label>
              <label className="block text-xs font-medium text-slate-600">
                Shipper phone
                <input
                  className="mt-1 w-full rounded border px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
                  value={settingsForm.runCourierShipperPhone}
                  onChange={(e) => patchSettings({ runCourierShipperPhone: e.target.value })}
                />
              </label>
              <label className="block text-xs font-medium text-slate-600 sm:col-span-2">
                Shipper address
                <input
                  className="mt-1 w-full rounded border px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
                  value={settingsForm.runCourierShipperAddress}
                  onChange={(e) => patchSettings({ runCourierShipperAddress: e.target.value })}
                />
              </label>
            </div>
            {(settingsForm.runCourierShipperName ||
              settingsForm.runCourierShipperAddress ||
              settingsForm.runCourierPickupCode) && (
              <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-slate-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-slate-200">
                {settingsForm.runCourierPickupCode ? (
                  <p className="font-bold text-emerald-800 dark:text-emerald-300">
                    Code {settingsForm.runCourierPickupCode} · Pickup
                  </p>
                ) : null}
                <p className="mt-1">{settingsForm.runCourierShipperAddress || "—"}</p>
                <p className="mt-1 text-slate-600 dark:text-slate-400">
                  {settingsForm.runCourierOriginCity}
                  {settingsForm.runCourierShipperName
                    ? ` · ${settingsForm.runCourierShipperName}`
                    : ""}
                </p>
                <p className="mt-1 text-slate-600 dark:text-slate-400">
                  Phone: {settingsForm.runCourierShipperPhone || "—"}
                </p>
              </div>
            )}
          </div>

          <label className="block text-xs font-semibold uppercase text-slate-500">
            Origin City
            <input
              className="mt-1 w-full rounded border px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
              value={settingsForm.runCourierOriginCity}
              onChange={(e) => patchSettings({ runCourierOriginCity: e.target.value })}
            />
          </label>

          <label className="block text-xs font-semibold uppercase text-slate-500">
            Default Weight (kg)
            <input
              type="number"
              step="0.1"
              min="0.1"
              className="mt-1 w-full rounded border px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
              value={settingsForm.runCourierDefaultWeight}
              onChange={(e) => patchSettings({ runCourierDefaultWeight: e.target.value })}
            />
          </label>

          <label className="block text-xs font-semibold uppercase text-slate-500">
            Shipper Remarks
            <textarea
              className="mt-1 w-full rounded border px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
              rows={3}
              value={settingsForm.runCourierShipperRemarks}
              onChange={(e) => patchSettings({ runCourierShipperRemarks: e.target.value })}
            />
            <span className="mt-1 block text-[11px] font-normal normal-case text-slate-500">
              Saved remarks are sent on new Run Courier bookings and appear on labels when supported.
            </span>
          </label>

          <div className="grid gap-2 sm:grid-cols-2">
            <label className="block text-xs font-semibold uppercase text-slate-500">
              Product type
              <select
                className="mt-1 w-full rounded border px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
                value={settingsForm.runCourierProductType}
                onChange={(e) => patchSettings({ runCourierProductType: e.target.value })}
              >
                {RUN_COURIER_PRODUCT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-semibold uppercase text-slate-500">
              Service type
              <select
                className="mt-1 w-full rounded border px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
                value={settingsForm.runCourierServiceType}
                onChange={(e) => patchSettings({ runCourierServiceType: e.target.value })}
              >
                {RUN_COURIER_SERVICE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-semibold uppercase text-slate-500 sm:col-span-2">
              Default Select API
              <div className="mt-1">
                <ApiSearchSelect
                  carriers={carriers}
                  value={settingsForm.runCourierDefaultApi}
                  onChange={(v) => patchSettings({ runCourierDefaultApi: v })}
                />
              </div>
            </label>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
            <p className="font-semibold">API endpoint paths</p>
            <p className="mt-1 opacity-90">
              Official iCargos paths are uppercase <code>/API/CreateOrder.php</code> (etc.). Leave
              blank to use defaults. Auth uses Client Code + API Auth Key in the JSON body.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-semibold uppercase text-slate-500 sm:col-span-2">
              Create path
              <input
                className="mt-1 h-9 w-full rounded border border-slate-300 px-2 font-mono text-xs dark:border-slate-600 dark:bg-slate-900"
                value={settingsForm.runCourierCreatePath}
                onChange={(e) => patchSettings({ runCourierCreatePath: e.target.value })}
                placeholder="/API/CreateOrder.php"
              />
            </label>
            <label className="block text-xs font-semibold uppercase text-slate-500">
              Track path
              <input
                className="mt-1 h-9 w-full rounded border border-slate-300 px-2 font-mono text-xs dark:border-slate-600 dark:bg-slate-900"
                value={settingsForm.runCourierTrackPath}
                onChange={(e) => patchSettings({ runCourierTrackPath: e.target.value })}
                placeholder="/API/TrackOrder.php"
              />
            </label>
            <label className="block text-xs font-semibold uppercase text-slate-500">
              Label path
              <input
                className="mt-1 h-9 w-full rounded border border-slate-300 px-2 font-mono text-xs dark:border-slate-600 dark:bg-slate-900"
                value={settingsForm.runCourierLabelPath}
                onChange={(e) => patchSettings({ runCourierLabelPath: e.target.value })}
                placeholder="(invoice link from booking)"
              />
            </label>
            <label className="block text-xs font-semibold uppercase text-slate-500 sm:col-span-2">
              Cancel path
              <input
                className="mt-1 h-9 w-full rounded border border-slate-300 px-2 font-mono text-xs dark:border-slate-600 dark:bg-slate-900"
                value={settingsForm.runCourierCancelPath}
                onChange={(e) => patchSettings({ runCourierCancelPath: e.target.value })}
                placeholder="/API/CancelOrder.php"
              />
            </label>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <SettingsToggle label="Print Item Details" keyName="runCourierPrintItemDetails" />
            <SettingsToggle label="Auto Calculate Weight" keyName="runCourierAutoCalculateWeight" />
            <SettingsToggle
              label="Print Item Details with SKU"
              keyName="runCourierPrintItemDetailsSku"
            />
            <SettingsToggle label="Auto Calculate Pieces" keyName="runCourierAutoCalculatePieces" />
            <SettingsToggle label="Auto Order Fulfillment" keyName="runCourierAutoCreateShipment" />
            <SettingsToggle
              label="Calculate Paid orders as Zero"
              keyName="runCourierPaidOrdersCodZero"
            />
            <SettingsToggle label="Auto Save Tracking Details" keyName="runCourierAutoSaveTracking" />
            <SettingsToggle
              label="Add Order Notes in Remarks"
              keyName="runCourierAddOrderNotesInRemarks"
            />
          </div>

          <button
            type="button"
            disabled={busy}
            onClick={saveSettings}
            className="w-full rounded-lg bg-[#2563EB] py-3 text-sm font-bold text-white disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save Settings"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
