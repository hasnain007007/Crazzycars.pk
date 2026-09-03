/**
 * Dashboard banner for media volume + leftover broken Cloudinary URLs.
 */
"use client";

import { useEffect, useState } from "react";

export function CloudinaryAlertBanner() {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/cloudinary/status?refresh=1", {
          credentials: "include",
          cache: "no-store",
        });
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

  if (!status) return null;

  const volumeBroken = !status.writable;
  const legacyBroken = (status.remoteBrokenLikely || 0) > 0;
  if (!volumeBroken && !legacyBroken) return null;

  const clouds = status.catalog?.urlClouds || {};
  const cloudSummary = Object.entries(clouds)
    .map(([k, v]) => `${k}: ${v}`)
    .join(" · ");

  return (
    <div
      className="mb-6 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-red-950 shadow-sm dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-50"
      role="alert"
    >
      <p className="text-sm font-semibold">
        {volumeBroken ? "Media volume problem" : "Product images still on disabled Cloudinary"}
      </p>
      <p className="mt-1 text-sm">{status.message}</p>
      {cloudSummary ? (
        <p className="mt-2 text-xs opacity-80">Catalog image hosts — {cloudSummary}</p>
      ) : null}
      <p className="mt-2 text-xs opacity-80">
        Permanent fix: Coolify shared volume at MEDIA_ROOT=/app/media on store + admin, then run{" "}
        <code className="rounded bg-red-100/80 px-1 dark:bg-red-900/50">
          node --env-file=storecraft-store/.env.local scripts/rehost-media-to-vps.mjs --apply
        </code>
        . Provide product photo zip with --from-zip if Cloudinary URLs are dead. See docs/MEDIA-HOSTING.md.
      </p>
    </div>
  );
}
