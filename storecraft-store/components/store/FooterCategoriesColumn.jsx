"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const FALLBACK = [
  { label: "Seat Covers", href: "/categories/seat-covers" },
  { label: "Floor Mats", href: "/categories/floor-mats" },
  { label: "Steering Covers", href: "/categories/steering-covers" },
  { label: "Car Care", href: "/categories/car-care" },
];

function linksFromSettings(footer) {
  const arr = footer?.categoriesLinks;
  if (!Array.isArray(arr) || !arr.length) return null;
  const mapped = arr
    .filter((l) => l.enabled !== false && String(l.label || "").trim())
    .map((l) => ({
      label: String(l.label).trim(),
      href: String(l.url || l.href || "#").trim() || "#",
    }));
  return mapped.length ? mapped : null;
}

export function FooterCategoriesColumn({ settings }) {
  const [autoLinks, setAutoLinks] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/categories?showInFooter=true")
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        const rows = json?.categories || json?.data || [];
        if (Array.isArray(rows) && rows.length) {
          setAutoLinks(
            rows
              .filter((c) => c.slug && String(c.name || "").trim())
              .map((c) => ({
                label: String(c.name).trim(),
                href: `/categories/${c.slug}`,
              }))
          );
        } else {
          setAutoLinks([]);
        }
      })
      .catch(() => {
        if (!cancelled) setAutoLinks([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const links = useMemo(() => {
    if (loading) return null;
    if (autoLinks?.length) return autoLinks;
    return linksFromSettings(settings?.footer) || FALLBACK;
  }, [autoLinks, loading, settings?.footer]);

  return (
    <div>
      <h4 className="mb-4 text-sm font-bold text-white">Categories</h4>
      {loading ? (
        <p className="text-sm" style={{ color: "#9CA3AF" }}>
          Loading…
        </p>
      ) : (
        <ul className="space-y-2">
          {(links || FALLBACK).map((l) => (
            <li key={`${l.href}-${l.label}`}>
              <Link href={l.href} className="text-sm transition hover:text-white" style={{ color: "#9CA3AF" }}>
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
