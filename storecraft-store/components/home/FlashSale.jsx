"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatPrice } from "@/lib/currency";
import { cardImageUrl } from "@/lib/cloudinaryImage";
import { DEFAULT_HOMEPAGE_SETTINGS } from "@/lib/defaultHomepageSettings";

function getCountdown(endTimeIso) {
  const now = Date.now();
  let target = null;
  if (endTimeIso) {
    const parsed = new Date(endTimeIso).getTime();
    if (Number.isFinite(parsed) && parsed > now) target = parsed;
  }
  if (!target) {
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0);
    target = midnight.getTime();
  }
  const diff = Math.max(0, target - now);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return { h, m, s };
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function getImage(product) {
  return (
    (typeof product?.image === "string" ? product.image : product?.image?.url) ||
    product?.images?.[0]?.url ||
    ""
  );
}

function FlashProductCard({ product }) {
  const regular = Number(product.regularPrice ?? product.compareAt ?? product.price ?? 0);
  const sale = Number(product.salePrice ?? product.price ?? regular);
  const onSale = sale < regular && regular > 0;
  const imageUrl = cardImageUrl(getImage(product), 360) || getImage(product);

  return (
    <Link
      href={product.slug ? `/${product.slug}` : "#"}
      className="min-w-[160px] flex-shrink-0 overflow-hidden rounded-xl border bg-white md:min-w-[180px]"
      style={{ borderColor: "#F3F4F6" }}
    >
      <div className="relative aspect-square" style={{ background: "#F9FAFB" }}>
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt={product.name || "Product"} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-[#D1D5DB]">—</div>
        )}
        {onSale ? (
          <span
            className="absolute left-2 top-2 rounded-full px-2 py-0.5 text-[11px] font-semibold text-white"
            style={{ background: "#C41E1E" }}
          >
            Sale
          </span>
        ) : null}
      </div>
      <div className="p-3">
        <p className="line-clamp-2 text-sm font-medium text-[#111111]">{product.name}</p>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-sm font-bold text-[#111111]">{formatPrice(sale)}</span>
          {onSale ? (
            <span className="text-xs line-through" style={{ color: "#9CA3AF" }}>
              {formatPrice(regular)}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

function CountdownUnit({ value, label }) {
  return (
    <div className="text-center">
      <div className="font-heading text-[36px] font-bold leading-none text-[#111111]">{pad(value)}</div>
      <div className="mt-1 text-[10px] uppercase tracking-wide" style={{ color: "#9CA3AF" }}>
        {label}
      </div>
    </div>
  );
}

export default function FlashSale({ settings }) {
  const hp = settings || DEFAULT_HOMEPAGE_SETTINGS;
  const saleTitle = hp.flashSaleTitle || hp.sectionTitles?.flashSale || DEFAULT_HOMEPAGE_SETTINGS.flashSaleTitle;
  const endTime = hp.flashSaleEndTime || null;

  const [time, setTime] = useState(() => getCountdown(endTime));
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const tick = () => setTime(getCountdown(endTime));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [endTime]);

  useEffect(() => {
    fetch("/api/products?limit=12&sort=featured")
      .then((r) => r.json())
      .then((data) => {
        const list = data?.products || data?.data || [];
        const withDiscount = (Array.isArray(list) ? list : [])
          .map((p) => {
            const reg = Number(p.regularPrice ?? p.compareAt ?? p.price ?? 0);
            const sale = Number(p.salePrice ?? p.price ?? reg);
            const pct = reg > sale ? Math.round(((reg - sale) / reg) * 100) : 0;
            return { ...p, _pct: pct };
          })
          .filter((p) => p._pct > 0)
          .sort((a, b) => b._pct - a._pct);
        setProducts(withDiscount.length ? withDiscount.slice(0, 4) : (Array.isArray(list) ? list.slice(0, 4) : []));
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="homepage-section" style={{ background: "#FAFAFA" }}>
      <div className="store-container">
        <div
          className="flex flex-col gap-8 rounded-2xl p-8 md:p-10 lg:flex-row lg:items-center"
          style={{ background: "#FFF8F0", borderLeft: "4px solid #C41E1E" }}
        >
          <div className="lg:w-[300px] lg:flex-shrink-0">
            <p
              className="font-body uppercase"
              style={{ fontSize: 11, letterSpacing: "2px", color: "#C41E1E" }}
            >
              Flash Sale
            </p>
            <h2 className="font-heading mt-2 text-[48px] font-bold leading-tight text-[#111111]">{saleTitle}</h2>

            <div className="mt-6 flex items-center gap-2">
              <CountdownUnit value={time.h} label="Hours" />
              <span className="font-heading text-2xl font-bold" style={{ color: "#C41E1E" }}>
                :
              </span>
              <CountdownUnit value={time.m} label="Mins" />
              <span className="font-heading text-2xl font-bold" style={{ color: "#C41E1E" }}>
                :
              </span>
              <CountdownUnit value={time.s} label="Secs" />
            </div>

            <Link href="/shop?deals=1" className="mt-6 inline-block text-sm font-semibold text-[#C41E1E] hover:underline">
              Shop deals →
            </Link>
          </div>

          <div className="flex-1 overflow-x-auto pb-1">
            <div className="flex gap-4">
              {loading
                ? Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="min-w-[160px] flex-shrink-0 animate-pulse rounded-xl bg-[#F3F4F6] aspect-square" />
                  ))
                : products.map((p) => <FlashProductCard key={p.id || p.slug} product={p} />)}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
