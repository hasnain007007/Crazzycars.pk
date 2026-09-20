"use client";

import Link from "next/link";
import { useState } from "react";
import { formatYearRange, vehicleCompatibilityFromProduct } from "@/lib/vehicleCompatibility";
import { carLinkForFitmentRow } from "@/lib/seo/carLinkMatch";

export function VehicleCompatibilitySection({ product, carLinks = [] }) {
  const vc = vehicleCompatibilityFromProduct(product);
  const [expanded, setExpanded] = useState(false);
  const links = Array.isArray(carLinks) ? carLinks : [];

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
            <FitmentTable rows={shown} carLinks={links} />
            <ShopByCarLinks links={links} />
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
      <h3 className="text-sm font-bold text-[#111111]">Vehicle Compatibility</h3>
      <div className="mt-3 overflow-x-auto">
        <FitmentTable rows={rows} carLinks={links} />
      </div>
      <ShopByCarLinks links={links} />
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

function ShopByCarLinks({ links }) {
  if (!links?.length) return null;
  return (
    <p className="mt-3 text-sm text-[#555555]">
      Shop by car:{" "}
      {links.map((link, i) => (
        <span key={link.slug}>
          {i > 0 ? <span aria-hidden>, </span> : null}
          <Link href={link.href || `/cars/${link.slug}`} className="font-medium text-[#C41E1E] underline-offset-2 hover:underline">
            {link.label}
          </Link>
        </span>
      ))}
    </p>
  );
}

function FitmentTable({ rows, carLinks = [] }) {
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
        {rows.map((row, i) => {
          const car = carLinkForFitmentRow(row, carLinks);
          return (
            <tr key={row._id || `${row.make}-${row.model}-${i}`} className="border-b border-[#F3F4F6]">
              <td className="py-2 pr-3 text-[#111111]">{row.make || "—"}</td>
              <td className="py-2 pr-3 text-[#111111]">
                {car ? (
                  <Link
                    href={car.href || `/cars/${car.slug}`}
                    className="font-medium text-[#C41E1E] underline-offset-2 hover:underline"
                  >
                    {row.model || "All"}
                  </Link>
                ) : (
                  row.model || "All"
                )}
              </td>
              <td className="py-2 pr-3 text-[#555555]">{formatYearRange(row)}</td>
              <td className="py-2 text-[#555555]">{row.bodyStyle || "All"}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
