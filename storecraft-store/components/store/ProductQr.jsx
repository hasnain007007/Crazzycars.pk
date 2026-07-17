"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function ProductQr({ url }) {
  const [src, setSrc] = useState("");

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    QRCode.toDataURL(url, { width: 200, margin: 1, color: { dark: "#E8E8E8", light: "#111111" } })
      .then((dataUrl) => {
        if (!cancelled) setSrc(dataUrl);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [url]);

  if (!src) return <div className="mx-auto h-[200px] w-[200px] animate-pulse rounded-lg bg-[#1A1A1A]" />;
  return (
    <div className="text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="Scan to open this product" className="mx-auto h-[200px] w-[200px]" />
      <p className="mt-2 text-xs text-[#B0B0B0]">Scan to share this product</p>
    </div>
  );
}
