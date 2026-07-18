"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { yearsForModelFromCatalog } from "@/lib/carCatalogApi";
import { CAR_MAKES, CAR_DATA } from "@/lib/carCatalog";
import {
  buildCarPagePath,
  findCatalogEntry,
  formatModelShortLabel,
  formatModelSubtitle,
  formatModelTitle,
  groupModelsByName,
  slugifyCarSegment,
  yearsForCatalogEntry,
} from "@/lib/carCatalogDisplay";

const POPULAR_FALLBACK = [
  { make: "Honda", slug: "civic-x", fallbackModel: "Civic", fallbackNickname: "Civic X" },
  { make: "Toyota", slug: "altis", fallbackModel: "Corolla Altis", fallbackNickname: "Altis" },
  { make: "Suzuki", slug: "alto-660cc", fallbackModel: "Alto", fallbackNickname: "Alto 660cc" },
  { make: "KIA", slug: "sportage", fallbackModel: "Sportage" },
  { make: "Toyota", slug: "prado", fallbackModel: "Prado" },
];

function buildFallbackCatalog() {
  const carData = {};
  for (const make of CAR_MAKES) {
    carData[make] = (CAR_DATA[make] || []).map((m) => ({
      model: m.model,
      slug: m.model.toLowerCase().replace(/\s+/g, "-"),
      years: (() => {
        const ys = [];
        for (let y = m.yearTo; y >= m.yearFrom; y--) ys.push(y);
        return ys;
      })(),
      yearFrom: m.yearFrom,
      yearTo: m.yearTo,
      bodyStyle: "Sedan",
      image: "",
      popularAccessories: [],
      generation: "",
      nickname: "",
    }));
  }
  return { makes: CAR_MAKES, carData, makesMeta: {} };
}

function resolvePopularEntry(carData, spec) {
  const list = carData[spec.make] || [];
  return (
    findCatalogEntry(carData, spec.make, spec.slug) ||
    list.find((m) => m.nickname === spec.fallbackNickname) ||
    list.find((m) => m.model === spec.fallbackModel) ||
    null
  );
}

function resolveMakeLogo(makesMeta, makeName) {
  if (!makeName) return "";
  const direct = makesMeta?.[makeName];
  if (direct?.logo) return String(direct.logo).trim();
  const lower = makesMeta?.[makeName.toLowerCase()];
  if (lower?.logo) return String(lower.logo).trim();
  const found = Object.values(makesMeta || {}).find(
    (m) =>
      m?.name?.toLowerCase() === makeName.toLowerCase() ||
      m?.slug?.toLowerCase() === makeName.toLowerCase().replace(/\s+/g, "-")
  );
  return String(found?.logo || "").trim();
}

function MakeLogoSmall({ make, logoUrl }) {
  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt=""
        className="shrink-0 object-contain"
        style={{ height: 24, width: "auto", maxWidth: 48 }}
      />
    );
  }
  return (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#C41E1E] text-xs font-bold text-white">
      {make.charAt(0)}
    </span>
  );
}

function MakeLogoBrowse({ make, logoUrl }) {
  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt={make}
        style={{
          width: "auto",
          height: "60px",
          maxWidth: "100px",
          objectFit: "contain",
          display: "block",
          margin: "0 auto 8px",
        }}
      />
    );
  }
  return (
    <div
      style={{
        width: "60px",
        height: "60px",
        borderRadius: "50%",
        background: "#C41E1E",
        color: "white",
        fontSize: "24px",
        fontWeight: 700,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        margin: "0 auto 8px",
      }}
    >
      {make.charAt(0)}
    </div>
  );
}

function ModelGradientPlaceholder({ label, className = "" }) {
  const letter = (label || "?").charAt(0);
  return (
    <div
      className={`flex items-center justify-center bg-gradient-to-br from-[#1F2937] to-[#4B5563] text-white ${className}`}
    >
      <span className="text-3xl font-bold opacity-90">{letter}</span>
    </div>
  );
}

function SquareModelCard({ entry, makeName, onClick }) {
  const [hovered, setHovered] = useState(false);
  const name =
    entry?.nickname || entry?.model || formatModelShortLabel(entry) || "Model";
  const bodyStyle = entry?.bodyStyle || "Car";
  const make = makeName || entry?.make || "";
  const initial = name.charAt(0);

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        width: "160px",
        height: "160px",
        borderRadius: "12px",
        overflow: "hidden",
        cursor: "pointer",
        border: hovered ? "2px solid #C41E1E" : "2px solid transparent",
        flexShrink: 0,
        transform: hovered ? "scale(1.03)" : "scale(1)",
        transition: "all 0.2s",
        padding: 0,
        background: "transparent",
      }}
    >
      {entry?.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={entry.image}
          alt={name}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
        />
      ) : (
        <div
          style={{
            width: "100%",
            height: "100%",
            background: "linear-gradient(135deg, #1A1A1A, #C41E1E)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "32px",
            color: "white",
            fontWeight: 700,
            fontFamily: "Rajdhani, sans-serif",
          }}
        >
          {initial}
        </div>
      )}

      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          background: "linear-gradient(transparent, rgba(0,0,0,0.85))",
          padding: "20px 10px 10px",
        }}
      >
        <div
          style={{
            color: "#FFFFFF",
            fontSize: "13px",
            fontWeight: 700,
            fontFamily: "Rajdhani, sans-serif",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {name}
        </div>
        <div
          style={{
            color: "rgba(255,255,255,0.7)",
            fontSize: "11px",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {make} • {bodyStyle}
        </div>
      </div>
    </button>
  );
}

export default function ShopByCar({ title = "Find Parts For Your Car" }) {
  const router = useRouter();
  const selectorRef = useRef(null);
  const modelSelectRef = useRef(null);
  const yearSelectRef = useRef(null);
  const expandedRef = useRef(null);

  const [catalog, setCatalog] = useState(null);
  const [popularFromApi, setPopularFromApi] = useState(null);
  const [loading, setLoading] = useState(true);
  const [make, setMake] = useState("");
  const [modelSlug, setModelSlug] = useState("");
  const [year, setYear] = useState("");
  const [expandedMake, setExpandedMake] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/car-catalog")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data?.makes?.length && data?.carData) {
          setCatalog({
            makes: data.makes,
            carData: data.carData,
            makesMeta: data.makesMeta || {},
          });
        } else {
          setCatalog(buildFallbackCatalog());
        }
        if (Array.isArray(data?.popular)) {
          setPopularFromApi(data.popular);
        } else {
          setPopularFromApi([]);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCatalog(buildFallbackCatalog());
          setPopularFromApi([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const { makes, carData, makesMeta } = catalog || buildFallbackCatalog();
  const selectedMakeLogo = make ? resolveMakeLogo(makesMeta, make) : "";

  const selectedEntry = useMemo(() => {
    if (!make || !modelSlug) return null;
    return findCatalogEntry(carData, make, modelSlug);
  }, [make, modelSlug, carData]);

  const modelGroups = useMemo(() => {
    if (!make || !carData[make]) return [];
    return groupModelsByName(carData[make]);
  }, [make, carData]);

  const expandedModels = useMemo(() => {
    if (!expandedMake || !carData[expandedMake]) return [];
    return [...carData[expandedMake]].sort((a, b) => (b.yearFrom || 0) - (a.yearFrom || 0));
  }, [expandedMake, carData]);

  const years = useMemo(() => {
    if (selectedEntry) return yearsForCatalogEntry(selectedEntry);
    if (!make || !modelSlug) return [];
    return yearsForModelFromCatalog(carData, make, modelSlug);
  }, [selectedEntry, make, modelSlug, carData]);

  const scrollToSelector = useCallback(() => {
    selectorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const selectMakeDropdown = useCallback((makeName) => {
    setMake(makeName);
    setModelSlug("");
    setYear("");
  }, []);

  const expandMake = useCallback(
    (makeName) => {
      const next = expandedMake === makeName ? "" : makeName;
      setExpandedMake(next);
      selectMakeDropdown(makeName);
      if (next) {
        setTimeout(() => expandedRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 50);
      }
    },
    [expandedMake, selectMakeDropdown]
  );

  const selectModelSlug = useCallback((slug, { focusYear = false } = {}) => {
    setModelSlug(slug);
    setYear("");
    if (focusYear) {
      setTimeout(() => yearSelectRef.current?.focus(), 100);
    }
  }, []);

  const pickModel = useCallback(
    (entry, makeName, { year: yearVal } = {}) => {
      const makeSlug = makesMeta[makeName]?.slug || slugifyCarSegment(makeName);
      router.push(buildCarPagePath(makeSlug, entry.slug, { year: yearVal || undefined }));
    },
    [makesMeta, router]
  );

  function shopModelParam() {
    if (!selectedEntry) return "";
    return selectedEntry.nickname || selectedEntry.model;
  }

  function shopUrl(extra = {}) {
    const params = new URLSearchParams();
    if (make) params.set("make", make);
    const modelParam = shopModelParam();
    if (modelParam) params.set("model", modelParam);
    if (selectedEntry?.slug) params.set("slug", selectedEntry.slug);
    if (year) params.set("year", year);
    Object.entries(extra).forEach(([k, val]) => {
      if (val) params.set(k, val);
    });
    return `/shop?${params.toString()}`;
  }

  function submit(e) {
    e.preventDefault();
    if (!make || !selectedEntry) return;
    pickModel(selectedEntry, make, { year: year || undefined });
  }

  const popularDisplay = useMemo(() => {
    if (popularFromApi?.length) {
      return popularFromApi.map((entry) => ({
        key: `${entry.make}-${entry.slug}`,
        make: entry.make,
        entry,
      }));
    }
    const fallbackCarData = catalog?.carData || buildFallbackCatalog().carData;
    return POPULAR_FALLBACK.map((spec) => ({
      key: `${spec.make}-${spec.slug}`,
      make: spec.make,
      entry: resolvePopularEntry(fallbackCarData, spec),
      spec,
    }));
  }, [popularFromApi, catalog]);

  const selectClass =
    "h-12 w-full appearance-none rounded-lg border-[1.5px] border-[#E5E7EB] bg-white px-4 text-sm text-[#111111] outline-none focus:border-[#C41E1E] focus:ring-2 focus:ring-[#C41E1E]/30";

  const skeletonClass = "h-12 w-full animate-pulse rounded-lg bg-[#E5E7EB]";
  const canSubmit = Boolean(make);

  const modelCardRowClass =
    "scrollbar-hidden -mx-4 mt-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0";

  return (
    <section className="homepage-section py-12 md:py-20" style={{ background: "#F3F4F6" }}>
      <div className="store-container mx-auto max-w-[1100px]">
        <div className="relative">
          <h2 className="font-heading text-[28px] font-bold text-[#111111] sm:text-[36px]">{title}</h2>
          <div style={{ width: 48, height: 3, background: "#C41E1E", marginTop: 8 }} />
          <p className="mt-2 text-sm text-[#6B7280]">Select your vehicle to find compatible accessories</p>
        </div>

        <form ref={selectorRef} onSubmit={submit} className="mt-8 scroll-mt-24">
          <div className="grid gap-3 sm:grid-cols-4">
            {loading ? (
              <>
                <div className={skeletonClass} />
                <div className={skeletonClass} />
                <div className={skeletonClass} />
                <div className={skeletonClass} />
              </>
            ) : (
              <>
                <div className="relative">
                  <div className="pointer-events-none absolute left-3 top-1/2 z-10 flex -translate-y-1/2 items-center">
                    {make ? <MakeLogoSmall make={make} logoUrl={selectedMakeLogo} /> : null}
                  </div>
                  <select
                    className={`${selectClass} ${make ? "pl-11" : ""}`}
                    value={make}
                    onChange={(e) => {
                      selectMakeDropdown(e.target.value);
                      setExpandedMake(e.target.value);
                    }}
                    required
                    aria-label="Select make"
                  >
                    <option value="">Make</option>
                    {makes.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                <select
                  ref={modelSelectRef}
                  className={selectClass}
                  value={modelSlug}
                  onChange={(e) => selectModelSlug(e.target.value)}
                  disabled={!make}
                  aria-label="Select model"
                >
                  <option value="">Model</option>
                  {modelGroups.map(([groupName, entries]) => (
                    <optgroup key={groupName} label={`── ${groupName} ──`}>
                      {entries.map((entry) => {
                        const nick = formatModelShortLabel(entry);
                        const yf = entry.yearFrom;
                        const yt = entry.yearTo;
                        const yearLabel =
                          yf != null && yt != null
                            ? ` (${yf}–${yt})`
                            : yf != null
                              ? ` (${yf}+)`
                              : "";
                        const label =
                          nick && nick !== entry.model
                            ? `${entry.model} (${nick})${yearLabel}`
                            : `${nick || entry.model}${yearLabel}`;
                        return (
                          <option key={entry.slug} value={entry.slug}>
                            {label}
                          </option>
                        );
                      })}
                    </optgroup>
                  ))}
                </select>

                <select
                  ref={yearSelectRef}
                  className={selectClass}
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  disabled={!modelSlug}
                  aria-label="Select year"
                >
                  <option value="">Year</option>
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>

                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="h-12 rounded-lg text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                  style={{ background: "#C41E1E" }}
                >
                  Find Accessories →
                </button>
              </>
            )}
          </div>
        </form>

        {selectedEntry && make && !loading ? (
          <div className="mt-6 overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-sm">
            <div className="flex flex-col sm:flex-row">
              <div className="relative h-44 w-full shrink-0 sm:h-auto sm:w-56">
                {selectedEntry.image ? (
                  <Image
                    src={selectedEntry.image}
                    alt=""
                    fill
                    className="object-cover"
                    unoptimized
                    sizes="224px"
                  />
                ) : (
                  <ModelGradientPlaceholder
                    label={formatModelShortLabel(selectedEntry)}
                    className="h-full min-h-[176px] w-full"
                  />
                )}
              </div>
              <div className="flex flex-1 flex-col justify-center p-5">
                <h3 className="text-xl font-bold text-[#111111]">
                  {make} {formatModelTitle(selectedEntry)}
                </h3>
                <p className="mt-1 text-sm text-[#6B7280]">{formatModelSubtitle(selectedEntry)}</p>
                {selectedEntry.popularAccessories?.length ? (
                  <div className="mt-4">
                    <p className="text-xs font-semibold text-[#374151]">
                      Popular accessories for this car:
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {selectedEntry.popularAccessories.map((acc) => (
                        <Link
                          key={acc}
                          href={shopUrl({ q: acc })}
                          className="rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-1 text-xs font-medium text-[#374151] transition hover:border-[#C41E1E] hover:text-[#C41E1E]"
                        >
                          {acc}
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        {!loading ? (
          <>
            <div className="mt-10">
              <h3 className="text-lg font-bold text-[#111111]">Browse All Cars</h3>
              <div className="scrollbar-hidden -mx-4 mt-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
                {makes.map((m) => {
                  const logoUrl = resolveMakeLogo(makesMeta, m);
                  const count = makesMeta[m]?.modelCount ?? carData[m]?.length ?? 0;
                  const isExpanded = expandedMake === m;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => expandMake(m)}
                      className="shrink-0 text-center transition-all duration-200 hover:border-[#C41E1E] hover:shadow-md"
                      style={{
                        minWidth: "130px",
                        padding: "16px 12px",
                        background: "white",
                        border: isExpanded ? "1.5px solid #C41E1E" : "1.5px solid #E5E7EB",
                        borderRadius: "12px",
                        cursor: "pointer",
                        boxShadow: isExpanded ? "0 4px 12px rgba(0,0,0,0.08)" : undefined,
                      }}
                    >
                      <MakeLogoBrowse make={m} logoUrl={logoUrl} />
                      <p className="text-[15px] font-bold text-[#111111]">{m}</p>
                      <p className="mt-1 text-[13px] text-[#6B7280]">
                        {count} model{count === 1 ? "" : "s"}
                      </p>
                    </button>
                  );
                })}
              </div>

              {expandedMake && expandedModels.length > 0 ? (
                <div ref={expandedRef} className="mt-6">
                  <h4 className="text-xl font-bold text-[#111111]">{expandedMake} Models</h4>
                  <p className="mt-1 text-sm text-[#6B7280]">Click a model to find accessories</p>
                  <div className={modelCardRowClass}>
                    {expandedModels.map((entry) => (
                      <SquareModelCard
                        key={entry.slug}
                        entry={entry}
                        makeName={expandedMake}
                        onClick={() => pickModel(entry, expandedMake)}
                      />
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="mt-10">
              <h3 className="text-lg font-bold text-[#111111]">Popular Models in Pakistan</h3>
              <div className={modelCardRowClass}>
                {popularDisplay.map(({ key, make: makeName, entry }) => (
                  <SquareModelCard
                    key={key}
                    entry={entry}
                    makeName={makeName}
                    onClick={() => {
                      if (entry?.slug) {
                        pickModel(entry, makeName);
                      } else {
                        expandMake(makeName);
                      }
                    }}
                  />
                ))}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}
