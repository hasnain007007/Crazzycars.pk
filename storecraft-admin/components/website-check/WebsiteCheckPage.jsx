"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";

/**
 * Admin › Website Check: one button runs a read-only check of the live store — every page in
 * the sitemap, every product photo, catalogue data, and the coupon / delivery / tracking APIs.
 * Runs in small parts (see /api/site-check) and keeps the last report in this browser.
 */
const LAST_KEY = "cc-website-check-last";
const PAGE_BATCH = 30;
const IMAGE_BATCH = 120;

function chunk(list, n) {
  const out = [];
  for (let i = 0; i < list.length; i += n) out.push(list.slice(i, i + n));
  return out;
}

async function call(method, body) {
  const res = await fetch(method === "GET" ? "/api/site-check?part=plan" : "/api/site-check", {
    method,
    credentials: "include",
    headers: method === "POST" ? { "Content-Type": "application/json" } : undefined,
    body: method === "POST" ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) throw new Error(json.error || `HTTP ${res.status}`);
  return json;
}

function Badge({ level }) {
  const map = {
    error: "bg-red-100 text-red-800",
    warn: "bg-amber-100 text-amber-800",
    ok: "bg-green-100 text-green-800",
  };
  const label = { error: "Problem", warn: "Check", ok: "OK" }[level] || level;
  return <span className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${map[level] || ""}`}>{label}</span>;
}

function Stat({ label, value, tone }) {
  const color = tone === "error" ? "text-red-700" : tone === "warn" ? "text-amber-700" : "text-zinc-900";
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function Section({ title, count, children, defaultOpen = true }) {
  return (
    <details open={defaultOpen} className="rounded-xl border border-zinc-200 bg-white">
      <summary className="cursor-pointer select-none px-4 py-3 text-sm font-semibold text-zinc-900">
        {title} <span className="ml-1 font-normal text-zinc-500">({count})</span>
      </summary>
      <div className="border-t border-zinc-100 px-4 py-3">{children}</div>
    </details>
  );
}

const shortUrl = (u, base) => String(u || "").replace(base || "", "") || "/";

export function WebsiteCheckPage() {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ step: "", done: 0, total: 0 });
  const [report, setReport] = useState(null);
  const stopRef = useRef(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(LAST_KEY) || "null");
      if (saved?.finishedAt) setReport(saved);
    } catch {
      /* no saved report */
    }
  }, []);

  async function run() {
    setRunning(true);
    stopRef.current = false;
    const started = Date.now();
    try {
      setProgress({ step: "Reading sitemap and catalogue…", done: 0, total: 1 });
      const plan = await call("GET");
      const pageBatches = chunk(plan.pages, PAGE_BATCH);
      const imageBatches = chunk(plan.images, IMAGE_BATCH);
      const total = pageBatches.length + imageBatches.length + 2;
      let done = 0;
      const tick = (step) => setProgress({ step, done: ++done, total });

      const functions = (await call("POST", { part: "functions" })).results;
      tick("Checked coupon, delivery and tracking");
      const catalog = await call("POST", { part: "catalog" });
      tick("Checked product data");

      const pages = [];
      for (const [i, batch] of pageBatches.entries()) {
        if (stopRef.current) break;
        const r = await call("POST", { part: "pages", urls: batch }).catch((e) => ({
          results: batch.map((b) => ({ url: b.url, status: 0, issues: [{ level: "error", check: "Check failed", detail: e.message }] })),
        }));
        pages.push(...r.results);
        tick(`Pages ${Math.min((i + 1) * PAGE_BATCH, plan.pages.length)} / ${plan.pages.length}`);
      }
      const brokenImages = [];
      for (const [i, batch] of imageBatches.entries()) {
        if (stopRef.current) break;
        const r = await call("POST", { part: "images", images: batch }).catch(() => ({ broken: [] }));
        brokenImages.push(...r.broken);
        tick(`Photos ${Math.min((i + 1) * IMAGE_BATCH, plan.images.length)} / ${plan.images.length}`);
      }

      const next = {
        base: plan.base,
        sitemapError: plan.sitemapError,
        startedAt: new Date(started).toISOString(),
        finishedAt: new Date().toISOString(),
        seconds: Math.round((Date.now() - started) / 1000),
        stopped: stopRef.current,
        pagesChecked: pages.length,
        imagesChecked: plan.images.length,
        productsChecked: catalog.total,
        functions,
        pageIssues: pages.filter((p) => p.issues.length),
        slowest: [...pages].sort((a, b) => b.ms - a.ms).slice(0, 5),
        brokenImages,
        catalogIssues: catalog.issues,
      };
      setReport(next);
      try {
        localStorage.setItem(LAST_KEY, JSON.stringify(next));
      } catch {
        /* too big for storage — report still shows */
      }
      toast.success(stopRef.current ? "Check stopped." : "Website check finished.");
    } catch (e) {
      toast.error(e.message || "Check failed.");
    } finally {
      setRunning(false);
    }
  }

  const summary = useMemo(() => {
    if (!report) return null;
    const pageErr = report.pageIssues.flatMap((p) => p.issues).filter((i) => i.level === "error").length;
    const pageWarn = report.pageIssues.flatMap((p) => p.issues).filter((i) => i.level === "warn").length;
    const fnErr = report.functions.filter((f) => f.level === "error").length;
    const fnWarn = report.functions.filter((f) => f.level === "warn").length;
    const catErr = report.catalogIssues.filter((i) => i.level === "error").length;
    const catWarn = report.catalogIssues.filter((i) => i.level === "warn").length;
    const imgProducts = new Set(report.brokenImages.map((b) => b.productId)).size;
    return {
      errors: pageErr + fnErr + catErr + report.brokenImages.length,
      warnings: pageWarn + fnWarn + catWarn,
      imgProducts,
    };
  }, [report]);

  const brokenByProduct = useMemo(() => {
    const m = new Map();
    for (const b of report?.brokenImages || []) {
      const row = m.get(b.productId) || { ...b, count: 0 };
      row.count += 1;
      m.set(b.productId, row);
    }
    return [...m.values()].sort((a, b) => String(a.status).localeCompare(String(b.status)));
  }, [report]);

  const catalogGroups = useMemo(() => {
    const m = new Map();
    for (const i of report?.catalogIssues || []) {
      const g = m.get(i.check) || { check: i.check, level: i.level, rows: [] };
      g.rows.push(i);
      m.set(i.check, g);
    }
    return [...m.values()].sort((a, b) => (a.level === b.level ? 0 : a.level === "error" ? -1 : 1));
  }, [report]);

  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Website Check</h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-600">
            Checks the live store the way a shopper sees it: every page in the sitemap, every product photo,
            product prices and stock, and the coupon, delivery and order-tracking systems. Read-only — nothing is
            changed. Takes about 2–4 minutes.
          </p>
        </div>
        <div className="flex gap-2">
          {running ? (
            <button
              type="button"
              onClick={() => {
                stopRef.current = true;
              }}
              className="rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800"
            >
              Stop
            </button>
          ) : null}
          <button
            type="button"
            onClick={run}
            disabled={running}
            className="rounded-lg bg-[#C41E1E] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#a51919] disabled:opacity-60"
          >
            {running ? "Checking…" : report ? "Run check again" : "Run website check"}
          </button>
        </div>
      </div>

      {running ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <div className="mb-2 flex justify-between text-sm">
            <span className="font-medium text-zinc-800">{progress.step}</span>
            <span className="text-zinc-500">{pct}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
            <div className="h-full rounded-full bg-[#C41E1E] transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      ) : null}

      {report && summary ? (
        <>
          <p className="text-xs text-zinc-500">
            Last check {new Date(report.finishedAt).toLocaleString()} · {report.seconds}s · {report.base}
            {report.stopped ? " · stopped early" : ""}
            {report.sitemapError ? ` · sitemap: ${report.sitemapError}` : ""}
          </p>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <Stat label="Problems" value={summary.errors} tone={summary.errors ? "error" : ""} />
            <Stat label="To check" value={summary.warnings} tone={summary.warnings ? "warn" : ""} />
            <Stat label="Pages checked" value={report.pagesChecked} />
            <Stat label="Photos checked" value={report.imagesChecked} />
            <Stat label="Products checked" value={report.productsChecked} />
          </div>

          <Section title="Store systems" count={report.functions.length}>
            <ul className="divide-y divide-zinc-100">
              {report.functions.map((f) => (
                <li key={f.name} className="flex flex-wrap items-center gap-3 py-2 text-sm">
                  <Badge level={f.level} />
                  <span className="font-medium text-zinc-900">{f.name}</span>
                  <span className="text-zinc-600">{f.detail}</span>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Missing product photos" count={report.brokenImages.length} defaultOpen={report.brokenImages.length > 0}>
            {brokenByProduct.length ? (
              <ul className="divide-y divide-zinc-100 text-sm">
                {brokenByProduct.map((b) => (
                  <li key={b.productId} className="flex flex-wrap items-center gap-3 py-2">
                    <Badge level="error" />
                    <Link href={`/catalog/products/${b.productId}`} className="font-medium text-[#C41E1E] hover:underline">
                      {b.sku} {b.name}
                    </Link>
                    <span className="text-zinc-500">
                      {b.count} photo{b.count === 1 ? "" : "s"} missing · {b.status}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-green-700">Every product photo loads.</p>
            )}
          </Section>

          <Section title="Pages with problems" count={report.pageIssues.length} defaultOpen={report.pageIssues.length > 0}>
            {report.pageIssues.length ? (
              <ul className="divide-y divide-zinc-100 text-sm">
                {report.pageIssues.map((p) =>
                  p.issues.map((i, k) => (
                    <li key={p.url + k} className="flex flex-wrap items-center gap-3 py-2">
                      <Badge level={i.level} />
                      <a href={p.url} target="_blank" rel="noreferrer" className="font-mono text-xs text-[#C41E1E] hover:underline">
                        {shortUrl(p.url, report.base)}
                      </a>
                      <span className="font-medium text-zinc-900">{i.check}</span>
                      <span className="text-zinc-600">{i.detail}</span>
                    </li>
                  ))
                )}
              </ul>
            ) : (
              <p className="text-sm text-green-700">All {report.pagesChecked} pages load without problems.</p>
            )}
            {report.slowest?.length ? (
              <p className="mt-3 text-xs text-zinc-500">
                Slowest: {report.slowest.map((s) => `${shortUrl(s.url, report.base)} ${(s.ms / 1000).toFixed(1)}s`).join(" · ")}
              </p>
            ) : null}
          </Section>

          <Section title="Product data" count={report.catalogIssues.length} defaultOpen={false}>
            {catalogGroups.length ? (
              <div className="space-y-4">
                {catalogGroups.map((g) => (
                  <div key={g.check}>
                    <p className="mb-1 flex items-center gap-2 text-sm font-semibold text-zinc-900">
                      <Badge level={g.level} /> {g.check} <span className="font-normal text-zinc-500">({g.rows.length})</span>
                    </p>
                    <ul className="ml-1 space-y-1 text-sm">
                      {g.rows.slice(0, 60).map((r) => (
                        <li key={r.productId + r.check}>
                          <Link href={`/catalog/products/${r.productId}`} className="text-[#C41E1E] hover:underline">
                            {r.sku} {r.name}
                          </Link>{" "}
                          <span className="text-zinc-500">— {r.detail}</span>
                        </li>
                      ))}
                      {g.rows.length > 60 ? <li className="text-zinc-500">…and {g.rows.length - 60} more</li> : null}
                    </ul>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-green-700">No product data problems.</p>
            )}
          </Section>
        </>
      ) : !running ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-8 text-center text-sm text-zinc-600">
          No check run yet. Press <strong>Run website check</strong>.
        </div>
      ) : null}
    </div>
  );
}
