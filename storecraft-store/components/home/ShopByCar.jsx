"use client";

/**
 * Find Parts For Your Car — cascading Make → Model → Year from Car Catalog
 * (admin → Car Catalog), not product Categories.
 */
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

const YEAR_START = 2006;
const YEAR_END = new Date().getFullYear() + 1;

function yearOptionsFallback() {
  const ys = [];
  for (let y = YEAR_END; y >= YEAR_START; y--) ys.push(y);
  return ys;
}

export default function ShopByCar({ title = "Find Parts For Your Car" }) {
  const router = useRouter();
  const [makes, setMakes] = useState([]);
  const [carData, setCarData] = useState({});
  const [make, setMake] = useState("");
  const [modelSlug, setModelSlug] = useState("");
  const [year, setYear] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/car-catalog", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        setMakes(Array.isArray(data?.makes) ? data.makes : []);
        setCarData(data?.carData && typeof data.carData === "object" ? data.carData : {});
      })
      .catch(() => {
        setMakes([]);
        setCarData({});
      });
  }, []);

  const models = useMemo(() => {
    if (!make) return [];
    return Array.isArray(carData[make]) ? carData[make] : [];
  }, [carData, make]);

  const selectedModel = useMemo(
    () => models.find((m) => m.slug === modelSlug) || null,
    [models, modelSlug]
  );

  const years = useMemo(() => {
    if (selectedModel?.years?.length) {
      return [...selectedModel.years].sort((a, b) => b - a);
    }
    if (selectedModel?.yearFrom) {
      const from = selectedModel.yearFrom;
      const to = selectedModel.yearTo || YEAR_END;
      const ys = [];
      for (let y = to; y >= from; y--) ys.push(y);
      return ys;
    }
    return yearOptionsFallback();
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
        setError("Select make and model.");
        return;
      }
      setLoading(true);
      try {
        // Prefer SEO vehicle page when slug matches Vehicle collection
        const findUrl = selectedModel
          ? `/api/vehicles/find?make=${encodeURIComponent(make)}&model=${encodeURIComponent(selectedModel.model || selectedModel.name || "")}&year=${encodeURIComponent(year || selectedModel.yearFrom || YEAR_END)}`
          : null;

        if (findUrl && year) {
          const res = await fetch(findUrl, { cache: "no-store" });
          const json = await res.json();
          const vehicle = json?.vehicle || json?.data;
          if (res.ok && vehicle?.slug) {
            router.push(`/cars/${vehicle.slug}`);
            return;
          }
        }

        // Fall back to catalog model slug (same as seeded vehicle slug)
        router.push(`/cars/${modelSlug}${year ? `?year=${year}` : ""}`);
      } catch {
        setError("Could not open that car. Try again.");
      } finally {
        setLoading(false);
      }
    },
    [make, modelSlug, year, selectedModel, router]
  );

  const selectClass =
    "h-12 w-full rounded-lg border border-[#E5E7EB] bg-white px-3 text-sm text-[#111111] outline-none focus:border-[#C41E1E]";

  return (
    <section id="shop-by-car" className="homepage-section bg-[#F8F8F8] py-12 md:py-16">
      <div className="store-container">
        <h2 className="font-heading text-center text-[28px] font-bold text-[#111111] md:text-[32px]">
          {title}
        </h2>
        <div className="mx-auto mt-2 h-[3px] w-12 bg-[#C41E1E]" />
        <p className="mx-auto mt-3 max-w-xl text-center text-sm text-[#6B7280]">
          Select your car from the Car Catalog — Cash on Delivery nationwide.
        </p>

        <form
          onSubmit={onSubmit}
          className="mx-auto mt-8 grid max-w-4xl gap-3 rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm sm:grid-cols-4 sm:p-5"
        >
          <select
            className={selectClass}
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
            className={selectClass}
            value={modelSlug}
            onChange={(e) => setModelSlug(e.target.value)}
            disabled={!make}
            aria-label="Select model"
          >
            <option value="">Select Model</option>
            {models.map((m) => (
              <option key={m.slug} value={m.slug}>
                {m.nickname || m.generation || m.model}
                {m.yearFrom ? ` (${m.yearFrom}–${m.yearTo || "Present"})` : ""}
              </option>
            ))}
          </select>

          <select
            className={selectClass}
            value={year}
            onChange={(e) => setYear(e.target.value)}
            disabled={!modelSlug}
            aria-label="Select year"
          >
            <option value="">Select Year</option>
            {years.map((y) => (
              <option key={y} value={String(y)}>
                {y}
              </option>
            ))}
          </select>

          <button
            type="submit"
            disabled={loading}
            className="h-12 rounded-lg bg-[#C41E1E] text-sm font-bold uppercase tracking-wide text-white transition hover:bg-[#a81818] disabled:opacity-60"
          >
            {loading ? "Finding…" : "Find Parts"}
          </button>
        </form>

        {error ? (
          <p className="mt-3 text-center text-sm font-medium text-[#C41E1E]" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </section>
  );
}
