"use client";

import { useEffect, useState } from "react";

const POLL_MS = 15_000;

/* One poll shared by the header badge and the visitors panel. */
const listeners = new Set();
let latest = null;
let timer = null;

async function load() {
  try {
    const res = await fetch("/api/presence", { credentials: "include", cache: "no-store" });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error || "Failed");
    latest = { ...json.data, error: "" };
  } catch (e) {
    latest = { ...(latest || { liveUsers: 0, visitors: [], places: [], topPaths: [] }), error: String(e.message || e) };
  }
  listeners.forEach((fn) => fn(latest));
}

function useLivePresence() {
  const [data, setData] = useState(latest);
  useEffect(() => {
    listeners.add(setData);
    if (listeners.size === 1) {
      load();
      timer = setInterval(load, POLL_MS);
    } else if (latest) {
      setData(latest);
    }
    return () => {
      listeners.delete(setData);
      if (!listeners.size && timer) {
        clearInterval(timer);
        timer = null;
      }
    };
  }, []);
  return data;
}

function Pulse({ size = "h-2 w-2" }) {
  return (
    <span className={`relative flex ${size}`}>
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
      <span className={`relative inline-flex ${size} rounded-full bg-emerald-500`} />
    </span>
  );
}

function duration(sec) {
  const s = Math.max(0, Number(sec) || 0);
  if (s < 60) return `${s} sec`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${m % 60} min`;
}

function ago(sec) {
  const s = Number(sec) || 0;
  return s < 20 ? "active now" : `${duration(s)} ago`;
}

/** Header badge: live count; click jumps to the visitors panel. */
export function LiveUsersCard() {
  const data = useLivePresence();
  const display = data == null ? "…" : String(data.liveUsers || 0);
  return (
    <a
      href="#live-visitors"
      className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs no-underline hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/50"
      title="See who is on the store now"
    >
      <Pulse size="h-1.5 w-1.5" />
      <span className="font-bold tabular-nums text-emerald-800 dark:text-emerald-200">{display}</span>
      <span className="font-medium text-emerald-700/70 dark:text-emerald-400/80">live now</span>
    </a>
  );
}

const KIND_TONE = {
  checkout: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  product: "bg-sky-50 text-sky-800 dark:bg-sky-900/30 dark:text-sky-200",
};

function PageLink({ url, label, path, kind }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      title={path}
      className={`inline-block max-w-full truncate rounded px-1.5 py-0.5 align-middle text-xs hover:underline ${
        KIND_TONE[kind] || "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
      }`}
    >
      {label}
    </a>
  );
}

/** Full list: where each live visitor is from, what page they are on, where they landed. */
export function LiveVisitorsPanel() {
  const data = useLivePresence();
  const [showAll, setShowAll] = useState(false);
  const visitors = data?.visitors || [];
  const places = data?.places || [];
  const shown = showAll ? visitors : visitors.slice(0, 12);

  return (
    <section
      id="live-visitors"
      className="scroll-mt-20 rounded-xl border border-border-hairline bg-bg-panel p-5 shadow-none"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            <Pulse /> Live visitors
            <span className="text-lg font-bold tabular-nums">{data == null ? "…" : visitors.length}</span>
          </h3>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            People on crazzycars.pk in the last 90 seconds · updates every 15 seconds
            {data?.onCheckout ? ` · ${data.onCheckout} on checkout now` : ""}
          </p>
        </div>
        {places.length ? (
          <div className="flex flex-wrap gap-1.5">
            {places.slice(0, 8).map((p) => (
              <span
                key={p.place}
                className="rounded-full border border-border-hairline px-2 py-0.5 text-[11px]"
                style={{ color: "var(--text-primary)" }}
              >
                {p.place} <b className="tabular-nums">{p.count}</b>
              </span>
            ))}
          </div>
        ) : null}
      </div>

      {data?.error ? (
        <p className="mt-3 text-xs text-red-600">Could not load live visitors: {data.error}</p>
      ) : null}

      {data && !visitors.length && !data.error ? (
        <p className="mt-6 pb-2 text-center text-sm" style={{ color: "var(--text-muted)" }}>
          Nobody is on the store right now.
        </p>
      ) : null}

      {visitors.length ? (
        <>
          {/* Desktop table */}
          <div className="mt-4 hidden overflow-x-auto md:block">
            <table className="w-full table-fixed text-left text-xs" style={{ color: "var(--text-primary)" }}>
              <thead style={{ color: "var(--text-muted)" }}>
                <tr className="border-b border-border-hairline">
                  <th className="w-[20%] py-2 pr-3 font-medium">From (city)</th>
                  <th className="w-[26%] py-2 pr-3 font-medium">Now on page</th>
                  <th className="w-[24%] py-2 pr-3 font-medium">Landed on</th>
                  <th className="w-[13%] py-2 pr-3 font-medium">Came from</th>
                  <th className="w-[17%] py-2 font-medium">On site</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((v) => (
                  <tr key={v.id} className="border-b border-border-hairline/60 align-top last:border-0">
                    <td className="py-2 pr-3">
                      <div className="truncate font-medium">{v.place || "Unknown location"}</div>
                      <div className="truncate text-[11px]" style={{ color: "var(--text-muted)" }}>
                        {[v.device, v.network].filter(Boolean).join(" · ")}
                      </div>
                    </td>
                    <td className="py-2 pr-3">
                      <PageLink url={v.nowUrl} label={v.nowLabel} path={v.nowPath} kind={v.nowKind} />
                    </td>
                    <td className="py-2 pr-3">
                      <PageLink url={v.landingUrl} label={v.landingLabel} path={v.landingPath} />
                    </td>
                    <td className="truncate py-2 pr-3">{v.source || "—"}</td>
                    <td className="py-2">
                      <div className="tabular-nums">
                        {duration(v.onSiteSec)} · {v.pageViews} {v.pageViews === 1 ? "page" : "pages"}
                      </div>
                      <div className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                        {ago(v.lastSeenSec)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <ul className="mt-4 space-y-2 md:hidden">
            {shown.map((v) => (
              <li key={v.id} className="rounded-lg border border-border-hairline p-3 text-xs" style={{ color: "var(--text-primary)" }}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{v.place || "Unknown location"}</div>
                    <div className="truncate text-[11px]" style={{ color: "var(--text-muted)" }}>
                      {[v.device, v.network, v.source].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  <div className="shrink-0 text-right text-[11px] tabular-nums" style={{ color: "var(--text-muted)" }}>
                    {duration(v.onSiteSec)}
                    <br />
                    {v.pageViews} {v.pageViews === 1 ? "page" : "pages"}
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-[72px_1fr] items-center gap-x-2 gap-y-1">
                  <span style={{ color: "var(--text-muted)" }}>Now on</span>
                  <span className="min-w-0">
                    <PageLink url={v.nowUrl} label={v.nowLabel} path={v.nowPath} kind={v.nowKind} />
                  </span>
                  <span style={{ color: "var(--text-muted)" }}>Landed on</span>
                  <span className="min-w-0">
                    <PageLink url={v.landingUrl} label={v.landingLabel} path={v.landingPath} />
                  </span>
                </div>
              </li>
            ))}
          </ul>

          {visitors.length > 12 ? (
            <button
              type="button"
              onClick={() => setShowAll((s) => !s)}
              className="mt-3 text-xs font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
            >
              {showAll ? "Show fewer" : `Show all ${visitors.length} visitors`}
            </button>
          ) : null}

          <p className="mt-3 text-[11px]" style={{ color: "var(--text-muted)" }}>
            City comes from the visitor&apos;s internet connection, so it is approximate — mobile data
            (Jazz, Zong, Telenor) often shows the network&apos;s nearest big city.
          </p>
        </>
      ) : null}
    </section>
  );
}
