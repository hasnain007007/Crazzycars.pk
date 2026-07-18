/**
 * Fixed admin sidebar with grouped navigation, profile footer, and logout.
 */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { getAdminSettings } from "@/lib/adminSettingsCache";

const NAV = [
  {
    label: "MAIN",
    items: [{ href: "/dashboard", label: "Dashboard", icon: "home" }],
  },
  {
    label: "CATALOG",
    items: [
      { href: "/catalog/categories", label: "Categories", icon: "folder" },
      { href: "/car-catalog", label: "Car Catalog", icon: "car" },
      { href: "/catalog/products", label: "Products", icon: "cube" },
      { href: "/product-options", label: "Product Options", icon: "sliders" },
      { href: "/reviews", label: "Reviews", icon: "star" },
    ],
  },
  {
    label: "SALES",
    items: [
      { href: "/orders", label: "Orders", icon: "cart" },
      { href: "/invoices", label: "Invoices", icon: "invoice" },
      { href: "/customers", label: "Customers", icon: "users" },
      { href: "/coupons", label: "Coupons", icon: "tag" },
    ],
  },
  {
    label: "CONTENT",
    items: [
      { href: "/blog-manager", label: "Blog", icon: "doc" },
      { href: "/pages", label: "Pages", icon: "page" },
      { href: "/featured-media", label: "Featured Media", icon: "playCircle" },
      { href: "/banners", label: "Banners", icon: "image" },
    ],
  },
  {
    label: "STORE",
    items: [
      { href: "/shipping", label: "Shipping", icon: "shippingEmoji" },
      { href: "/redirects", label: "Redirects", icon: "arrow" },
    ],
  },
  {
    label: "REPORTS",
    items: [
      { href: "/reports/stock", label: "Stock Report", icon: "chartBar" },
      { href: "/reports/sales", label: "Sales Report", icon: "chartLine" },
    ],
  },
  {
    label: "SYSTEM",
    items: [
      { href: "/users", label: "Users", icon: "shield" },
      { href: "/activity-log", label: "Activity Log", icon: "clock" },
      { href: "/settings", label: "Settings", icon: "cog" },
    ],
  },
];

function roleLabel(role) {
  const map = {
    superadmin: "Super Admin",
    admin: "Admin",
    editor: "Editor",
    viewer: "Viewer",
  };
  return map[role] || role || "Admin";
}

function Icon({ name }) {
  const common = "h-5 w-5 shrink-0";
  switch (name) {
    case "home":
      return (
        <svg className={common} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
        </svg>
      );
    case "folder":
      return (
        <svg className={common} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
        </svg>
      );
    case "car":
      return (
        <svg className={common} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3.75h7.5M4.5 9.75h15M6 15.75h.008M18 15.75h.008M5.25 9.75l1.5-4.5h10.5l1.5 4.5M7.5 15.75a1.5 1.5 0 103 0 1.5 1.5 0 00-3 0zm9 0a1.5 1.5 0 103 0 1.5 1.5 0 00-3 0z" />
        </svg>
      );
    case "cube":
      return (
        <svg className={common} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
        </svg>
      );
    case "cart":
      return (
        <svg className={common} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
        </svg>
      );
    case "invoice":
      return (
        <svg className={common} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      );
    case "users":
      return (
        <svg className={common} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
        </svg>
      );
    case "star":
      return (
        <svg className={common} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
        </svg>
      );
    case "tag":
      return (
        <svg className={common} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
        </svg>
      );
    case "doc":
      return (
        <svg className={common} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      );
    case "layers":
      return (
        <svg className={common} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.429 9.75L2.25 12l4.179 2.25m0-4.5l5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0l4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142 0l-5.571 3-5.571-3" />
        </svg>
      );
    case "page":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      );
    case "image":
      return (
        <svg className={common} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3A1.5 1.5 0 001.5 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008H12V8.25z" />
        </svg>
      );
    case "playCircle":
      return (
        <svg className={common} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.91 11.672a.375.375 0 010 .656l-5.603 3.113a.375.375 0 01-.557-.328V8.887c0-.286.307-.466.557-.327l5.603 3.112z" />
        </svg>
      );
    case "sliders":
      return (
        <svg className={common} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.375m-13.5 0H7.5m0 0V3.375m0 16.5V18" />
        </svg>
      );
    case "shippingEmoji":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <rect x="1" y="3" width="15" height="13" rx="1" />
          <path d="M16 8h4l3 5v4h-7V8z" />
          <circle cx="5.5" cy="18.5" r="2.5" />
          <circle cx="18.5" cy="18.5" r="2.5" />
        </svg>
      );
    case "truck":
      return (
        <svg className={common} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375A1.125 1.125 0 012.25 17.625V9.75A2.25 2.25 0 014.5 7.5h7.875A2.25 2.25 0 0114.25 9.75v6.375c0 .621-.504 1.125-1.125 1.125H3.375zM8.25 5.25h9M12 5.25V3m0 2.25H9.75m2.25 0h2.25M9 12h3.75" />
        </svg>
      );
    case "arrow":
      return (
        <svg className={common} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
        </svg>
      );
    case "chartBar":
      return (
        <svg className={common} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
      );
    case "chartLine":
      return (
        <svg className={common} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.5h6L10.5 6h3L16.5 18h3L21 10.5" />
        </svg>
      );
    case "shield":
      return (
        <svg className={common} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
        </svg>
      );
    case "clock":
      return (
        <svg className={common} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case "cog":
      return (
        <svg className={common} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.723 6.723 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      );
    default:
      return <span className={common} />;
  }
}

function isActive(pathname, href) {
  if (href === "/dashboard") return pathname === "/dashboard";

  // Orders: list + /orders/[id] only — never /orders/new (invoice flow)
  if (href === "/orders") {
    if (pathname === "/orders") return true;
    if (pathname.startsWith("/orders/new")) return false;
    return /^\/orders\/[^/]+$/.test(pathname);
  }

  // Invoices: list + /invoices/new + detail
  if (href === "/invoices") {
    return pathname === "/invoices" || pathname.startsWith("/invoices/");
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({ mobileOpen, onClose }) {
  const pathname = usePathname();
  const [displayName, setDisplayName] = useState("Muhammad Imran");
  const [displayRole, setDisplayRole] = useState("Super Admin");
  const [stockAlertTotal, setStockAlertTotal] = useState(0);
  const [storeSettings, setStoreSettings] = useState(null);
  const [settingsLoading, setSettingsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        const json = await res.json();
        if (!cancelled && json.success && json.user) {
          setDisplayName(json.user.name || "Muhammad Imran");
          setDisplayRole(roleLabel(json.user.role));
        }
      } catch {
        /* keep defaults */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const res = await fetch("/api/stock-alerts/count", { credentials: "include" });
        const json = await res.json();
        if (!cancelled && json.success) setStockAlertTotal(Number(json.total) || 0);
      } catch {
        /* ignore */
      }
    }
    poll();
    const t = setInterval(poll, 5 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    window.location.href = "/login";
  }, []);
  const storeName = storeSettings?.storeName || process.env.NEXT_PUBLIC_STORE_NAME || 'Crazzycars.pk';
  const logoUrl = storeSettings?.logoUrl || "";

  return (
    <aside
      className={[
        "fixed left-0 top-0 z-40 flex h-screen w-[220px] flex-col border-r border-[#e5e7eb] bg-[#ffffff] transition-transform print:hidden dark:border-slate-800 dark:bg-slate-900",
        mobileOpen ? "translate-x-0" : "-translate-x-full",
        "md:translate-x-0",
      ].join(" ")}
    >
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-[#e5e7eb] px-4 dark:border-slate-800">
        {settingsLoading && !storeSettings ? (
          <div className="h-9 w-full animate-pulse rounded-md bg-slate-200 dark:bg-slate-700" />
        ) : logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt={storeName} className="h-9 w-auto max-w-[36px] rounded object-contain" />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1d6fb8] text-xs font-bold text-white">
            SC
          </div>
        )}
        {settingsLoading && !storeSettings ? null : (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[#111827] dark:text-white">{storeName}</p>
            <p className="truncate text-xs text-[#6b7280]">Admin</p>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {NAV.map((section) => (
          <div key={section.label} className="mb-4">
            <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">
              {section.label}
            </p>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => onClose()}
                      className={[
                        "flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium transition",
                        active
                          ? "bg-[#eff6ff] text-[#1d4ed8] dark:bg-blue-500/15 dark:text-blue-400"
                          : "text-[#374151] hover:bg-[#f9fafb] dark:text-slate-300 dark:hover:bg-slate-800",
                      ].join(" ")}
                    >
                      <Icon name={item.icon} />
                      <span className="truncate">{item.label}</span>
                      {item.href === "/reports/stock" && stockAlertTotal > 0 ? (
                        <span
                          className="ml-auto h-2 w-2 shrink-0 rounded-full bg-amber-400 ring-2 ring-white dark:ring-slate-900"
                          title="Low or out of stock items"
                          aria-hidden
                        />
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-[#e5e7eb] p-3 dark:border-slate-800">
        <div className="rounded-lg bg-[#f9fafb] px-2 py-2 dark:bg-slate-800/80">
          <p className="truncate text-sm font-medium text-[#111827] dark:text-white">{displayName}</p>
          <p className="truncate text-xs text-[#6b7280] dark:text-slate-400">{displayRole}</p>
          <button
            type="button"
            onClick={logout}
            className="mt-2 w-full rounded-md border border-[#e5e7eb] bg-white px-2 py-1.5 text-xs font-medium text-[#374151] hover:bg-[#f9fafb] dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Log out
          </button>
        </div>
      </div>
    </aside>
  );
}
