"use client";

import { useEffect, useState } from "react";

/**
 * Fetch neighbors from `/api/.../[id]/neighbors`.
 * @param {string|null|undefined} id
 * @param {string} apiBase e.g. "/api/coupons" → GET `${apiBase}/${id}/neighbors`
 */
export function useEntityNeighbors(id, apiBase) {
  const [neighbors, setNeighbors] = useState({ prev: null, next: null });

  useEffect(() => {
    let cancelled = false;
    const base = String(apiBase || "").replace(/\/$/, "");
    if (!id || !base) {
      setNeighbors({ prev: null, next: null });
      return undefined;
    }
    (async () => {
      try {
        const res = await fetch(`${base}/${id}/neighbors`, { credentials: "include" });
        const json = await res.json();
        if (cancelled || !res.ok || !json.success) return;
        setNeighbors({
          prev: json.prev || json.previous || null,
          next: json.next || null,
        });
      } catch {
        if (!cancelled) setNeighbors({ prev: null, next: null });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, apiBase]);

  return neighbors;
}
