"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const CITIES = ["Lahore", "Karachi", "Islamabad", "Rawalpindi", "Faisalabad", "Multan", "Peshawar", "Quetta"];

function randomOf(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function SocialProofPopup() {
  const [products, setProducts] = useState([]);
  const [entry, setEntry] = useState(null);
  const [visible, setVisible] = useState(false);
  const [hiddenByUser, setHiddenByUser] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/products?limit=24");
        const json = await res.json();
        if (!cancelled && json.success) setProducts(json.products || []);
      } catch {
        if (!cancelled) setProducts([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const canShow = useMemo(() => products.length > 0 && !hiddenByUser, [products.length, hiddenByUser]);

  useEffect(() => {
    if (!canShow) return undefined;
    const intervalId = setInterval(() => {
      const product = randomOf(products);
      const city = randomOf(CITIES);
      const minsAgo = Math.floor(Math.random() * 9) + 1;
      setEntry({ product, city, minsAgo });
      setVisible(true);
      setTimeout(() => setVisible(false), 5000);
    }, 30000);

    const product = randomOf(products);
    setEntry({ product, city: randomOf(CITIES), minsAgo: Math.floor(Math.random() * 9) + 1 });
    setVisible(true);
    const initTimeout = setTimeout(() => setVisible(false), 5000);

    return () => {
      clearInterval(intervalId);
      clearTimeout(initTimeout);
    };
  }, [canShow, products]);

  if (!entry || !visible || !entry.product) return null;

  return (
    <div className="fixed bottom-4 left-4 z-[90] w-[320px] rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#111111] p-3 shadow-lg">
      <button
        type="button"
        className="absolute right-2 top-2 text-xs text-[#707070] hover:text-[#E8E8E8]"
        onClick={() => {
          setVisible(false);
          setHiddenByUser(true);
        }}
        aria-label="Close social proof popup"
      >
        ✕
      </button>
      <div className="flex gap-3">
        <div className="h-14 w-14 shrink-0 overflow-hidden rounded border border-[rgba(255,255,255,0.08)] bg-[#1A1A1A]">
          {entry.product.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={entry.product.image} alt="" className="h-full w-full object-cover" />
          ) : null}
        </div>
        <div className="min-w-0 text-xs">
          <p className="text-[#B0B0B0]">Someone Purchased</p>
          <Link href={`/${entry.product.slug}`} className="line-clamp-1 font-semibold text-[#E8E8E8] hover:text-[var(--primary)]">
            {entry.product.name}
          </Link>
          <p className="text-[#707070]">({entry.city})</p>
          <p className="text-[#707070]">{entry.minsAgo} min ago</p>
        </div>
      </div>
    </div>
  );
}
