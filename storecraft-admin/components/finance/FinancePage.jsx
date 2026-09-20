"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";

function formatMoney(n) {
  const num = Number(n) || 0;
  return `Rs. ${num.toLocaleString("en-PK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function monthStartPkt() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (t) => parts.find((p) => p.type === t)?.value || "01";
  return `${get("year")}-${get("month")}-01`;
}

function todayPkt() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function StatCard({ title, value, subtitle, accent, tone }) {
  const valueClass =
    tone === "loss"
      ? "text-rose-600 dark:text-rose-400"
      : tone === "profit" || accent
        ? "text-[#1A7A4C]"
        : "text-slate-900 dark:text-white";
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {title}
      </p>
      <p className={["mt-2 text-xl font-bold tabular-nums", valueClass].join(" ")}>{value}</p>
      {subtitle ? <p className="mt-1 text-xs text-slate-500">{subtitle}</p> : null}
    </div>
  );
}

function profitLabel(n) {
  const v = Number(n) || 0;
  if (v > 0.005) return { text: "Profit", tone: "profit" };
  if (v < -0.005) return { text: "Loss", tone: "loss" };
  return { text: "Break-even", tone: "" };
}

export function FinancePage() {
  const [from, setFrom] = useState(monthStartPkt);
  const [to, setTo] = useState(todayPkt);
  const [summary, setSummary] = useState(null);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const dragDepth = useRef(0);

  const query = useMemo(() => {
    const p = new URLSearchParams();
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    return p.toString();
  }, [from, to]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sumRes, batRes] = await Promise.all([
        fetch(`/api/finance/summary?${query}`, { credentials: "include" }),
        fetch("/api/finance/settlements?limit=40", { credentials: "include" }),
      ]);
      const sumJson = await sumRes.json();
      const batJson = await batRes.json();
      if (!sumRes.ok || !sumJson.success) {
        toast.error(sumJson.error || "Could not load finance summary.");
      } else {
        setSummary(sumJson.summary);
      }
      if (!batRes.ok || !batJson.success) {
        toast.error(batJson.error || "Could not load settlements.");
      } else {
        setBatches(batJson.batches || []);
      }
    } catch {
      toast.error("Network error loading finance.");
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    void load();
  }, [load]);

  async function uploadFiles(fileList) {
    const files = [...(fileList || [])].filter(Boolean);
    if (!files.length) return;
    setUploading(true);
    try {
      const fd = new FormData();
      for (const file of files) fd.append("files", file);
      const res = await fetch("/api/finance/settlements/upload", {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error || "Upload failed.");
        return;
      }
      const count = json.count || json.batchIds?.length || 1;
      const src =
        json.source === "screenshot"
          ? "screenshot"
          : json.source === "excel"
            ? "Excel/CSV"
            : "PDF";
      toast.success(
        count > 1
          ? `Uploaded ${count} settlements (${src}): ${json.matchedCount}/${json.lineCount} matched`
          : `Uploaded ${json.cprNumber} (${src}): ${json.matchedCount}/${json.lineCount} matched`
      );
      const profit = Number(json.profitTotal ?? json.batches?.[0]?.profitTotal);
      if (Number.isFinite(profit) && json.matchedCount > 0) {
        const tag = profitLabel(profit);
        toast(
          `${tag.text}: ${formatMoney(profit)} (after product prices)`,
          { icon: tag.tone === "loss" ? "📉" : "📈" }
        );
      }
      if (json.errors?.length) {
        toast.error(`${json.errors.length} file(s) skipped — see details in console.`);
        console.warn("Settlement upload skips", json.errors);
      }
      await load();
      if (json.batchId) {
        const returns = Number(json.batches?.[0]?.returnedCount ?? json.returnedCount) || 0;
        // Prefer opening the return confirmation boxes when the sheet has returns
        const hash =
          returns > 0 || (json.batches || []).some((b) => (b.returnedCount || 0) > 0)
            ? "?tab=returns"
            : "";
        window.location.href = `/finance/settlements/${json.batchId}${hash}`;
      }
    } catch {
      toast.error("Upload network error.");
    } finally {
      setUploading(false);
    }
  }

  async function onUpload(e) {
    const list = e.target.files;
    e.target.value = "";
    await uploadFiles(list);
  }

  function onDragEnter(e) {
    e.preventDefault();
    e.stopPropagation();
    dragDepth.current += 1;
    setDragOver(true);
  }

  function onDragOverZone(e) {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
  }

  function onDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragOver(false);
  }

  function onDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    dragDepth.current = 0;
    setDragOver(false);
    const list = e.dataTransfer?.files;
    if (list?.length) void uploadFiles(list);
  }

  function setThisMonth() {
    setFrom(monthStartPkt());
    setTo(todayPkt());
  }

  function setLastMonth() {
    const [y, m] = monthStartPkt().split("-").map(Number);
    const lastMonth = m === 1 ? 12 : m - 1;
    const year = m === 1 ? y - 1 : y;
    const fromStr = `${year}-${String(lastMonth).padStart(2, "0")}-01`;
    const lastDay = new Date(year, lastMonth, 0).getDate();
    setFrom(fromStr);
    setTo(`${year}-${String(lastMonth).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Finance</h1>
          <p className="mt-1 text-sm text-slate-500">
            Drag &amp; drop courier payment files — we match orders, shipping, GST, and net received.
          </p>
        </div>
      </div>

      <div
        role="button"
        tabIndex={0}
        aria-label="Drag and drop remittance files here"
        onDragEnter={onDragEnter}
        onDragOver={onDragOverZone}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={[
          "relative rounded-xl border-2 border-dashed px-6 py-10 text-center transition-all",
          uploading ? "pointer-events-none opacity-70" : "",
          dragOver
            ? "scale-[1.01] border-[#1d6fb8] bg-[#1d6fb8]/10 shadow-md"
            : "border-slate-300 bg-white hover:border-[#1d6fb8]/70 dark:border-slate-600 dark:bg-slate-900",
        ].join(" ")}
      >
        {dragOver ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-xl bg-[#1d6fb8]/15">
            <p className="text-base font-bold text-[#1d6fb8]">Drop files to upload</p>
          </div>
        ) : null}
        <p className="text-base font-semibold text-slate-900 dark:text-white">
          Drag &amp; drop files here
        </p>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          PostEx CPR PDF · CPR_Transactions CSV/Excel · Run Courier sheet · screenshots
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Tip: use PostEx “CPR Transactions” CSV (TRACKING_NUMBER column) or drop multiple CPR PDFs at once
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#1d6fb8] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#185a96]">
            {uploading ? "Reading upload…" : "Or browse files"}
            <input
              type="file"
              accept="application/pdf,.pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,.xlsx,.xls,.csv,text/csv,image/png,image/jpeg,image/jpg,image/webp,.png,.jpg,.jpeg,.webp"
              multiple
              className="hidden"
              disabled={uploading}
              onChange={onUpload}
            />
          </label>
          <span className="text-xs text-slate-400">You can drop multiple files at once</span>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <div>
          <label className="block text-xs font-semibold text-slate-500">From</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500">To</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
          />
        </div>
        <button
          type="button"
          onClick={setThisMonth}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-800"
        >
          This month
        </button>
        <button
          type="button"
          onClick={setLastMonth}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-800"
        >
          Last month
        </button>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-50 dark:border-slate-600"
        >
          Refresh
        </button>
      </div>

      {loading && !summary ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Paid order revenue"
            value={formatMoney(summary?.orderRevenuePaid)}
            subtitle="Orders marked paid in range"
          />
          <StatCard
            title="Remittance received"
            value={formatMoney(summary?.remittanceReceived)}
            subtitle="Posted CPR net total"
          />
          <StatCard
            title="Shipping + GST + 4% tax"
            value={formatMoney(
              (Number(summary?.shippingFees) || 0) +
                (Number(summary?.gst) || 0) +
                (Number(summary?.codTax) || 0)
            )}
            subtitle={`Ship ${formatMoney(summary?.shippingFees)} · GST ${formatMoney(summary?.gst)} · 4% ${formatMoney(summary?.codTax)}`}
          />
          <StatCard
            title={profitLabel(summary?.cashProfit).text}
            value={formatMoney(summary?.cashProfit)}
            subtitle={`Remittance − product prices (${formatMoney(summary?.productCogs)})`}
            tone={profitLabel(summary?.cashProfit).tone}
            accent
          />
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            Courier settlements
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800/80">
              <tr>
                <th className="px-3 py-2">Sheet</th>
                <th className="px-3 py-2">Courier</th>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">COD</th>
                <th className="px-3 py-2 text-right">Ship</th>
                <th className="px-3 py-2 text-right">Tax</th>
                <th className="px-3 py-2 text-right">Net</th>
                <th className="px-3 py-2 text-right">P/L</th>
                <th className="px-3 py-2 text-right">Matched</th>
                <th className="px-3 py-2 text-right">Returns</th>
              </tr>
            </thead>
            <tbody>
              {batches.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-3 py-8 text-center text-slate-500">
                    No settlements yet — drop PostEx CPR PDFs / CPR_Transactions CSV / Run Courier
                    sheets above. Orders match automatically.
                  </td>
                </tr>
              ) : (
                batches.map((b) => {
                  const pl = profitLabel(b.profitTotal);
                  return (
                  <tr
                    key={b.id}
                    className="border-t border-slate-100 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/40"
                  >
                    <td className="px-3 py-2">
                      <Link
                        href={
                          b.returnsPending > 0
                            ? `/finance/settlements/${b.id}?tab=returns`
                            : `/finance/settlements/${b.id}`
                        }
                        className="font-mono text-sm font-semibold text-[#1d6fb8] hover:underline"
                      >
                        {b.cprNumber}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-slate-600">{b.courier || "—"}</td>
                    <td className="px-3 py-2 tabular-nums text-slate-600">
                      {b.cprDate
                        ? new Date(b.cprDate).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            timeZone: "Asia/Karachi",
                          })
                        : "—"}
                    </td>
                    <td className="px-3 py-2 capitalize">{b.status}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatMoney(b.codTotal)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatMoney(b.shippingCharges)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatMoney(
                        (Number(b.gst) || 0) + (Number(b.deduction4pct) || 0)
                      )}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold tabular-nums">
                      {formatMoney(b.netTotal)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {(b.matchedCount || 0) > 0 ? (
                        <span
                          className={[
                            "inline-flex flex-col items-end text-xs font-semibold tabular-nums",
                            pl.tone === "loss"
                              ? "text-rose-600"
                              : pl.tone === "profit"
                                ? "text-[#1A7A4C]"
                                : "text-slate-600",
                          ].join(" ")}
                        >
                          <span>{pl.text}</span>
                          <span>{formatMoney(b.profitTotal)}</span>
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {b.matchedCount}/{b.lineCount}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {(b.returnedCount || 0) > 0 ? (
                        <Link
                          href={`/finance/settlements/${b.id}?tab=returns`}
                          className={[
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
                            b.returnsPending > 0
                              ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
                              : "bg-emerald-100 text-emerald-800 hover:bg-emerald-200",
                          ].join(" ")}
                        >
                          {b.returnsPending > 0
                            ? `${b.returnsPending} to confirm`
                            : `${b.returnedCount} done`}
                        </Link>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
