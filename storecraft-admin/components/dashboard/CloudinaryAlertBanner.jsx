/**
 * Persistent dashboard banner when Cloudinary is down or misconfigured.
 * Not dismissible while unhealthy — product images will stay broken until fixed.
 */
"use client";

import { useEffect, useState } from "react";

export function CloudinaryAlertBanner() {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/cloudinary/status", { credentials: "include", cache: "no-store" });
        const json = await res.json();
        if (!cancelled && json?.success && json.data) setStatus(json.data);
      } catch {
        if (!cancelled) setStatus(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!status || status.ok) return null;

  const clouds = status.catalog?.urlClouds || {};
  const cloudSummary = Object.entries(clouds)
    .map(([k, v]) => `${k}: ${v}`)
    .join(" · ");

  return (
    <div
      className="mb-6 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-red-950 shadow-sm dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-50"
      role="alert"
    >
      <p className="text-sm font-semibold">Product images failing — Cloudinary unhealthy</p>
      <p className="mt-1 text-sm opacity-90">
        Cloud: <code className="rounded bg-red-100/80 px-1 dark:bg-red-900/50">{status.cloudName || "unset"}</code>
        {status.code ? (
          <>
            {" "}
            · code <code className="rounded bg-red-100/80 px-1 dark:bg-red-900/50">{status.code}</code>
          </>
        ) : null}
      </p>
      <p className="mt-1 text-sm">{status.message}</p>
      {status.mismatchWarning ? <p className="mt-1 text-sm opacity-90">{status.mismatchWarning}</p> : null}
      {cloudSummary ? (
        <p className="mt-2 text-xs opacity-80">Catalog image hosts — {cloudSummary}</p>
      ) : null}
      <p className="mt-2 text-xs opacity-80">
        Fix: open Cloudinary console → billing/account for this cloud → reactivate. New uploads are blocked until
        Admin API ping succeeds. Dual-cloud catalogs need a full rehost after switching clouds.
      </p>
    </div>
  );
}
