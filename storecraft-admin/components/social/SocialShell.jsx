"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FONT, COLORS, pageStyle } from "./socialTheme";

const NAV = [
  { href: "/social", label: "Calendar", exact: true },
  { href: "/social/import", label: "Import week" },
  { href: "/social/history", label: "History" },
  { href: "/social/settings", label: "Settings" },
];

export function SocialShell({ children }) {
  const pathname = usePathname();

  function active(href, exact) {
    if (exact) return pathname === href || pathname === `${href}/`;
    return pathname.startsWith(href);
  }

  return (
    <div style={pageStyle()} className="min-h-full bg-[#F6F6F8]">
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap"
      />
      <nav className="sticky top-0 z-30 border-b border-[#E8E8ED] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 py-2">
          {NAV.map(({ href, label, exact }) => {
            const on = active(href, exact);
            return (
              <Link
                key={href}
                href={href}
                className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  on ? "text-white" : "text-[#6B6B76] hover:bg-[#F6F6F8]"
                }`}
                style={on ? { backgroundColor: COLORS.brand, fontFamily: FONT } : { fontFamily: FONT }}
              >
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
      {children}
    </div>
  );
}
