"use client";

import "./globals.css";
import { StoreErrorFallback } from "@/components/store/StoreErrorFallback";

export default function GlobalError({ reset }) {
  return (
    <html lang="en">
      <body className="min-h-full bg-white text-zinc-900 antialiased">
        <StoreErrorFallback reset={reset} />
      </body>
    </html>
  );
}
