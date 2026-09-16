"use client";

/**
 * Filter By Car — Carzstore-style horizontal bar (Make → Model → Year → FILTER + reset)
 * Data from Car Catalog (admin). Only navigates to generations that exist in our catalog.
 */
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchCarCatalogClient, seedCarCatalogClient } from "@/lib/fetchCarCatalogClient";

const YEAR_END = new Date().getFullYear() + 1;

function formatYearRange(m) {
  if (!m?.yearFrom) return "";
  const to = m.yearTo == null || Number(m.yearTo) >= new Date().getFullYear() ? "Present" : m.yearTo;
  return `${m.yearFrom}–${to}`;
}

function ResetIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4.5 12a7.5 7.5 0 0 1 12.9-5.2M19.5 12a7.5 7.5 0 0 1-12.9 5.2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M17.2 3.8v4.2h-4.2M6.8 20.2v-4.2h4.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function ShopByCar({ title = "Filter By Car", initialCatalog = null }) {
  const router = useRouter();
  const [makes, setMakes] = useState(() =>
    Array.isArray(initialCatalog?.makes) ? initialCatalog.makes : []
  );
  const [carData, setCarData] = useState(() =>
    initialCatalog?.carData && typeof initialCatalog.carData === "object" ? initialCatalog.carData : {}
  );
  const [make, setMake] = useState("");
  const [modelSlug, setModelSlug] = useState("");
  const [year, setYear] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (Array.isArray(initialCatalog?.makes) && initialCatalog.makes.length) {
      seedCarCatalogClient(initialCatalog);
      setMakes(initialCatalog.makes);
      setCarData(
        initialCatalog.carData && typeof initialCatalog.carData === "object"
          ? initialCatalog.carData
          : {}
      );
      return undefined;
    }
    let cancelled = false;
    fetchCarCatalogClient()
      .then((data) => {
        if (cancelled) return;
        setMakes(Array.isArray(data?.makes) ? data.makes : []);
        setCarData(data?.carData && typeof data.carData === "object" ? data.carData : {});
      })
      .catch(() => {
        if (!cancelled) {
          setMakes([]);
          setCarData({});
        }
      });
    return () => {
      cancelled = true;
    };
  }, [initialCatalog]);

  const models = useMemo(() => {
    if (!make) return [];
    return Array.isArray(carData[make]) ? carData[make] : [];
  }, [carData, make]);

  const selectedModel = useMemo(
    () => models.find((m) => m.slug === modelSlug) || null,
    [models, modelSlug]
  );

  const yearOptions = useMemo(() => {
    if (!selectedModel) return [];
    const opts = [];
    const rangeLabel = formatYearRange(selectedModel);
    if (rangeLabel) {
      opts.push({ value: "range", label: rangeLabel });
    }
    if (selectedModel.years?.length) {
      for (const y of [...selectedModel.years].sort((a, b) => b - a)) {
        opts.push({ value: String(y), label: String(y) });
      }
      return opts;
    }
    if (selectedModel.yearFrom) {
      const from = Number(selectedModel.yearFrom);
      const to = Number(selectedModel.yearTo) || YEAR_END;
      for (let y = to; y >= from; y--) {
        opts.push({ value: String(y), label: String(y) });
      }
    }
    return opts;
  }, [selectedModel]);

  useEffect(() => {
    setModelSlug("");
    setYear("");
  }, [make]);

  useEffect(() => {
    setYear("");
  }, [modelSlug]);

  const reset = useCallback(() => {
    setMake("");
    setModelSlug("");
    setYear("");
    setError("");
  }, []);

  const onSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      setError("");
      if (!make || !modelSlug) {
        setError("Please select make and model.");
        return;
      }
      setLoading(true);
      try {
        const yearParam = year && year !== "range" ? year : "";
        const modelName = selectedModel?.model || selectedModel?.name || "";
        const findYear = yearParam || selectedModel?.yearFrom || YEAR_END;
        const findUrl = selectedModel
          ? `/api/vehicles/find?make=${encodeURIComponent(make)}&model=${encodeURIComponent(modelName)}&year=${encodeURIComponent(findYear)}&catalogSlug=${encodeURIComponent(modelSlug)}`
          : null;

        if (findUrl) {
          const res = await fetch(findUrl);
          const json = await res.json();
          const vehicle = json?.vehicle || json?.data;
          if (res.ok && vehicle?.slug) {
            router.push(`/cars/${vehicle.slug}`);
            return;
          }
        }

        router.push(`/cars/${modelSlug}${yearParam ? `?year=${yearParam}` : ""}`);
      } catch {
        setError("Could not open that car. Try again.");
      } finally {
        setLoading(false);
      }
    },
    [make, modelSlug, year, selectedModel, router]
  );

  if (!makes.length) return null;

  return (
    <section id="shop-by-car" className="car-filter-bar-section" aria-label={title}>
      <div className="store-container">
        <form onSubmit={onSubmit} className="car-filter-bar">
          <select
            className="car-filter-bar__select"
            value={make}
            onChange={(e) => setMake(e.target.value)}
            aria-label="Select make"
          >
            <option value="">Select Make</option>
            {makes.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>

          <select
            className="car-filter-bar__select"
            value={modelSlug}
            onChange={(e) => setModelSlug(e.target.value)}
            disabled={!make}
            aria-label="Select model"
          >
            <option value="">Select Model</option>
            {models.map((m) => (
              <option key={m.slug} value={m.slug}>
                {m.nickname || m.generation || m.model || ""}
              </option>
            ))}
          </select>

          <select
            className="car-filter-bar__select"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            disabled={!modelSlug}
            aria-label="Select year"
          >
            <option value="">Select Year</option>
            {yearOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <button type="submit" disabled={loading} className="car-filter-bar__submit">
            {loading ? "…" : "FILTER BY CAR"}
          </button>

          <button
            type="button"
            className="car-filter-bar__reset"
            onClick={reset}
            aria-label="Reset car filter"
            title="Reset"
          >
            <ResetIcon />
          </button>
        </form>

        {error ? (
          <p className="car-filter-bar__error" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </section>
  );
}
