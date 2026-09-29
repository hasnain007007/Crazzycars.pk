"use client";

import { useEffect, useMemo, useRef, useState } from "react";

/**
 * Searchable destination city picker — values come from Run Courier GetCitiesList.
 */
export default function RunCourierCitySelect({
  cities = [],
  value = "",
  onChange,
  placeholder = "Search Run Courier city…",
  disabled = false,
  style = {},
  inputClassName = "",
  invalid = false,
}) {
  const rootRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const list = useMemo(() => {
    const base = Array.isArray(cities) ? cities.filter(Boolean) : [];
    const q = String(query || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");
    if (!q) return base.slice(0, 80);
    const compact = q.replace(/\s+/g, "");
    const scored = [];
    for (const c of base) {
      const name = String(c);
      const lower = name.toLowerCase();
      const cpt = lower.replace(/\s+/g, "");
      let score = 0;
      if (lower === q || cpt === compact) score = 300;
      else if (lower.startsWith(q) || cpt.startsWith(compact)) score = 200;
      else if (lower.includes(q) || cpt.includes(compact)) score = 100;
      else continue;
      scored.push({ name, score });
    }
    scored.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
    return scored.slice(0, 80).map((s) => s.name);
  }, [cities, query]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  useEffect(() => {
    function onDoc(e) {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const display = open ? query : value || "";
  const defaultInputStyle = inputClassName
    ? undefined
    : {
        width: "100%",
        padding: "6px 28px 6px 8px",
        border: `1px solid ${invalid ? "#FCA5A5" : "#E5E7EB"}`,
        borderRadius: 6,
        fontSize: 13,
        background: disabled ? "#F9FAFB" : invalid ? "#FEF2F2" : "#fff",
        color: "#111827",
        boxSizing: "border-box",
      };

  return (
    <div ref={rootRef} style={{ position: "relative", ...style }}>
      <input
        type="text"
        autoComplete="off"
        disabled={disabled}
        placeholder={value ? String(value) : placeholder}
        value={display}
        onFocus={() => {
          if (disabled) return;
          setOpen(true);
          setQuery("");
        }}
        onChange={(e) => {
          setOpen(true);
          setQuery(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setOpen(false);
            setQuery("");
          }
          if (e.key === "Enter") {
            e.preventDefault();
            const first = list[0];
            if (first) {
              onChange?.(first);
              setOpen(false);
              setQuery("");
            }
          }
        }}
        className={inputClassName || undefined}
        style={defaultInputStyle}
      />
      {value && !open && !disabled ? (
        <button
          type="button"
          title="Clear city"
          onClick={(e) => {
            e.stopPropagation();
            onChange?.("");
            setOpen(true);
          }}
          className="absolute right-1 top-1/2 -translate-y-1/2 px-1 text-[10px] font-bold text-slate-400 hover:text-rose-600"
        >
          ×
        </button>
      ) : null}
      {open && !disabled ? (
        <ul className="absolute left-0 right-0 top-full z-40 mt-0.5 max-h-[220px] list-none overflow-y-auto rounded-md border border-slate-300 bg-white p-0 shadow-lg dark:border-slate-600 dark:bg-slate-900">
          {list.length === 0 ? (
            <li className="px-2.5 py-2 text-xs text-slate-500">
              No matching cities in Run Courier list
            </li>
          ) : (
            list.map((name) => (
              <li key={name}>
                <button
                  type="button"
                  onClick={() => {
                    onChange?.(name);
                    setOpen(false);
                    setQuery("");
                  }}
                  className={`block w-full px-2.5 py-1.5 text-left text-xs text-slate-900 hover:bg-emerald-50 dark:text-slate-100 dark:hover:bg-slate-800 ${
                    name === value ? "bg-emerald-50 font-semibold dark:bg-slate-700" : "bg-transparent"
                  }`}
                >
                  {name}
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
