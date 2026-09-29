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
        style={{
          width: "100%",
          padding: "6px 28px 6px 8px",
          border: "1px solid #E5E7EB",
          borderRadius: 6,
          fontSize: 13,
          background: disabled ? "#F9FAFB" : "#fff",
          color: "#111827",
          boxSizing: "border-box",
        }}
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
          style={{
            position: "absolute",
            right: 4,
            top: "50%",
            transform: "translateY(-50%)",
            border: "none",
            background: "transparent",
            color: "#9CA3AF",
            fontSize: 11,
            fontWeight: 700,
            cursor: "pointer",
            padding: "2px 4px",
          }}
        >
          ×
        </button>
      ) : null}
      {open && !disabled ? (
        <ul
          style={{
            position: "absolute",
            zIndex: 40,
            left: 0,
            right: 0,
            top: "100%",
            margin: "2px 0 0",
            padding: 0,
            listStyle: "none",
            maxHeight: 220,
            overflowY: "auto",
            background: "#fff",
            border: "1px solid #D1D5DB",
            borderRadius: 6,
            boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
          }}
        >
          {list.length === 0 ? (
            <li style={{ padding: "8px 10px", fontSize: 12, color: "#6B7280" }}>
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
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    border: "none",
                    background: name === value ? "#ECFDF5" : "transparent",
                    padding: "7px 10px",
                    fontSize: 12,
                    color: "#111827",
                    cursor: "pointer",
                  }}
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
