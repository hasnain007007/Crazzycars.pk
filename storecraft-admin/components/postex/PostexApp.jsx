"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

const TABS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "booking", label: "Add Booking" },
  { id: "labels", label: "Print Labels" },
  { id: "loadsheet", label: "Generate Loadsheet" },
  { id: "cancel", label: "Cancel Shipments" },
  { id: "settings", label: "Settings" },
];

const SHIP_TYPES = ["Normal", "Reversed", "Replacement", "Overland"];
const HANDLING_OPTS = ["Normal", "Fragile"];

function downloadLabel(url) {
  if (!url) return;
  // Open in a new tab so multi-page PDFs can be printed as one document.
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

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

/** Searchable PostEx city picker — type to filter ~800+ operational cities. */
function CitySearchSelect({
  cities = [],
  value = "",
  onChange,
  placeholder = "Search city…",
  className = "",
  inputClassName = "",
  allowEmpty = true,
}) {
  const rootRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const list = useMemo(() => {
    const base = Array.isArray(cities) ? cities.filter(Boolean) : [];
    const q = String(query || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");
    if (!q) return base.slice(0, 80);
    const compact = q.replace(/\s+/g, "");
    const scored = [];
    for (const c of base) {
      const name = String(c);
      const lower = name.toLowerCase();
      const cpt = lower.replace(/\s+/g, "");
      let score = 0;
      if (lower === q || cpt === compact) score = 300;
      else if (lower.startsWith(q) || cpt.startsWith(compact)) score = 200;
      else if (lower.includes(q) || cpt.includes(compact)) score = 100;
      else continue;
      scored.push({ name, score });
    }
    scored.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
    return scored.slice(0, 80).map((s) => s.name);
  }, [cities, query]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  useEffect(() => {
    function onDoc(e) {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const display = open ? query : value || "";

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <input
        type="text"
        autoComplete="off"
        className={
          inputClassName ||
          "h-8 w-full min-w-[140px] rounded border border-slate-300 bg-white px-2 text-xs dark:border-slate-600 dark:bg-slate-900"
        }
        placeholder={value ? String(value) : placeholder}
        value={display}
        onFocus={() => {
          setOpen(true);
          setQuery("");
        }}
        onChange={(e) => {
          setOpen(true);
          setQuery(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setOpen(false);
            setQuery("");
          }
          if (e.key === "Enter") {
            e.preventDefault();
            const first = list[0];
            if (first) {
              onChange?.(first);
              setOpen(false);
              setQuery("");
            }
          }
        }}
      />
      {value && !open ? (
        <button
          type="button"
          className="absolute right-1 top-1/2 -translate-y-1/2 rounded px-1 text-[10px] font-bold text-slate-400 hover:text-rose-600"
          title="Clear city"
          onClick={(e) => {
            e.stopPropagation();
            if (allowEmpty) onChange?.("");
            setOpen(true);
            setQuery("");
          }}
        >
          ✕
        </button>
      ) : null}
      {open ? (
        <ul className="absolute left-0 right-0 z-50 mt-1 max-h-56 overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg dark:border-slate-600 dark:bg-slate-900">
          {!cities.length ? (
            <li className="px-3 py-2 text-xs text-slate-500">Loading cities…</li>
          ) : !list.length ? (
            <li className="px-3 py-2 text-xs text-slate-500">No city match for “{query}”</li>
          ) : (
            list.map((c) => (
              <li key={c}>
                <button
                  type="button"
                  className={`block w-full px-3 py-1.5 text-left text-xs hover:bg-emerald-50 dark:hover:bg-emerald-950/40 ${
                    c === value ? "bg-emerald-50 font-semibold text-emerald-800 dark:bg-emerald-950/50" : ""
                  }`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onChange?.(c);
                    setOpen(false);
                    setQuery("");
                  }}
                >
                  {c}
                </button>
              </li>
            ))
          )}
          {cities.length && query.trim() === "" ? (
            <li className="border-t border-slate-100 px-3 py-1.5 text-[10px] text-slate-400 dark:border-slate-700">
              Type to search all {cities.length} cities
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}

function courierFormFromSettings(courier = {}) {
  return {
    postexApiKey: courier.postexApiKey || "",
    postexAddressCode: courier.postexAddressCode || "",
    originCity: courier.originCity || "Gujranwala",
    defaultWeight: courier.defaultWeight ?? 0.5,
    shipperRemarks:
      courier.shipperRemarks ||
      "Call customer before delivery. Do not leave parcel unattended.",
    defaultShipperType: courier.defaultShipperType || "Normal",
    defaultHandling: courier.defaultHandling || "Normal",
    autoCreateShipment: Boolean(courier.autoCreateShipment),
    autoSaveTracking: courier.autoSaveTracking !== false,
    printItemDetails: Boolean(courier.printItemDetails),
    printItemDetailsSku: Boolean(courier.printItemDetailsSku),
    autoCalculateWeight: Boolean(courier.autoCalculateWeight),
    autoCalculatePieces: Boolean(courier.autoCalculatePieces),
    paidOrdersCodZero: Boolean(courier.paidOrdersCodZero),
    addOrderNotesInRemarks: Boolean(courier.addOrderNotesInRemarks),
  };
}

export default function PostexApp() {
  const [tab, setTab] = useState("booking");
  const [cities, setCities] = useState([]);
  const [settings, setSettings] = useState(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    fetch("/api/postex/cities")
      .then((r) => r.json())
      .then((j) => setCities(Array.isArray(j.cities) ? j.cities : []))
      .catch(() => setCities([]));
    fetch("/api/settings", { credentials: "include" })
      .then((r) => r.json())
      .then((j) => setSettings(j.settings || j.data || j || {}))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(""), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const courier = settings?.courier || {};

  return (
    <div className="min-h-[70vh] rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 px-3 py-2 dark:border-slate-700">
        <div className="mr-3 flex items-center gap-2 px-2 py-1">
          <span className="text-lg font-black tracking-tight text-[#0B6E4F]">PostEx</span>
          <span className="hidden text-xs text-slate-500 sm:inline">Courier</span>
        </div>
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
              tab === t.id
                ? "bg-[#0B6E4F] text-white"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {toast ? (
        <div className="mx-4 mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
          {toast}
        </div>
      ) : null}

      <div className="p-4">
        {tab === "dashboard" ? <DashboardTab courier={courier} onGo={setTab} /> : null}
        {tab === "booking" ? (
          <BookingTab
            cities={cities}
            courier={courier}
            onToast={setToast}
            onDownload={downloadLabel}
          />
        ) : null}
        {tab === "labels" ? <LabelsTab onToast={setToast} onDownload={downloadLabel} /> : null}
        {tab === "loadsheet" ? <LoadsheetTab onToast={setToast} /> : null}
        {tab === "cancel" ? <CancelTab onToast={setToast} /> : null}
        {tab === "settings" ? (
          <SettingsTab
            courier={courier}
            settings={settings}
            setSettings={setSettings}
            onToast={setToast}
          />
        ) : null}
      </div>
    </div>
  );
}

function DashboardTab({ courier, onGo }) {
  const configured = Boolean(courier.postexApiKey || courier.postexAddressCode);
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">PostEx Courier</h1>
        <p className="mt-1 text-sm text-slate-500">
          Book parcels, print labels, and manage shipments — same workflow as the PostEx Shopify app.
        </p>
      </div>
      <ol className="space-y-3 text-sm text-slate-700 dark:text-slate-300">
        <li className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
          <strong>1.</strong> Create / open your PostEx merchant account.
        </li>
        <li className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
          <strong>2.</strong> Copy your <strong>PostEx API token</strong> from the PostEx portal.
        </li>
        <li className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
          <strong>3.</strong> Save token + pickup address in{" "}
          <button type="button" className="font-semibold text-[#0B6E4F] underline" onClick={() => onGo("settings")}>
            Settings
          </button>
          {configured ? (
            <span className="ml-2 rounded bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">Configured</span>
          ) : (
            <span className="ml-2 rounded bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">Needed</span>
          )}
        </li>
        <li className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
          <strong>4.</strong> Open{" "}
          <button type="button" className="font-semibold text-[#0B6E4F] underline" onClick={() => onGo("booking")}>
            Add Booking
          </button>
          , map cities, then Save — the shipping slip PDF downloads automatically.
        </li>
        <li className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
          <strong>5.</strong> Use Print Labels / Loadsheet for already booked parcels.
        </li>
      </ol>
      <p className="text-xs text-slate-500">
        Support: techsupport@postex.pk · Or manage courier keys under{" "}
        <Link href="/settings" className="text-[#0B6E4F] underline">
          Store Settings → Courier
        </Link>
        .
      </p>
    </div>
  );
}

function BookingTab({ cities, courier, onToast, onDownload }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(() => new Set());
  const [rows, setRows] = useState({});
  const [filters, setFilters] = useState({
    search: "",
    paymentStatus: "",
    status: "",
    from: "",
  });
  const [detail, setDetail] = useState(null);
  const [booking, setBooking] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ mode: "unbooked", limit: "80" });
      if (filters.search) qs.set("search", filters.search);
      if (filters.paymentStatus) qs.set("paymentStatus", filters.paymentStatus);
      if (filters.status) qs.set("status", filters.status);
      if (filters.from) qs.set("from", filters.from);
      const res = await fetch(`/api/postex/orders?${qs}`);
      const json = await res.json();
      const list = json.orders || [];
      setOrders(list);
      const next = {};
      for (const o of list) {
        next[o.id] = {
          city: o.suggestedCity || o.city,
          weight: courier.defaultWeight || o.weight || 0.5,
          type: courier.defaultShipperType || "Normal",
          pieces: o.pieces || 1,
        };
      }
      setRows(next);
      setSelected(new Set());
    } finally {
      setLoading(false);
    }
  }, [filters, courier.defaultWeight, courier.defaultShipperType]);

  useEffect(() => {
    void load();
  }, [load]);

  function patchRow(id, partial) {
    setRows((prev) => ({ ...prev, [id]: { ...prev[id], ...partial } }));
  }

  async function bookOne(order, extra = {}) {
    const row = rows[order.id] || {};
    const mappedCity = extra.city || row.city || order.suggestedCity || order.city;
    const street = String(extra.street ?? order.street ?? "").trim();
    const area = String(extra.area ?? order.area ?? "").trim();
    const phone = String(extra.phone ?? order.phone ?? "").trim();
    const deliveryAddress = String(
      extra.deliveryAddress ||
        [street, area].filter(Boolean).join(", ") ||
        order.deliveryAddressPreview ||
        ""
    ).trim();

    const res = await fetch("/api/postex/create-shipment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId: order.id,
        handling: extra.handling || courier.defaultHandling || "Normal",
        weight: Number(extra.weight || row.weight) || 0.5,
        pieces: Number(extra.pieces || row.pieces) || 1,
        invoiceDivision: Number(extra.invoiceDivision) || 1,
        remarks: extra.remarks || courier.shipperRemarks || "",
        paymentMethod: extra.paymentMethod || order.paymentMethod || "manual",
        cityName: mappedCity || "",
        deliveryAddress,
        shippingAddress: {
          street,
          area,
          phone,
          city: mappedCity || "",
        },
      }),
    });
    const json = await res.json();
    if (!json.success) {
      const suggest =
        Array.isArray(json.suggestions) && json.suggestions.length
          ? ` Try: ${json.suggestions.slice(0, 3).join(", ")}`
          : "";
      throw new Error(`${json.error || "Booking failed"}${suggest}`);
    }
    if (json.labelDownloadUrl) onDownload(json.labelDownloadUrl);
    return json;
  }

  async function bookSelected() {
    const ids = [...selected];
    if (!ids.length) {
      onToast("Select at least one order.");
      return;
    }
    // Recheck first selected order details before bulk — open modal for review.
    if (ids.length === 1) {
      const order = orders.find((o) => o.id === ids[0]);
      if (order) {
        setDetail(order);
        return;
      }
    }
    const okConfirm = window.confirm(
      `Book ${ids.length} orders with PostEx?\n\nOpen each order's Details (eye icon) to recheck phone/address before booking.\nContinue bulk book with auto-cleaned addresses?`
    );
    if (!okConfirm) return;
    setBooking(true);
    let ok = 0;
    let fail = 0;
    const failMsgs = [];
    for (const id of ids) {
      const order = orders.find((o) => o.id === id);
      if (!order) continue;
      try {
        await bookOne(order, { city: rows[id]?.city || order.suggestedCity || order.city });
        ok += 1;
      } catch (err) {
        fail += 1;
        failMsgs.push(`${order.orderNumber}: ${err?.message || "failed"}`);
      }
    }
    setBooking(false);
    if (fail) {
      onToast(
        `Booked ${ok}, failed ${fail}. ${failMsgs.slice(0, 2).join(" · ")}${failMsgs.length > 2 ? "…" : ""}`
      );
    } else {
      onToast(`Booked ${ok} order(s). PDFs download automatically.`);
    }
    await load();
  }

  async function saveDetail(form) {
    if (!detail) return;
    setBooking(true);
    try {
      patchRow(detail.id, { city: form.city, weight: form.weight, pieces: form.pieces });
      const json = await bookOne(detail, form);
      onToast(`Booked ${detail.orderNumber} — ${json.trackingNumber}. Slip downloading…`);
      setDetail(null);
      await load();
    } catch (e) {
      onToast(e.message || "Booking failed");
    } finally {
      setBooking(false);
    }
  }

  const allSelected = orders.length > 0 && selected.size === orders.length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Create Booking with PostEx</h2>
          <p className="text-sm text-slate-500">
            Open Details to recheck phone/address, then Confirm &amp; book. Slip PDF downloads automatically.
          </p>
        </div>
        <button
          type="button"
          disabled={booking || !selected.size}
          onClick={() => void bookSelected()}
          className="rounded-lg bg-[#0B6E4F] px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
        >
          {booking ? "Booking…" : selected.size === 1 ? "Recheck & book (1)" : `Book selected (${selected.size})`}
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
        <input
          className="h-9 rounded border border-slate-300 px-3 text-sm dark:border-slate-600 dark:bg-slate-900"
          placeholder="Search Order #"
          value={filters.search}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
        />
        <input
          type="date"
          className="h-9 rounded border border-slate-300 px-3 text-sm dark:border-slate-600 dark:bg-slate-900"
          value={filters.from}
          onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
        />
        <select
          className="h-9 rounded border border-slate-300 px-2 text-sm dark:border-slate-600 dark:bg-slate-900"
          value={filters.paymentStatus}
          onChange={(e) => setFilters((f) => ({ ...f, paymentStatus: e.target.value }))}
        >
          <option value="">Financial Status</option>
          <option value="unpaid">Unpaid</option>
          <option value="paid">Paid</option>
          <option value="partial">Partial</option>
        </select>
        <select
          className="h-9 rounded border border-slate-300 px-2 text-sm dark:border-slate-600 dark:bg-slate-900"
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
        >
          <option value="">Fulfillment Status</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="processing">Processing</option>
          <option value="packed">Packed</option>
        </select>
        <button
          type="button"
          onClick={() => void load()}
          className="h-9 rounded bg-[#22C55E] px-4 text-sm font-bold text-white"
        >
          Search
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-900 text-xs uppercase tracking-wide text-white">
            <tr>
              <th className="px-2 py-2">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(e) => {
                    if (e.target.checked) setSelected(new Set(orders.map((o) => o.id)));
                    else setSelected(new Set());
                  }}
                />
              </th>
              <th className="px-2 py-2">#</th>
              <th className="px-2 py-2">Order</th>
              <th className="px-2 py-2">Name</th>
              <th className="px-2 py-2">Phone</th>
              <th className="px-2 py-2">Address</th>
              <th className="px-2 py-2">City</th>
              <th className="px-2 py-2">City (PostEx)</th>
              <th className="px-2 py-2">COD</th>
              <th className="px-2 py-2">KG</th>
              <th className="px-2 py-2">Type</th>
              <th className="px-2 py-2">Details</th>
              <th className="px-2 py-2">OK</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={13} className="px-3 py-8 text-center text-slate-500">
                  Loading orders…
                </td>
              </tr>
            ) : !orders.length ? (
              <tr>
                <td colSpan={13} className="px-3 py-8 text-center text-slate-500">
                  No unbooked orders found.
                </td>
              </tr>
            ) : (
              orders.map((o, idx) => {
                const row = rows[o.id] || {};
                const cityOk = Boolean(row.city);
                return (
                  <tr key={o.id} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="px-2 py-2">
                      <input
                        type="checkbox"
                        checked={selected.has(o.id)}
                        onChange={(e) => {
                          setSelected((prev) => {
                            const n = new Set(prev);
                            if (e.target.checked) n.add(o.id);
                            else n.delete(o.id);
                            return n;
                          });
                        }}
                      />
                    </td>
                    <td className="px-2 py-2 text-slate-500">{idx + 1}</td>
                    <td className="px-2 py-2 font-semibold">
                      <Link href={`/orders/${o.id}`} className="text-[#0B6E4F] hover:underline">
                        #{o.orderNumber}
                      </Link>
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap">{o.name}</td>
                    <td className="px-2 py-2 whitespace-nowrap">{o.phone}</td>
                    <td className="max-w-[180px] truncate px-2 py-2" title={o.address}>
                      {o.address}
                    </td>
                    <td className="px-2 py-2">
                      <div className="text-xs">{o.city || "—"}</div>
                      {o.suggestedCity &&
                      String(o.suggestedCity).trim() &&
                      (o.city
                        ? String(o.city).trim().toLowerCase() !== String(o.suggestedCity).trim().toLowerCase()
                        : true) ? (
                        <div className="mt-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400">
                          → {o.suggestedCity}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-2 py-2">
                      <CitySearchSelect
                        cities={cities}
                        value={row.city || ""}
                        onChange={(city) => patchRow(o.id, { city })}
                        className="min-w-[160px]"
                      />
                    </td>
                    <td className="px-2 py-2 font-medium">{o.cod}</td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        step="0.1"
                        min="0.1"
                        className="h-8 w-16 rounded border border-slate-300 px-1 text-xs dark:border-slate-600 dark:bg-slate-900"
                        value={row.weight ?? 0.5}
                        onChange={(e) => patchRow(o.id, { weight: e.target.value })}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <select
                        className="h-8 rounded border border-slate-300 text-xs dark:border-slate-600 dark:bg-slate-900"
                        value={row.type || "Normal"}
                        onChange={(e) => patchRow(o.id, { type: e.target.value })}
                      >
                        {SHIP_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-2">
                      <button
                        type="button"
                        className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold hover:bg-slate-50 dark:border-slate-600"
                        onClick={() =>
                          setDetail({
                            ...o,
                            suggestedCity: row.city || o.suggestedCity || o.city,
                            weight: row.weight || 0.5,
                            pieces: row.pieces || 1,
                          })
                        }
                      >
                        ☰
                      </button>
                    </td>
                    <td className="px-2 py-2 text-center text-lg">
                      {cityOk && o.phone ? (
                        <span className="text-emerald-500" title="Ready">
                          ●
                        </span>
                      ) : (
                        <span className="text-rose-500" title="Missing city or phone">
                          ●
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {detail ? (
        <DetailsModal
          order={detail}
          cities={cities}
          courier={courier}
          busy={booking}
          onClose={() => setDetail(null)}
          onSave={saveDetail}
        />
      ) : null}
    </div>
  );
}

function DetailsModal({ order, cities, courier, busy, onClose, onSave }) {
  const rowCity = order.suggestedCity || order.city || "";
  const [form, setForm] = useState({
    name: order.name || "",
    phone: order.phone || "",
    street: order.street || "",
    area: order.area || "",
    city: rowCity,
    province: order.province || "",
    email: order.email || "",
    pieces: order.pieces || 1,
    invoiceDivision: 1,
    paymentMethod: order.paymentMethod || "manual",
    handling: courier.defaultHandling || "Normal",
    weight: order.weight || courier.defaultWeight || 0.5,
    productsNote: "-",
    remarks: courier.shipperRemarks || "Call customer before delivery. Do not leave parcel unattended.",
    deliveryAddress: order.deliveryAddressPreview || order.street || "",
  });

  const previewAddress = [form.street, form.area].filter(Boolean).join(", ") || form.deliveryAddress;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-5 shadow-2xl dark:bg-slate-900">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold">Recheck before booking: #{order.orderNumber}</h3>
            <p className="text-xs text-slate-500">
              Confirm phone &amp; address. City is sent separately to PostEx (not repeated in address).
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-500 hover:text-slate-800">
            ✕
          </button>
        </div>

        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-900/50 dark:bg-amber-950/30">
          <p className="text-xs font-semibold uppercase text-amber-800 dark:text-amber-300">
            PostEx delivery address preview
          </p>
          <p className="mt-1 font-medium text-slate-900 dark:text-white">{previewAddress || "—"}</p>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            Destination city: <strong>{form.city || "—"}</strong>
            {order.cityNeedsMap ? (
              <span className="ml-2 text-amber-700">(mapped from “{order.city}”)</span>
            ) : null}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Consignee / shipping</p>
            <label className="block text-xs font-semibold uppercase text-slate-500">
              Full name
              <input
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </label>
            <label className="block text-xs font-semibold uppercase text-slate-500">
              Phone
              <input
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </label>
            <label className="block text-xs font-semibold uppercase text-slate-500">
              Address (street only — once)
              <textarea
                rows={3}
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
                value={form.street}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    street: e.target.value,
                    deliveryAddress: [e.target.value, f.area].filter(Boolean).join(", "),
                  }))
                }
              />
            </label>
            <label className="block text-xs font-semibold uppercase text-slate-500">
              Area
              <input
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
                value={form.area}
                placeholder="Optional"
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    area: e.target.value,
                    deliveryAddress: [f.street, e.target.value].filter(Boolean).join(", "),
                  }))
                }
              />
            </label>
            <label className="block text-xs font-semibold uppercase text-slate-500">
              City (PostEx operational)
              <div className="mt-1">
                <CitySearchSelect
                  cities={cities}
                  value={form.city || ""}
                  onChange={(city) => setForm((f) => ({ ...f, city }))}
                  inputClassName="h-10 w-full rounded border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
                  placeholder="Type city name to search…"
                />
              </div>
            </label>
            <label className="block text-xs font-semibold uppercase text-slate-500">
              Province
              <input
                readOnly
                className="mt-1 w-full rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                value={form.province || "—"}
              />
            </label>
          </div>
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Shipment options</p>
            <label className="block text-xs font-semibold uppercase text-slate-500">
              Pickup Location
              <input
                readOnly
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
                value={courier.postexAddressCode || "Set in Settings"}
              />
            </label>
            <label className="block text-xs font-semibold uppercase text-slate-500">
              Handling
              <select
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
                value={form.handling}
                onChange={(e) => setForm((f) => ({ ...f, handling: e.target.value }))}
              >
                {HANDLING_OPTS.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-3 gap-2">
              <label className="block text-xs font-semibold uppercase text-slate-500">
                Pieces
                <input
                  type="number"
                  min={1}
                  className="mt-1 w-full rounded border border-slate-300 px-2 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
                  value={form.pieces}
                  onChange={(e) => setForm((f) => ({ ...f, pieces: e.target.value }))}
                />
              </label>
              <label className="block text-xs font-semibold uppercase text-slate-500">
                Invoice Div.
                <input
                  type="number"
                  min={1}
                  className="mt-1 w-full rounded border border-slate-300 px-2 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
                  value={form.invoiceDivision}
                  onChange={(e) => setForm((f) => ({ ...f, invoiceDivision: e.target.value }))}
                />
              </label>
              <label className="block text-xs font-semibold uppercase text-slate-500">
                Weight
                <input
                  type="number"
                  step="0.1"
                  className="mt-1 w-full rounded border border-slate-300 px-2 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
                  value={form.weight}
                  onChange={(e) => setForm((f) => ({ ...f, weight: e.target.value }))}
                />
              </label>
            </div>
            <p className="text-xs font-semibold uppercase text-slate-500">Fulfillment products</p>
            <div className="rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-700">
              {(order.items || []).map((it, i) => (
                <p key={i} className="mb-1">
                  <span className="font-bold">{it.quantity}</span> × {it.name}
                </p>
              ))}
              {!order.items?.length ? <p className="text-slate-400">No line items</p> : null}
            </div>
          </div>
        </div>
        <label className="mt-3 block text-xs font-semibold uppercase text-slate-500">
          Remarks
          <textarea
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
            rows={3}
            value={form.remarks}
            onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))}
          />
        </label>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600">
            Cancel
          </button>
          <button
            type="button"
            disabled={busy || !form.city || !form.phone || !form.street}
            onClick={() =>
              onSave({
                ...form,
                deliveryAddress: previewAddress,
              })
            }
            className="rounded-lg bg-[#2563EB] px-5 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            {busy ? "Booking…" : "Confirm & book with PostEx"}
          </button>
        </div>
      </div>
    </div>
  );
}

function LabelsTab({ onToast, onDownload }) {
  const [orders, setOrders] = useState([]);
  const [selected, setSelected] = useState(() => new Set());
  const [from, setFrom] = useState(todayISO());
  const [to, setTo] = useState(todayISO());
  const [loading, setLoading] = useState(false);
  const [printing, setPrinting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ mode: "booked", limit: "100", from, to });
      const res = await fetch(`/api/postex/orders?${qs}`);
      const json = await res.json();
      setOrders(json.orders || []);
      setSelected(new Set());
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  function downloadSelected() {
    const list = orders.filter((o) => selected.has(o.id) && o.trackingNumber);
    if (!list.length) {
      onToast("Select booked orders with tracking numbers.");
      return;
    }
    const trackingNumbers = list.map((o) => o.trackingNumber).join(",");
    const orderIds = list.map((o) => o.id).join(",");
    setPrinting(true);
    onDownload(
      `/api/postex/label?trackingNumbers=${encodeURIComponent(trackingNumbers)}&orderIds=${encodeURIComponent(orderIds)}`
    );
    onToast(
      list.length === 1
        ? "Opening label PDF…"
        : `Opening 1 PDF with ${list.length} labels…`
    );
    window.setTimeout(() => setPrinting(false), 1500);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <img alt="" className="hidden" />
        <span className="mr-2 text-lg font-black text-[#0B6E4F]">PostEx</span>
        <input type="date" className="h-9 rounded border px-2 text-sm" value={from} onChange={(e) => setFrom(e.target.value)} />
        <input type="date" className="h-9 rounded border px-2 text-sm" value={to} onChange={(e) => setTo(e.target.value)} />
        <button type="button" onClick={() => void load()} className="h-9 rounded bg-[#22C55E] px-4 text-sm font-bold text-white">
          Search
        </button>
        <button
          type="button"
          onClick={downloadSelected}
          disabled={printing || selected.size === 0}
          className="ml-auto h-9 rounded bg-[#22C55E] px-4 text-sm font-bold text-white disabled:opacity-60"
        >
          {printing ? "Opening…" : "Download Label"}
        </button>
      </div>
      <p className="text-xs text-slate-500">
        Select one or more booked orders — labels open as a single PDF (all pages together for printing).
      </p>
      <BookedTable
        orders={orders}
        loading={loading}
        selected={selected}
        setSelected={setSelected}
        showTracking
      />
    </div>
  );
}

function LoadsheetTab({ onToast }) {
  const [orders, setOrders] = useState([]);
  const [from, setFrom] = useState(todayISO());
  const [to, setTo] = useState(todayISO());

  async function load() {
    const qs = new URLSearchParams({ mode: "booked", limit: "200", from, to });
    const res = await fetch(`/api/postex/orders?${qs}`);
    const json = await res.json();
    setOrders(json.orders || []);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function printSheet() {
    if (!orders.length) {
      onToast("No booked orders in range.");
      return;
    }
    const w = window.open("", "_blank");
    if (!w) return;
    const rows = orders
      .map(
        (o, i) =>
          `<tr><td>${i + 1}</td><td>${o.orderNumber}</td><td>${o.trackingNumber}</td><td>${o.name}</td><td>${o.phone}</td><td>${o.city}</td><td>${o.cod}</td><td>${o.address}</td></tr>`
      )
      .join("");
    w.document.write(`<!doctype html><html><head><title>PostEx Loadsheet</title>
      <style>body{font-family:system-ui;padding:24px}table{border-collapse:collapse;width:100%;font-size:12px}
      th,td{border:1px solid #ccc;padding:6px;text-align:left}th{background:#111;color:#fff}</style></head>
      <body><h1>PostEx Loadsheet</h1><p>${from} → ${to} · ${orders.length} parcels</p>
      <table><thead><tr><th>#</th><th>Order</th><th>Tracking</th><th>Name</th><th>Phone</th><th>City</th><th>COD</th><th>Address</th></tr></thead>
      <tbody>${rows}</tbody></table>
      <script>window.print()</script></body></html>`);
    w.document.close();
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Generate Loadsheet</h2>
      <div className="flex flex-wrap gap-2">
        <input type="date" className="h-9 rounded border px-2 text-sm" value={from} onChange={(e) => setFrom(e.target.value)} />
        <input type="date" className="h-9 rounded border px-2 text-sm" value={to} onChange={(e) => setTo(e.target.value)} />
        <button type="button" onClick={() => void load()} className="h-9 rounded bg-[#22C55E] px-4 text-sm font-bold text-white">
          Search
        </button>
        <button type="button" onClick={printSheet} className="h-9 rounded bg-slate-900 px-4 text-sm font-bold text-white">
          Print / Export Loadsheet
        </button>
      </div>
      <p className="text-sm text-slate-500">{orders.length} booked parcel(s) in range.</p>
      <BookedTable orders={orders} loading={false} selected={new Set()} setSelected={() => {}} showTracking />
    </div>
  );
}

function CancelTab({ onToast }) {
  const [orders, setOrders] = useState([]);
  const [selected, setSelected] = useState(() => new Set());
  const [busy, setBusy] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);

  async function load() {
    const res = await fetch("/api/postex/orders?mode=booked&limit=100");
    const json = await res.json();
    setOrders(json.orders || []);
    setSelected(new Set());
  }

  useEffect(() => {
    void load();
  }, []);

  const allSelected = orders.length > 0 && selected.size === orders.length;

  function toggleOne(id, checked) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function toggleAll(checked) {
    if (!checked) {
      setSelected(new Set());
      return;
    }
    setSelected(new Set(orders.map((o) => o.id)));
  }

  async function cancelOne(o, { skipConfirm = false } = {}) {
    if (!skipConfirm && !confirm(`Cancel PostEx shipment ${o.trackingNumber} for #${o.orderNumber}?`)) {
      return { ok: false, skipped: true };
    }
    setBusy(o.id);
    try {
      const res = await fetch("/api/postex/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: o.id, trackingNumber: o.trackingNumber }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Cancel failed");
      if (!skipConfirm) {
        onToast(`Cancelled ${o.trackingNumber}`);
        await load();
      }
      return { ok: true };
    } catch (e) {
      if (!skipConfirm) onToast(e.message || "Cancel failed");
      return { ok: false, error: e.message || "Cancel failed" };
    } finally {
      setBusy("");
    }
  }

  async function cancelSelected() {
    const ids = [...selected];
    if (!ids.length) {
      onToast("Select at least one shipment.");
      return;
    }
    if (
      !confirm(
        `Cancel ${ids.length} PostEx shipment(s)?\n\nPostEx blocks cancel after pick-up. This cannot be undone.`
      )
    ) {
      return;
    }
    setBulkBusy(true);
    let ok = 0;
    let fail = 0;
    const failMsgs = [];
    for (const id of ids) {
      const order = orders.find((o) => o.id === id);
      if (!order) continue;
      const result = await cancelOne(order, { skipConfirm: true });
      if (result.ok) ok += 1;
      else {
        fail += 1;
        failMsgs.push(`${order.orderNumber}: ${result.error || "failed"}`);
      }
    }
    setBulkBusy(false);
    if (fail) {
      onToast(
        `Cancelled ${ok}, failed ${fail}. ${failMsgs.slice(0, 2).join(" · ")}${failMsgs.length > 2 ? "…" : ""}`
      );
    } else {
      onToast(`Cancelled ${ok} shipment(s).`);
    }
    await load();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Cancel Shipments</h2>
          <p className="text-sm text-slate-500">
            PostEx blocks cancel after pick-up. Tracking is cleared from processing status.
          </p>
        </div>
        <button
          type="button"
          disabled={bulkBusy || !selected.size}
          onClick={() => void cancelSelected()}
          className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
        >
          {bulkBusy ? "Cancelling…" : `Cancel selected (${selected.size})`}
        </button>
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-900 text-white">
            <tr>
              <th className="px-3 py-2 text-left">
                <input
                  type="checkbox"
                  checked={allSelected}
                  disabled={!orders.length || bulkBusy}
                  onChange={(e) => toggleAll(e.target.checked)}
                  aria-label="Select all"
                />
              </th>
              <th className="px-3 py-2 text-left">Order</th>
              <th className="px-3 py-2 text-left">Tracking</th>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">City</th>
              <th className="px-3 py-2 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            {!orders.length ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-slate-500">
                  No booked shipments found.
                </td>
              </tr>
            ) : (
              orders.map((o) => (
                <tr key={o.id} className="border-t">
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selected.has(o.id)}
                      disabled={bulkBusy || busy === o.id}
                      onChange={(e) => toggleOne(o.id, e.target.checked)}
                      aria-label={`Select ${o.orderNumber}`}
                    />
                  </td>
                  <td className="px-3 py-2 font-semibold">#{o.orderNumber}</td>
                  <td className="px-3 py-2">{o.trackingNumber}</td>
                  <td className="px-3 py-2">{o.name}</td>
                  <td className="px-3 py-2">{o.city}</td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      disabled={Boolean(busy) || bulkBusy}
                      onClick={() => void cancelOne(o)}
                      className="rounded bg-rose-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                    >
                      {busy === o.id ? "…" : "Cancel"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SettingsTab({ courier, settings, setSettings, onToast }) {
  const [form, setForm] = useState(() => courierFormFromSettings(courier));
  const [saving, setSaving] = useState(false);
  const [addresses, setAddresses] = useState([]);
  const [addrLoading, setAddrLoading] = useState(false);

  useEffect(() => {
    setForm(courierFormFromSettings(courier));
  }, [courier]);

  const loadAddresses = useCallback(async () => {
    setAddrLoading(true);
    try {
      const res = await fetch("/api/postex/addresses", { credentials: "include" });
      const json = await res.json();
      setAddresses(Array.isArray(json.addresses) ? json.addresses : []);
    } catch {
      setAddresses([]);
    } finally {
      setAddrLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAddresses();
  }, [loadAddresses]);

  const selectedAddress =
    addresses.find((a) => a.addressCode === String(form.postexAddressCode || "").trim()) || null;

  async function save() {
    setSaving(true);
    try {
      const nextCourier = {
        ...(settings?.courier || {}),
        ...form,
        defaultWeight: Math.max(0.1, Number(form.defaultWeight) || 0.5),
        postexApiKey: String(form.postexApiKey || "").trim(),
        postexAddressCode: String(form.postexAddressCode || "").trim(),
        originCity: String(form.originCity || "").trim() || "Gujranwala",
        shipperRemarks: String(form.shipperRemarks || "").trim(),
      };
      const res = await fetch("/api/settings", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courier: nextCourier }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        throw new Error(json.error || `Save failed (${res.status}). Admin role required.`);
      }
      const savedCourier = json.settings?.courier || json.data?.courier || nextCourier;
      setSettings((s) => ({ ...(s || {}), ...(json.settings || json.data || {}), courier: savedCourier }));
      setForm(courierFormFromSettings(savedCourier));
      onToast("PostEx settings saved.");
      await loadAddresses();
    } catch (e) {
      onToast(e.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function Toggle({ label, keyName }) {
    return (
      <label className="flex items-center justify-between gap-3 rounded border border-slate-200 px-3 py-2 text-sm dark:border-slate-700">
        <span>{label}</span>
        <input
          type="checkbox"
          checked={Boolean(form[keyName])}
          onChange={(e) => setForm((f) => ({ ...f, [keyName]: e.target.checked }))}
        />
      </label>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h2 className="text-xl font-bold">PostEx Courier</h2>
        <p className="text-sm text-slate-500">
          Enter PostEx settings. Help: techsupport@postex.pk
        </p>
      </div>
      <label className="block text-xs font-semibold uppercase text-slate-500">
        Token
        <input
          className="mt-1 w-full rounded border px-3 py-2 text-sm"
          value={form.postexApiKey}
          onChange={(e) => setForm((f) => ({ ...f, postexApiKey: e.target.value }))}
          placeholder="PostEx API token"
        />
      </label>
      <div>
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase text-slate-500">Pickup Address</span>
          <button
            type="button"
            onClick={() => void loadAddresses()}
            className="text-xs font-semibold text-[#0B6E4F] hover:underline"
          >
            {addrLoading ? "Loading…" : "Refresh from PostEx"}
          </button>
        </div>
        <select
          className="w-full rounded border px-3 py-2 text-sm"
          value={form.postexAddressCode}
          onChange={(e) => {
            const code = e.target.value;
            const addr = addresses.find((a) => a.addressCode === code);
            setForm((f) => ({
              ...f,
              postexAddressCode: code,
              originCity: addr?.cityName || f.originCity,
            }));
          }}
        >
          <option value="">{addresses.length ? "Select pickup address" : "No addresses loaded — check token"}</option>
          {addresses.map((a) => (
            <option key={a.addressCode} value={a.addressCode}>
              [{a.addressCode}] {a.address} — {a.cityName}
            </option>
          ))}
        </select>
        {selectedAddress ? (
          <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-slate-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-slate-200">
            <p className="font-bold text-emerald-800 dark:text-emerald-300">
              Code {selectedAddress.addressCode} · {selectedAddress.addressType || "Pickup"}
            </p>
            <p className="mt-1">{selectedAddress.address}</p>
            <p className="mt-1 text-slate-600 dark:text-slate-400">
              {selectedAddress.cityName}
              {selectedAddress.contactPersonName ? ` · ${selectedAddress.contactPersonName}` : ""}
            </p>
            <p className="mt-1 text-slate-600 dark:text-slate-400">
              Phone: {selectedAddress.phone1 || "—"}
              {selectedAddress.phone2 && selectedAddress.phone2 !== selectedAddress.phone1
                ? ` / ${selectedAddress.phone2}`
                : ""}
            </p>
          </div>
        ) : form.postexAddressCode ? (
          <p className="mt-2 text-xs text-amber-700">
            Code <strong>{form.postexAddressCode}</strong> is saved, but full details could not be loaded from PostEx yet.
          </p>
        ) : null}
      </div>
      <label className="block text-xs font-semibold uppercase text-slate-500">
        Origin City
        <input
          className="mt-1 w-full rounded border px-3 py-2 text-sm"
          value={form.originCity}
          onChange={(e) => setForm((f) => ({ ...f, originCity: e.target.value }))}
        />
      </label>
      <label className="block text-xs font-semibold uppercase text-slate-500">
        Default Weight
        <input
          type="number"
          step="0.1"
          className="mt-1 w-full rounded border px-3 py-2 text-sm"
          value={form.defaultWeight}
          onChange={(e) => setForm((f) => ({ ...f, defaultWeight: e.target.value }))}
        />
      </label>
      <label className="block text-xs font-semibold uppercase text-slate-500">
        Shipper Remarks
        <textarea
          className="mt-1 w-full rounded border px-3 py-2 text-sm"
          rows={3}
          value={form.shipperRemarks}
          onChange={(e) => setForm((f) => ({ ...f, shipperRemarks: e.target.value }))}
          placeholder="Shown as Remarks on PostEx labels (e.g. Call customer before delivery…)"
        />
        <span className="mt-1 block text-[11px] font-normal normal-case text-slate-500">
          Saved remarks are sent as PostEx <code className="rounded bg-slate-100 px-1">transactionNotes</code> and
          appear on new bookings’ labels. Already-printed labels stay unchanged — rebook to update.
        </span>
      </label>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="block text-xs font-semibold uppercase text-slate-500">
          Shipper Type
          <select
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
            value={form.defaultShipperType}
            onChange={(e) => setForm((f) => ({ ...f, defaultShipperType: e.target.value }))}
          >
            {SHIP_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-semibold uppercase text-slate-500">
          Shipper Handling
          <select
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
            value={form.defaultHandling}
            onChange={(e) => setForm((f) => ({ ...f, defaultHandling: e.target.value }))}
          >
            {HANDLING_OPTS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <Toggle label="Print Item Details" keyName="printItemDetails" />
        <Toggle label="Auto Calculate Weight" keyName="autoCalculateWeight" />
        <Toggle label="Print Item Details with SKU" keyName="printItemDetailsSku" />
        <Toggle label="Auto Calculate Pieces" keyName="autoCalculatePieces" />
        <Toggle label="Auto Order Fulfillment" keyName="autoCreateShipment" />
        <Toggle label="Calculate Paid orders as Zero" keyName="paidOrdersCodZero" />
        <Toggle label="Auto Save Tracking Details" keyName="autoSaveTracking" />
        <Toggle label="Add Order Notes in Remarks" keyName="addOrderNotesInRemarks" />
      </div>
      <button
        type="button"
        disabled={saving}
        onClick={() => void save()}
        className="w-full rounded-lg bg-[#2563EB] py-3 text-sm font-bold text-white disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save Settings"}
      </button>
    </div>
  );
}

function BookedTable({ orders, loading, selected, setSelected, showTracking }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-900 text-xs uppercase text-white">
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
            <th className="px-2 py-2 text-left">#</th>
            <th className="px-2 py-2 text-left">Date</th>
            <th className="px-2 py-2 text-left">Order</th>
            <th className="px-2 py-2 text-left">Name</th>
            <th className="px-2 py-2 text-left">Phone</th>
            <th className="px-2 py-2 text-left">Address</th>
            <th className="px-2 py-2 text-left">City</th>
            <th className="px-2 py-2 text-left">COD</th>
            {showTracking ? <th className="px-2 py-2 text-left">Tracking</th> : null}
            <th className="px-2 py-2 text-left">Status</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={11} className="px-3 py-6 text-center text-slate-500">
                Loading…
              </td>
            </tr>
          ) : (
            orders.map((o, i) => (
              <tr key={o.id} className="border-t border-slate-100 dark:border-slate-800">
                <td className="px-2 py-2">
                  <input
                    type="checkbox"
                    checked={selected.has(o.id)}
                    onChange={(e) => {
                      setSelected((prev) => {
                        const n = new Set(prev);
                        if (e.target.checked) n.add(o.id);
                        else n.delete(o.id);
                        return n;
                      });
                    }}
                  />
                </td>
                <td className="px-2 py-2">{i + 1}</td>
                <td className="px-2 py-2 whitespace-nowrap">
                  {o.createdAt ? new Date(o.createdAt).toLocaleString() : "—"}
                </td>
                <td className="px-2 py-2 font-semibold">{o.orderNumber}</td>
                <td className="px-2 py-2">{o.name}</td>
                <td className="px-2 py-2">{o.phone}</td>
                <td className="max-w-[160px] truncate px-2 py-2">{o.address}</td>
                <td className="px-2 py-2">{o.city}</td>
                <td className="px-2 py-2">{o.cod}</td>
                {showTracking ? <td className="px-2 py-2 font-mono text-xs">{o.trackingNumber}</td> : null}
                <td className="px-2 py-2">{o.orderStatus}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      <p className="py-2 text-center text-xs text-slate-400">Powered by PostEx</p>
    </div>
  );
}
