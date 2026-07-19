"use client";

/**
 * Find Parts For Your Car — cascading Make → Model → Year via /api/vehicles/*.
 */
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

const YEAR_START = 2006;
const YEAR_END = 2026;

function yearOptions() {
  const ys = [];
  for (let y = YEAR_END; y >= YEAR_START; y--) ys.push(y);
  return ys;
}

export default function ShopByCar({ title = "Find Parts For Your Car" }) {
  const router = useRouter();
  const [makes, setMakes] = useState([]);
  const [models, setModels] = useState([]);
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const years = useMemo(() => yearOptions(), []);

  useEffect(() => {
    fetch("/api/vehicles/makes", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        const list = data?.makes || data?.data || [];
        setMakes(Array.isArray(list) ? list : []);
      })
      .catch(() => setMakes([]));
  }, []);

  useEffect(() => {
    setModel("");
    setYear("");
    setModels([]);
    if (!make) return;
    fetch(`/api/vehicles/models?make=${encodeURIComponent(make)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        const list = data?.models || data?.data || [];
        setModels(Array.isArray(list) ? list : []);
      })
      .catch(() => setModels([]));
  }, [make]);

  const onSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      setError("");
      if (!make || !model || !year) {
        setError("Select make, model and year.");
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(
          `/api/vehicles/find?make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}&year=${encodeURIComponent(year)}`,
          { cache: "no-store" }
        );
        const json = await res.json();
        const vehicle = json?.vehicle || json?.data;
        if (!res.ok || !vehicle?.slug) {
          setError(json?.error || "No matching generation for that year.");
          return;
        }
        router.push(`/cars/${vehicle.slug}`);
      } catch {
        setError("Could not find that vehicle. Try again.");
      } finally {
        setLoading(false);
      }
    },
    [make, model, year, router]
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
          Select your car to see accessories that fit — Cash on Delivery nationwide.
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
            value={model}
            onChange={(e) => setModel(e.target.value)}
            disabled={!make}
            aria-label="Select model"
          >
            <option value="">Select Model</option>
            {models.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>

          <select
            className={selectClass}
            value={year}
            onChange={(e) => setYear(e.target.value)}
            disabled={!model}
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
