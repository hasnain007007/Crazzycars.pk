"use client";

import { useEffect, useState } from "react";

/**
 * Mount react-hot-toast only after hydration — not needed for LCP.
 */
export default function LazyToaster() {
  const [Toaster, setToaster] = useState(null);

  useEffect(() => {
    let cancelled = false;
    import("react-hot-toast").then((mod) => {
      if (!cancelled) setToaster(() => mod.Toaster);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!Toaster) return null;
  return <Toaster position="top-right" toastOptions={{ className: "text-sm" }} />;
}
