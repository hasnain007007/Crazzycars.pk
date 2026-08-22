"use client";

import Link from "next/link";

/**
 * Walk-in sales are Invoices first — they do not create an Order until staff
 * converts on the invoice (create-order). Keep that explicit in operator copy.
 */
const actions = [
  {
    href: "/invoices/new",
    label: "+ New Sale",
    sub: "Walk-in invoice for counter / WhatsApp sales",
    className: "bg-[#1A7A4C] text-white hover:bg-[#15663f]",
  },
  {
    href: "/catalog/products/new",
    label: "+ Add Product",
    sub: "Add to catalog",
    className: "bg-[#E8913A] text-white hover:bg-[#d47f2a]",
  },
  {
    href: "/invoices",
    label: "Invoices",
    sub: "PDFs, payments — convert to Order when shipping",
    className: "bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900",
  },
];

export function QuickActions() {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Quick actions</h3>
      <p className="text-xs text-slate-400">Jump into daily work</p>
      <div className="mt-4 flex flex-col gap-2.5">
        {actions.map((a) => (
          <Link
            key={a.label}
            href={a.href}
            className={`rounded-xl px-4 py-3.5 text-center text-sm font-bold shadow-sm transition ${a.className}`}
          >
            {a.label}
            <span className="mt-0.5 block text-[10px] font-medium opacity-80">{a.sub}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
