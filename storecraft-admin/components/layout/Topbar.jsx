/**
 * Admin top bar: mobile menu, page title, theme toggle, user dropdown.
 */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { StockAlertDropdown } from "@/components/stock-alerts/StockAlertDropdown";
import { getAdminSettings } from "@/lib/adminSettingsCache";

const PATH_TITLES = [
  { prefix: "/dashboard", title: "Dashboard" },
  { prefix: "/catalog/categories", title: "Categories" },
  { prefix: "/catalog/products", title: "Products" },
  { prefix: "/orders", title: "Orders" },
  { prefix: "/invoices", title: "Invoices" },
  { prefix: "/accounts/receive", title: "Single Receiving" },
  { prefix: "/accounts/ledger", title: "Account Ledger" },
  { prefix: "/customers", title: "Customers" },
  { prefix: "/reviews", title: "Reviews" },
  { prefix: "/coupons", title: "Coupons" },
  { prefix: "/blog-manager/new", title: "New Blog" },
  { prefix: "/blog-manager", title: "Blog" },
  { prefix: "/pages-manager", title: "Pages" },
  { prefix: "/banners", title: "Banners" },
  { prefix: "/product-options", title: "Product Options" },
  { prefix: "/postex", title: "PostEx Courier" },
  { prefix: "/shipping", title: "Shipping" },
  { prefix: "/redirects", title: "Redirects" },
  { prefix: "/reports/stock", title: "Stock Report" },
  { prefix: "/reports/sales", title: "Sales Report" },
  { prefix: "/users", title: "Users" },
  { prefix: "/activity-log", title: "Activity Log" },
  { prefix: "/settings", title: "Settings" },
];

function titleFromPath(pathname) {
  const hit = PATH_TITLES.find((p) => pathname === p.prefix || pathname.startsWith(`${p.prefix}/`));
  return hit?.title || "Admin";
}

export function Topbar({ onMenuClick }) {
  const pathname = usePathname();
  const title = titleFromPath(pathname);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const [stockOpen, setStockOpen] = useState(false);
  const stockRef = useRef(null);
  const [stockData, setStockData] = useState({ total: 0, preview: [] });
  const [storeSettings, setStoreSettings] = useState(null);
  const [settingsLoading, setSettingsLoading] = useState(true);

  useEffect(() => {
    function onDocClick(e) {
      if (!menuRef.current?.contains(e.target)) setMenuOpen(false);
      if (!stockRef.current?.contains(e.target)) setStockOpen(false);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  const fetchStockAlerts = useCallback(async () => {
    try {
      const res = await fetch("/api/stock-alerts/count", { credentials: "include" });
      const json = await res.json();
      if (json.success) {
        setStockData({
          total: json.total ?? 0,
          outOfStock: json.outOfStock ?? 0,
          lowStock: json.lowStock ?? 0,
          preview: json.preview ?? [],
        });
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => {
      fetchStockAlerts();
    }, 0);
    const t = setInterval(fetchStockAlerts, 5 * 60 * 1000);
    return () => {
      clearTimeout(id);
      clearInterval(t);
    };
  }, [fetchStockAlerts]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const next = await getAdminSettings();
        if (!cancelled && next) setStoreSettings(next);
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setSettingsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleTheme = useCallback(() => {
    const root = document.documentElement;
    const isDark = root.classList.contains("dark");
    if (isDark) {
      root.classList.remove("dark");
      try {
        localStorage.setItem("sialkot-theme", "light");
      } catch {
        /* ignore */
      }
    } else {
      root.classList.add("dark");
      try {
        localStorage.setItem("sialkot-theme", "dark");
      } catch {
        /* ignore */
      }
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    try {
      const stored = localStorage.getItem("sialkot-theme");
      if (stored === "dark") {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
        if (stored === null) {
          localStorage.setItem("sialkot-theme", "light");
        }
      }
    } catch {
      root.classList.remove("dark");
    }
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    window.location.href = "/login";
  }, []);
  const storeName = storeSettings?.storeName || process.env.NEXT_PUBLIC_STORE_NAME || 'Homefy.pk';
  const logoUrl = storeSettings?.logoUrl || "";

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-[#e5e7eb] bg-white/95 px-4 text-[#111827] backdrop-blur print:hidden dark:border-slate-800 dark:bg-slate-900/95 dark:text-slate-100 md:px-6">
      <button
        type="button"
        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#e5e7eb] text-[#374151] md:hidden dark:border-slate-700 dark:text-slate-200"
        aria-label="Open menu"
        onClick={onMenuClick}
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
        </svg>
      </button>
      <div className="min-w-0 flex flex-1 items-center gap-2">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt={storeName}
            width={32}
            height={32}
            className="hidden h-8 w-auto max-w-[120px] object-contain md:block"
            style={{ maxHeight: 32, maxWidth: 120, width: "auto", height: "auto", objectFit: "contain" }}
          />
        ) : settingsLoading && !storeSettings ? (
          <div className="hidden h-8 w-24 animate-pulse rounded bg-slate-200 md:block dark:bg-slate-700" />
        ) : null}
        <h1 className="min-w-0 truncate text-lg font-semibold text-[#111827] dark:text-white">{title}</h1>
      </div>

      <div className="relative shrink-0" ref={stockRef}>
        <button
          type="button"
          onClick={() => setStockOpen((o) => !o)}
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#e5e7eb] text-lg hover:bg-[#f9fafb] dark:border-slate-700 dark:hover:bg-slate-800"
          aria-label="Stock alerts"
          aria-expanded={stockOpen}
        >
          <span aria-hidden>🔔</span>
          {stockData.total > 0 ? (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-0.5 text-[10px] font-bold text-white">
              {stockData.total > 99 ? "99+" : stockData.total}
            </span>
          ) : null}
        </button>
        <StockAlertDropdown open={stockOpen} onClose={() => setStockOpen(false)} data={stockData} />
      </div>

      <button
        type="button"
        onClick={toggleTheme}
        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#e5e7eb] text-[#374151] hover:bg-[#f9fafb] dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        aria-label="Toggle theme"
      >
        <span className="hidden dark:inline">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
            />
          </svg>
        </span>
        <span className="inline dark:hidden">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"
            />
          </svg>
        </span>
      </button>

      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1d6fb8] text-xs font-semibold text-white ring-2 ring-white dark:ring-slate-900"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
        >
          MI
        </button>
        {menuOpen ? (
          <div
            role="menu"
            className="absolute right-0 mt-2 w-44 overflow-hidden rounded-lg border border-border bg-white py-1 text-sm shadow-lg dark:border-slate-700 dark:bg-slate-900"
          >
            <Link
              href="/settings"
              role="menuitem"
              className="block px-3 py-2 text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
              onClick={() => setMenuOpen(false)}
            >
              Profile
            </Link>
            <button
              type="button"
              role="menuitem"
              className="block w-full px-3 py-2 text-left text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
              onClick={logout}
            >
              Log out
            </button>
          </div>
        ) : null}
      </div>
    </header>
  );
}
