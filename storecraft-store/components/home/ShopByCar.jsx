"use client";

/**
 * Filter By Car — AutoJin-style card (Make → Model | Year → FILTER)
 * Data from Car Catalog (admin).
 */
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

const YEAR_END = new Date().getFullYear() + 1;

function formatYearRange(m) {
  if (!m?.yearFrom) return "";
  const to = m.yearTo == null || Number(m.yearTo) >= new Date().getFullYear() ? "Present" : m.yearTo;
  return `${m.yearFrom}–${to}`;
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
      setMakes(initialCatalog.makes);
      setCarData(
        initialCatalog.carData && typeof initialCatalog.carData === "object"
          ? initialCatalog.carData
          : {}
      );
      return undefined;
    }
    let cancelled = false;
    fetch("/api/car-catalog")
      .then((r) => r.json())
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

  /** Year options: full generation range first, then individual years */
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

        // Fallback: catalog model slug (store page resolves → Vehicle automatically)
        router.push(`/cars/${modelSlug}${yearParam ? `?year=${yearParam}` : ""}`);
      } catch {
        setError("Could not open that car. Try again.");
      } finally {
        setLoading(false);
      }
    },
    [make, modelSlug, year, selectedModel, router]
  );

  return (
    <section id="shop-by-car" className="filter-by-car-section">
      <div className="store-container">
        <form onSubmit={onSubmit} className="filter-by-car-card">
          <h2 className="filter-by-car-title">{title === "Find Parts For Your Car" ? "Filter By Car" : title}</h2>

          <div className="filter-by-car-fields">
            <select
              className="filter-by-car-select"
              value={make}
              onChange={(e) => setMake(e.target.value)}
              aria-label="Select make"
            >
              <option value="">SELECT MAKE</option>
              {makes.map((m) => (
                <option key={m} value={m}>
                  {String(m).toUpperCase()}
                </option>
              ))}
            </select>

            <div className="filter-by-car-row">
              <select
                className="filter-by-car-select"
                value={modelSlug}
                onChange={(e) => setModelSlug(e.target.value)}
                disabled={!make}
                aria-label="Select model"
              >
                <option value="">SELECT MODEL</option>
                {models.map((m) => (
                  <option key={m.slug} value={m.slug}>
                    {(m.nickname || m.generation || m.model || "").toUpperCase()}
                  </option>
                ))}
              </select>

              <select
                className="filter-by-car-select"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                disabled={!modelSlug}
                aria-label="Select year"
              >
                <option value="">SELECT YEAR</option>
                {yearOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error ? (
            <p className="filter-by-car-error" role="alert">
              {error}
            </p>
          ) : null}

          <button type="submit" disabled={loading} className="filter-by-car-btn">
            {loading ? "…" : "FILTER"}
          </button>
        </form>
      </div>
    </section>
  );
}
