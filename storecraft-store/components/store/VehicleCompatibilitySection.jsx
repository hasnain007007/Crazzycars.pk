"use client";

import { useState } from "react";
import { formatYearRange, vehicleCompatibilityFromProduct } from "@/lib/vehicleCompatibility";

export function VehicleCompatibilitySection({ product }) {
  const vc = vehicleCompatibilityFromProduct(product);
  const [expanded, setExpanded] = useState(false);

  if (vc.fitmentType === "universal") {
    return (
      <div className="rounded-lg border border-[#E5E5E5] bg-white p-4">
        <h3 className="text-sm font-bold text-[#111111]">Vehicle Compatibility</h3>
        <p className="mt-2 flex items-center gap-2 text-sm text-emerald-700">
          <span aria-hidden>✅</span>
          <span className="font-semibold">Universal Fit</span>
        </p>
        <p className="mt-1 text-sm text-[#555555]">
          {vc.universalNote || "This product fits all car makes and models"}
        </p>
      </div>
    );
  }

  if (vc.fitmentType === "semi-universal") {
    const shown = expanded ? vc.vehicles : vc.vehicles.slice(0, 5);
    return (
      <div className="rounded-lg border border-[#E5E5E5] bg-white p-4">
        <h3 className="text-sm font-bold text-[#111111]">Vehicle Compatibility</h3>
        <p className="mt-2 flex items-center gap-2 text-sm text-amber-800">
          <span aria-hidden>⚡</span>
          <span className="font-semibold">Fits Most Cars</span>
        </p>
        <p className="mt-1 text-sm text-[#555555]">{vc.universalNote}</p>
        {vc.vehicles.length ? (
          <>
            <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-[#888888]">
              Exceptions
            </p>
            <FitmentTable rows={shown} />
            {vc.vehicles.length > 5 ? (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="mt-2 text-sm font-medium text-[#C41E1E]"
              >
                {expanded ? "Show less ▲" : `Show all ${vc.vehicles.length} exceptions ▼`}
              </button>
            ) : null}
          </>
        ) : null}
      </div>
    );
  }

  const rows = expanded ? vc.vehicles : vc.vehicles.slice(0, 5);
  if (!vc.vehicles.length) {
    return (
      <div className="rounded-lg border border-[#E5E5E5] bg-white p-4">
        <h3 className="text-sm font-bold text-[#111111]">Vehicle Compatibility</h3>
        <p className="mt-2 text-sm text-[#555555]">Compatibility details coming soon.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[#E5E5E5] bg-white p-4">
      <h3 className="text-sm font-bold text-[#111111]">🚗 Vehicle Compatibility</h3>
      <div className="mt-3 overflow-x-auto">
        <FitmentTable rows={rows} />
      </div>
      {vc.vehicles.length > 5 ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 text-sm font-medium text-[#C41E1E]"
        >
          {expanded ? "Show less ▲" : `Show all ${vc.vehicles.length} vehicles ▼`}
        </button>
      ) : null}
    </div>
  );
}

function FitmentTable({ rows }) {
  return (
    <table className="min-w-[320px] w-full text-left text-sm">
      <thead>
        <tr className="border-b border-[#EEEEEE] text-xs text-[#888888]">
          <th className="py-2 pr-3 font-semibold">Make</th>
          <th className="py-2 pr-3 font-semibold">Model</th>
          <th className="py-2 pr-3 font-semibold">Years</th>
          <th className="py-2 font-semibold">Body</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={row._id || `${row.make}-${row.model}-${i}`} className="border-b border-[#F3F4F6]">
            <td className="py-2 pr-3 text-[#111111]">{row.make || "—"}</td>
            <td className="py-2 pr-3 text-[#111111]">{row.model || "All"}</td>
            <td className="py-2 pr-3 text-[#555555]">{formatYearRange(row)}</td>
            <td className="py-2 text-[#555555]">{row.bodyStyle || "All"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
