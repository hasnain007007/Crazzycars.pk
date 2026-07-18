"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useCart } from "@/context/CartContext";
import { useStorePayment, useStoreSettings } from "@/context/StoreSettingsContext";
import { formatPrice } from "@/lib/currency";
import { normalizeStoreEmail } from "@/lib/storeContact";
import { trimmedLogoUrl } from "@/lib/storeLogo";
import { getCodFreeDeliveryProgress, getProgressBarThreshold } from "@/lib/freeDelivery";
import { categoryHref, getCategoryMegaColumns } from "@/lib/categories";
import { useCustomer } from "@/lib/customerAuth";

const WISHLIST_KEY = "sialkot_wishlist";

const DEFAULT_NAV = [
  { label: "Home", href: "/" },
  { label: "Shop", href: "/shop", mega: true },
  { label: "Categories", href: "/categories", mega: true },
  { label: "Splitters", href: categoryHref("splitters-side-skirts") },
  { label: "LED Lights", href: categoryHref("led-headlights-bulbs") },
  { label: "Body Kits", href: categoryHref("body-kits") },
  { label: "Car Care", href: categoryHref("care-cleaning") },
  { label: "Deals", href: "/shop?deals=1", deals: true },
  { label: "📦 Track Order", href: "/track-order", track: true },
  { label: "Blog", href: "/blogs" },
];

const DEFAULT_MEGA_COLS = getCategoryMegaColumns();

/** Map leftover template nav paths → real CrazzyCars category routes. */
function normalizeNavHref(label, href) {
  const raw = String(href || "").trim() || "/";
  const pathOnly = raw.split("?")[0].replace(/\/+$/, "") || "/";
  const key = `${String(label || "").trim().toLowerCase()}|${pathOnly.toLowerCase()}`;
  const byLabel = {
    exterior: categoryHref("splitters-side-skirts"),
    interior: categoryHref("steering-wheel-covers"),
    lighting: categoryHref("led-headlights-bulbs"),
    "car care": categoryHref("care-cleaning"),
    "car lighting": categoryHref("led-headlights-bulbs"),
    deals: "/shop?deals=1",
    blog: "/blogs",
  };
  const labelOnly = String(label || "").trim().toLowerCase();
  if (byLabel[labelOnly]) return byLabel[labelOnly];

  const brokenPaths = {
    "/categories/exterior": categoryHref("splitters-side-skirts"),
    "/exterior": categoryHref("splitters-side-skirts"),
    "/categories/interior": categoryHref("steering-wheel-covers"),
    "/interior": categoryHref("steering-wheel-covers"),
    "/categories/car-lighting": categoryHref("led-headlights-bulbs"),
    "/categories/lighting": categoryHref("led-headlights-bulbs"),
    "/lighting": categoryHref("led-headlights-bulbs"),
    "/categories/car-care": categoryHref("care-cleaning"),
    "/car-care": categoryHref("care-cleaning"),
    "/categories/seat-covers": categoryHref("steering-wheel-covers"),
    "/categories/floor-mats": categoryHref("universal-car-accessories"),
    "/blog": "/blogs",
  };
  if (brokenPaths[pathOnly.toLowerCase()]) return brokenPaths[pathOnly.toLowerCase()];
  void key;
  return raw.startsWith("/") || raw.startsWith("http") ? raw : `/${raw}`;
}

function humanizeNavLabel(label, href) {
  const cleaned = String(label || "").trim();
  if (cleaned && cleaned !== href && !cleaned.startsWith("/")) return cleaned;
  const path = String(href || "").split("?")[0].replace(/\/+$/, "") || "/";
  const map = {
    "/": "Home",
    "/shop": "Shop",
    "/products": "Products",
    "/categories": "Categories",
    "/wishlist": "Wishlist",
    "/account": "Account",
    "/blogs": "Blog",
    "/blog": "Blog",
    "/track-order": "Track Order",
    "/contact": "Contact",
    "/faq": "FAQ",
    "/about": "About",
    "/about-us": "About",
    "/sale": "Sale",
  };
  if (map[path]) return map[path];
  const last = path.split("/").filter(Boolean).pop() || "Page";
  return last
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function buildNavFromFooter(footer) {
  const shop = (footer?.shopLinks || [])
    .filter((l) => l.enabled !== false && (String(l.label || "").trim() || String(l.href || l.url || "").trim()))
    .map((l) => {
      const label = humanizeNavLabel(l.label, l.href || l.url);
      const href = normalizeNavHref(label, l.href || l.url || "/");
      return {
        label,
        href,
        mega: false,
        deals: /deal/i.test(String(label || href)),
      };
    });
  if (shop.length >= 4) return shop;
  return DEFAULT_NAV;
}

function buildMegaCols(footer) {
  const cats = (footer?.categoriesLinks || [])
    .filter((l) => l.enabled !== false && (String(l.label || "").trim() || String(l.href || l.url || "").trim()))
    .map((l) => {
      const label = humanizeNavLabel(l.label, l.href || l.url);
      const href = normalizeNavHref(label, l.href || l.url || "/categories");
      return {
        label,
        href: href === "#" ? "/categories" : href,
      };
    });
  if (cats.length < 3) return DEFAULT_MEGA_COLS;
  const chunk = Math.ceil(cats.length / 3);
  const cols = [];
  for (let i = 0; i < 3; i++) {
    const links = cats.slice(i * chunk, (i + 1) * chunk);
    if (links.length) cols.push({ title: i === 0 ? "Categories" : i === 1 ? "More" : "Shop", links });
  }
  return cols.length ? cols : DEFAULT_MEGA_COLS;
}

/** Derive brand + navigation config from store settings (used during SSR and on the client). */
function deriveHeaderConfig(data) {
  const general = data?.general || {};
  const footer = data?.footer || {};
  const mega = data?.megaMenu || {};

  const brand = {
    storeName: general.storeName || data?.storeName || "Crazzycars.pk",
    logo: general.logo || general.logoUrl || data?.logoUrl || "",
    phone: general.phone || data?.phone || "",
    email: normalizeStoreEmail(general.email || data?.email || ""),
    showStoreName: general.showStoreName !== false,
  };

  const menuItems = Array.isArray(mega.items) && mega.items.length ? mega.items : null;
  let nav;
  let megaCols;
  if (menuItems) {
    nav = menuItems
      .map((i) => {
        const label = humanizeNavLabel(i.label, i.href || i.url);
        const href = normalizeNavHref(label, i.href || i.url || "/");
        return {
          label,
          href,
          mega: mega.enabled !== false && (i.mega || (i.columns && i.columns.length > 0)),
          deals: Boolean(i.deals) || /deal/i.test(label),
          columns: (i.columns || []).map((c) => ({
            title: c.heading || c.title || "",
            links: (c.links || []).map((l) => {
              const linkLabel = humanizeNavLabel(l.label, l.href || l.url);
              const linkHref = normalizeNavHref(linkLabel, l.href || l.url || "#");
              return {
                label: linkLabel,
                href: linkHref === "#" ? "/shop" : linkHref,
              };
            }),
          })),
        };
      })
      .filter((i) => i.label);
    // Old template mega nav (Exterior/Interior/…) → use our catalog defaults
    const looksLegacy = nav.some((i) =>
      /^(exterior|interior|lighting|car care)$/i.test(String(i.label || "").trim())
    );
    if (looksLegacy) nav = DEFAULT_NAV;
    megaCols = DEFAULT_MEGA_COLS;
  } else {
    nav = buildNavFromFooter(footer);
    megaCols = buildMegaCols(footer);
  }

  return { brand, nav, megaCols, megaEnabled: mega.enabled !== false };
}

function splitStoreName(name) {
  const n = String(name || "Crazzycars.pk").trim();
  const parts = n.split(/\s+/);
  if (parts.length <= 1) return { line1: n.toUpperCase(), line2: "" };
  return {
    line1: parts.slice(0, -1).join(" ").toUpperCase(),
    line2: parts[parts.length - 1].toUpperCase(),
  };
}

function useWishlistCount() {
  const [n, setN] = useState(0);
  const read = useCallback(() => {
    try {
      const raw = localStorage.getItem(WISHLIST_KEY);
      const list = raw ? JSON.parse(raw) : [];
      setN(Array.isArray(list) ? list.length : 0);
    } catch {
      setN(0);
    }
  }, []);
  useEffect(() => {
    read();
    window.addEventListener("sialkot-wishlist-change", read);
    return () => window.removeEventListener("sialkot-wishlist-change", read);
  }, [read]);
  return n;
}

function IconAccount() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function IconHeart() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function IconBag() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}

function IconSearch() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}

function HeaderAction({ href, onClick, label, icon, badge }) {
  const inner = (
    <>
      <span className="relative flex items-center justify-center" style={{ color: "#111111" }}>
        {icon}
        {badge > 0 ? (
          <span
            className="absolute -right-2 -top-2 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-bold text-white"
            style={{ background: "#C41E1E" }}
          >
            {badge > 9 ? "9+" : badge}
          </span>
        ) : null}
      </span>
      <span className="text-[11px]" style={{ color: "#6B7280" }}>
        {label}
      </span>
    </>
  );

  const className = "flex flex-col items-center gap-1 transition hover:opacity-80";

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className} aria-label={label}>
        {inner}
      </button>
    );
  }

  return (
    <Link href={href} className={className} aria-label={label}>
      {inner}
    </Link>
  );
}

export function StoreHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { items, setOpen } = useCart();
  const { customer } = useCustomer();
  const ctxSettings = useStoreSettings();
  const storePayment = useStorePayment();
  const wishCount = useWishlistCount();
  const [cartToast, setCartToast] = useState(null);
  const [q, setQ] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
  const [drawerExpanded, setDrawerExpanded] = useState({});
  // Badges read cart/wishlist from localStorage after mount — keep them at 0
  // until then so SSR HTML matches the first client render.
  const [mounted, setMounted] = useState(false);
  // Derive header config synchronously from server-provided settings so SSR
  // and first client render match (no "default brand" flash / hydration diff).
  const hasCtxSettings = ctxSettings && Object.keys(ctxSettings).length > 0;
  const derived = useMemo(() => deriveHeaderConfig(hasCtxSettings ? ctxSettings : {}), [ctxSettings, hasCtxSettings]);
  const [fetched, setFetched] = useState(null);

  const config = hasCtxSettings ? derived : fetched || derived;
  const { brand, nav, megaCols, megaEnabled } = config;

  const [activeMegaItem, setActiveMegaItem] = useState(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (hasCtxSettings) return;
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => setFetched(deriveHeaderConfig(data?.data || {})))
      .catch(() => {});
  }, [hasCtxSettings]);

  const cartCount = items.reduce((s, i) => s + (Number(i.quantity) || 1), 0);
  const badgeCart = mounted ? cartCount : 0;
  const badgeWish = mounted ? wishCount : 0;
  const accountHref = customer ? "/account" : "/account/login";
  const { line1, line2 } = splitStoreName(brand.storeName);

  useEffect(() => {
    setMenuOpen(false);
    setMegaOpen(false);
    setMobileSearchOpen(false);
  }, [pathname]);

  useEffect(() => {
    const open = () => setMobileSearchOpen(true);
    window.addEventListener("open-mobile-search", open);
    return () => window.removeEventListener("open-mobile-search", open);
  }, []);

  useEffect(() => {
    const onAdded = (e) => {
      const subtotal = Number(e.detail?.subtotal) || 0;
      const threshold = getProgressBarThreshold(storePayment);
      const progress = getCodFreeDeliveryProgress(subtotal, threshold);
      const message = progress.unlocked
        ? "🎉 You have free delivery!"
        : `🛒 Item added! Add ${formatPrice(progress.remaining)} more for free delivery`;
      setCartToast({ message, id: Date.now() });
    };
    window.addEventListener("cart-item-added", onAdded);
    return () => window.removeEventListener("cart-item-added", onAdded);
  }, [storePayment]);

  useEffect(() => {
    if (!cartToast) return;
    const t = setTimeout(() => setCartToast(null), 3000);
    return () => clearTimeout(t);
  }, [cartToast]);

  function search(e) {
    e.preventDefault();
    const term = q.trim();
    setMobileSearchOpen(false);
    if (term) router.push(`/products?q=${encodeURIComponent(term)}`);
    else router.push("/products");
  }

  function isNavItemActive(item) {
    const href = String(item?.href || "");
    const [pathPart, query = ""] = href.split("?");
    const path = (pathPart || "/").replace(/\/+$/, "") || "/";
    const current = (pathname || "/").replace(/\/+$/, "") || "/";
    const dealsQ = searchParams?.get("deals");
    const saleQ = searchParams?.get("sale");
    const onDealsPage =
      (current === "/shop" || current === "/products" || current === "/sale") &&
      (dealsQ === "1" || dealsQ === "true" || saleQ === "true" || current === "/sale");

    if (item.deals || /deal/i.test(String(item.label || ""))) {
      return onDealsPage;
    }
    // Don't mark Shop active while viewing Deals
    if (onDealsPage && (path === "/shop" || path === "/products")) {
      return false;
    }
    if (query) {
      if (current !== path) return false;
      const params = new URLSearchParams(query);
      for (const [k, v] of params.entries()) {
        if (searchParams?.get(k) !== v) return false;
      }
      return true;
    }
    if (path === "/") return current === "/";

    // Exact match only for section roots like /categories, /shop, /blogs
    // so parent + child (CATEGORIES + LED LIGHTS) are not both red.
    if (path === "/categories" || path === "/shop" || path === "/products" || path === "/blogs") {
      if (path === "/shop" || path === "/products") {
        return current === "/shop" || current === "/products";
      }
      if (path === "/blogs") {
        return current === "/blogs" || current.startsWith("/blogs/");
      }
      // /categories → active only on the index, not on /categories/[slug]
      return current === "/categories";
    }

    // Specific links (e.g. /categories/led-headlights-bulbs) — exact path only
    return current === path;
  }

  const navLinkClass = (item) => {
    const active = isNavItemActive(item);
    return `px-3 py-3 text-sm font-semibold uppercase tracking-wide transition-colors ${
      active ? "" : "hover:text-[#C41E1E]"
    }`;
  };

  const dropdownCols =
    activeMegaItem?.columns?.length > 0 ? activeMegaItem.columns : megaCols;

  return (
    <header className="sticky top-0 z-[7000]">
      {cartToast ? (
        <div
          role="status"
          style={{
            position: "fixed",
            top: brand.phone || brand.email ? 72 : 80,
            right: 16,
            zIndex: 8000,
            background: "#111111",
            color: "#FFFFFF",
            borderRadius: 8,
            fontSize: 13,
            padding: "10px 16px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
            maxWidth: 320,
            lineHeight: 1.4,
            transition: "opacity 0.3s ease",
          }}
        >
          {cartToast.message}
        </div>
      ) : null}
      {brand.phone || brand.email ? (
        <div className="hidden border-b bg-[#111111] text-xs text-white md:block" style={{ borderColor: "#2A2A2A" }}>
          <div className="store-container flex h-9 items-center justify-end gap-6">
            {brand.phone ? (
              <a href={`tel:${String(brand.phone).replace(/\s/g, "")}`} className="hover:text-[#F87171]">
                {brand.phone}
              </a>
            ) : null}
            {brand.email ? (
              <a href={`mailto:${brand.email}`} className="hover:text-[#F87171]">
                {brand.email}
              </a>
            ) : null}
          </div>
        </div>
      ) : null}
      {/* Row 1 — main */}
      <div className="border-b bg-white" style={{ borderColor: "#E5E7EB" }}>
        <div className="store-container flex h-[72px] items-center gap-4">
          <button
            type="button"
            className="flex h-10 w-10 shrink-0 items-center justify-center md:hidden"
            aria-label="Open menu"
            onClick={() => setMenuOpen(true)}
          >
            <span className="text-xl text-[#111111]">☰</span>
          </button>

          <Link href="/" className="flex shrink-0 items-center gap-2 leading-none">
            {brand.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={trimmedLogoUrl(brand.logo)}
                alt={brand.storeName}
                className="h-16 max-w-[220px] object-contain"
                style={{ height: 64, width: "auto", maxWidth: 220, objectFit: "contain" }}
              />
            ) : brand.showStoreName ? (
              <span className="flex flex-col">
                <span className="font-heading text-xl font-bold tracking-tight" style={{ color: "#111111" }}>
                  {line1}
                </span>
                {line2 ? (
                  <span className="font-heading text-base font-normal" style={{ color: "#C41E1E" }}>
                    {line2}
                  </span>
                ) : null}
              </span>
            ) : (
              <span className="font-heading text-xl font-bold" style={{ color: "#111111" }}>
                {brand.storeName}
              </span>
            )}
          </Link>
          <form onSubmit={search} className="mx-auto hidden max-w-[480px] flex-1 md:block">
            <div className="relative">
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search products..."
                className="h-11 w-full rounded-lg border-[1.5px] bg-white pl-4 pr-12 text-sm outline-none transition"
                style={{ borderColor: "#E5E7EB" }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#C41E1E";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#E5E7EB";
                }}
              />
              <button
                type="submit"
                className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-white"
                style={{ background: "#C41E1E" }}
                aria-label="Search"
              >
                <IconSearch />
              </button>
            </div>
          </form>

          <div className="ml-auto hidden items-center gap-6 md:flex">
            <HeaderAction href={accountHref} label="Account" icon={<IconAccount />} badge={0} />
            <HeaderAction href="/wishlist" label="Saved" icon={<IconHeart />} badge={badgeWish} />
            <HeaderAction label="Cart" icon={<IconBag />} badge={badgeCart} onClick={() => setOpen(true)} />
          </div>

          <div className="ml-auto flex items-center gap-3 md:hidden">
            <button
              type="button"
              onClick={() => setMobileSearchOpen((v) => !v)}
              className="flex h-10 w-10 items-center justify-center"
              aria-label="Search"
              aria-expanded={mobileSearchOpen}
            >
              <IconSearch />
            </button>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="relative flex h-10 w-10 items-center justify-center"
              aria-label="Cart"
            >
              <IconBag />
              {badgeCart > 0 ? (
                <span
                  className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-bold text-white"
                  style={{ background: "#C41E1E" }}
                >
                  {badgeCart > 9 ? "9+" : badgeCart}
                </span>
              ) : null}
            </button>
          </div>
        </div>

        {mobileSearchOpen ? (
          <div className="border-t px-4 py-3 md:hidden" style={{ borderColor: "#E5E7EB" }}>
            <form onSubmit={search}>
              <div className="relative">
                <input
                  type="search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search products..."
                  autoFocus
                  className="h-11 w-full rounded-lg border-[1.5px] bg-white pl-4 pr-12 text-sm outline-none"
                  style={{ borderColor: "#C41E1E" }}
                />
                <button
                  type="submit"
                  className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-white"
                  style={{ background: "#C41E1E" }}
                  aria-label="Search"
                >
                  <IconSearch />
                </button>
              </div>
            </form>
          </div>
        ) : null}
      </div>

      {/* Row 3 — nav */}
      <nav
        className="relative hidden border-b-2 bg-white md:block"
        style={{ borderBottomColor: "#C41E1E" }}
        onMouseLeave={() => setMegaOpen(false)}
      >
        <div className="store-container flex items-center gap-1">
          {nav.map((item) => (
            <div
              key={item.label}
              className="relative"
              onMouseEnter={() => {
                if (megaEnabled && item.mega) {
                  setMegaOpen(true);
                  setActiveMegaItem(item);
                }
              }}
            >
              <Link
                href={item.href}
                className={navLinkClass(item)}
                style={{ color: isNavItemActive(item) ? "#C41E1E" : "#111111" }}
                aria-current={isNavItemActive(item) ? "page" : undefined}
              >
                {item.label}
              </Link>
            </div>
          ))}
        </div>
        {megaEnabled && megaOpen && dropdownCols.length > 0 ? (
          <div
            className="absolute left-0 right-0 border-t bg-white shadow-lg"
            style={{ borderColor: "#E5E7EB", zIndex: 7010 }}
          >
            <div className="store-container grid grid-cols-3 gap-8 py-8">
              {dropdownCols.map((col) => (
                <div key={col.title}>
                  <h4 className="font-heading mb-3 text-sm font-bold" style={{ color: "#111111" }}>
                    {col.title}
                  </h4>
                  <ul className="space-y-2">
                    {col.links.map((l) => (
                      <li key={l.label}>
                        <Link href={l.href} className="text-sm text-[#6B7280] transition hover:text-[#C41E1E]">
                          {l.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </nav>

      {/* Mobile overlay */}
      {menuOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[7500] bg-black/40 md:hidden"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          />
          <aside className="fixed inset-0 z-[7600] flex flex-col bg-white md:hidden">
            <div className="flex items-center justify-between border-b px-6 py-4" style={{ borderColor: "#E5E7EB" }}>
              <Link href="/" className="flex flex-col leading-none" onClick={() => setMenuOpen(false)}>
                {brand.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={trimmedLogoUrl(brand.logo)}
                    alt={brand.storeName}
                    className="h-10 max-w-[150px] object-contain"
                    style={{ height: 40, width: "auto", maxWidth: 150, objectFit: "contain" }}
                  />
                ) : (
                  <>
                    <span className="font-heading text-lg font-bold" style={{ color: "#111111" }}>
                      {line1}
                    </span>
                    {line2 ? (
                      <span className="font-heading text-sm" style={{ color: "#C41E1E" }}>
                        {line2}
                      </span>
                    ) : null}
                  </>
                )}
              </Link>
              <button type="button" className="text-2xl text-[#111111]" onClick={() => setMenuOpen(false)} aria-label="Close">
                ×
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-6 py-4">
              {nav.map((item) => (
                <div key={item.label} className="border-b" style={{ borderColor: "#F3F4F6" }}>
                  {megaEnabled && item.mega ? (
                    <>
                      <button
                        type="button"
                        className="flex w-full items-center justify-between py-4 text-left text-sm font-semibold text-[#111111]"
                        onClick={() => setDrawerExpanded((s) => ({ ...s, [item.label]: !s[item.label] }))}
                      >
                        {item.label}
                        <span className="text-[#9CA3AF]">{drawerExpanded[item.label] ? "−" : "+"}</span>
                      </button>
                      {drawerExpanded[item.label] ? (
                        <ul className="pb-3 pl-3">
                          {(item.columns?.length ? item.columns : megaCols)
                            .flatMap((c) => c.links)
                            .map((l) => (
                            <li key={l.label}>
                              <Link
                                href={l.href}
                                className="block py-2 text-sm text-[#6B7280]"
                                onClick={() => setMenuOpen(false)}
                              >
                                {l.label}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </>
                  ) : (
                    <Link
                      href={item.href}
                      className="block py-4 text-sm font-semibold uppercase"
                      style={{ color: isNavItemActive(item) ? "#C41E1E" : "#111111" }}
                      aria-current={isNavItemActive(item) ? "page" : undefined}
                      onClick={() => setMenuOpen(false)}
                    >
                      {item.label}
                    </Link>
                  )}
                </div>
              ))}
            </nav>
            <div className="border-t px-6 py-4" style={{ borderColor: "#E5E7EB" }}>
              <Link href={accountHref} className="block py-2 text-sm text-[#6B7280]" onClick={() => setMenuOpen(false)}>
                Account
              </Link>
              <Link href="/wishlist" className="block py-2 text-sm text-[#6B7280]" onClick={() => setMenuOpen(false)}>
                Saved items
              </Link>
            </div>
          </aside>
        </>
      ) : null}
    </header>
  );
}

export default StoreHeader;
