"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useCart } from "@/context/CartContext";

const WISHLIST_KEY = "sialkot_wishlist";

const NAV = [
  { href: "/", label: "Home", key: "home" },
  { href: null, label: "Search", key: "search", isSearch: true },
  { href: null, label: "Cart", key: "cart", isCart: true },
  { href: "/wishlist", label: "Wishlist", key: "wishlist" },
  { href: "/account", label: "Account", key: "account" },
];

function NavIcon({ name, active }) {
  const color = active ? "#C41E1E" : "#9CA3AF";
  const stroke = active ? "#C41E1E" : "#9CA3AF";

  if (name === "home") {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.75">
        <path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
      </svg>
    );
  }
  if (name === "search") {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.75">
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </svg>
    );
  }
  if (name === "cart") {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.75">
        <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" />
      </svg>
    );
  }
  if (name === "wishlist") {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill={active ? color : "none"} stroke={stroke} strokeWidth="1.75">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    );
  }
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.75">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { items, setOpen } = useCart();
  const [wishCount, setWishCount] = useState(0);
  const [mounted, setMounted] = useState(false);

  const cartCount = items.reduce((s, i) => s + (Number(i.quantity) || 1), 0);
  const badgeCart = mounted ? cartCount : 0;
  const badgeWish = mounted ? wishCount : 0;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function read() {
      try {
        const raw = localStorage.getItem(WISHLIST_KEY);
        const list = raw ? JSON.parse(raw) : [];
        setWishCount(Array.isArray(list) ? list.length : 0);
      } catch {
        setWishCount(0);
      }
    }
    read();
    window.addEventListener("sialkot-wishlist-change", read);
    return () => window.removeEventListener("sialkot-wishlist-change", read);
  }, []);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[8000] flex h-14 border-t bg-white md:hidden"
      style={{ borderColor: "#E5E7EB", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      aria-label="Mobile navigation"
    >
      {NAV.map((item) => {
        const active = item.href
          ? pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href))
          : false;

        const content = (
          <>
            <span className="relative">
              <NavIcon name={item.key} active={active} />
              {item.key === "cart" && badgeCart > 0 ? (
                <span
                  className="absolute -right-2 -top-1.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full px-0.5 text-[8px] font-bold text-white"
                  style={{ background: "#C41E1E" }}
                >
                  {badgeCart > 9 ? "9+" : badgeCart}
                </span>
              ) : null}
              {item.key === "wishlist" && badgeWish > 0 ? (
                <span
                  className="absolute -right-2 -top-1.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full px-0.5 text-[8px] font-bold text-white"
                  style={{ background: "#C41E1E" }}
                >
                  {badgeWish > 9 ? "9+" : badgeWish}
                </span>
              ) : null}
            </span>
            {active ? (
              <span className="text-[10px] font-medium" style={{ color: "#C41E1E" }}>
                {item.label}
              </span>
            ) : null}
          </>
        );

        if (item.isCart) {
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setOpen(true)}
              className="flex flex-1 flex-col items-center justify-center gap-0.5"
              aria-label="Cart"
            >
              {content}
            </button>
          );
        }

        if (item.isSearch) {
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => window.dispatchEvent(new Event("open-mobile-search"))}
              className="flex flex-1 flex-col items-center justify-center gap-0.5"
              aria-label="Search"
            >
              {content}
            </button>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-1 flex-col items-center justify-center gap-0.5"
            aria-label={item.label}
            aria-current={active ? "page" : undefined}
          >
            {content}
          </Link>
        );
      })}
    </nav>
  );
}
