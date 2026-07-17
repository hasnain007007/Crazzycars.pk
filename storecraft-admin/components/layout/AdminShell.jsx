/**
 * Client admin shell: sidebar + topbar + main content with mobile drawer state.
 */
"use client";

import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export function AdminShell({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f9fafb] text-[#111827] dark:bg-slate-950 dark:text-slate-100">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      {mobileOpen ? (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-30 bg-slate-900/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}
      <div className="min-h-screen md:pl-[220px] print:pl-0">
        <Topbar onMenuClick={() => setMobileOpen(true)} />
        <main className="px-4 py-5 md:px-6 md:py-6 print:px-4 print:py-4">{children}</main>
      </div>
    </div>
  );
}
