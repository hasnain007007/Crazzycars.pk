"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

/**
 * Fast invoice catalog: loads all active products in one lite query,
 * and re-queries the server when the user searches (covers the full catalog).
 */
export function useInvoiceProductCatalog() {
  const [catalog, setCatalog] = useState([]);
  const [catalogTotal, setCatalogTotal] = useState(0);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [catalogFilter, setCatalogFilter] = useState("");
  const [searchError, setSearchError] = useState("");
  const abortRef = useRef(null);
  const requestIdRef = useRef(0);

  const fetchCatalog = useCallback(async (searchTerm = "") => {
    const requestId = ++requestIdRef.current;
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const q = String(searchTerm || "").trim();
    const isSearch = q.length > 0;
    if (isSearch) setSearching(true);
    else setCatalogLoading(true);
    setSearchError("");

    try {
      const params = new URLSearchParams({
        status: "active",
        lite: "1",
        limit: "500",
        page: "1",
      });
      if (isSearch) params.set("search", q);

      const res = await fetch(`/api/products?${params.toString()}`, {
        credentials: "include",
        signal: controller.signal,
      });
      const json = await res.json();
      if (requestId !== requestIdRef.current) return;
      if (!res.ok || !json.success) {
        if (!isSearch) toast.error(json.error || "Could not load products.");
        setSearchError(json.error || "Search failed");
        return;
      }
      const rows = Array.isArray(json.data) ? json.data : [];
      setCatalog(rows);
      setCatalogTotal(Number(json.total) || rows.length);
    } catch (err) {
      if (err?.name === "AbortError") return;
      if (requestId !== requestIdRef.current) return;
      if (!isSearch) toast.error("Could not load products.");
      setSearchError("Could not load products.");
    } finally {
      if (requestId === requestIdRef.current) {
        setCatalogLoading(false);
        setSearching(false);
      }
    }
  }, []);

  useEffect(() => {
    const q = catalogFilter.trim();
    const delay = q ? 250 : 0;
    const t = setTimeout(() => {
      void fetchCatalog(q);
    }, delay);
    return () => clearTimeout(t);
  }, [catalogFilter, fetchCatalog]);

  return {
    catalog,
    catalogTotal,
    catalogLoading,
    searching,
    catalogFilter,
    setCatalogFilter,
    searchError,
    refreshCatalog: () => fetchCatalog(catalogFilter.trim()),
  };
}
