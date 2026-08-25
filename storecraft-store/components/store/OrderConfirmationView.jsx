"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatPrice } from "@/lib/currency";

export function OrderConfirmationView() {
  const [data, setData] = useState(null);

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const raw = sessionStorage.getItem("sialkot_last_order");
        if (raw) {
          setData(JSON.parse(raw));
          sessionStorage.removeItem("sialkot_last_order");
        }
      } catch {
        setData(null);
      }
    });
  }, []);

  if (!data) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center text-[#E8E8E8]">
        <h1 className="text-2xl font-bold text-[#E8E8E8]">No order to show</h1>
        <p className="mt-2 text-sm text-[#B0B0B0]">If you just completed checkout, open this page from the checkout flow again.</p>
        <Link href="/shop" className="mt-6 inline-block font-semibold text-[#D4AF37] hover:underline">
          Continue shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center text-[#E8E8E8]">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[rgba(212,175,55,0.1)] text-3xl text-[#D4AF37]">
        ✓
      </div>
      <h1 className="text-3xl font-bold text-[#E8E8E8]">Thank you!</h1>
      <p className="mt-2 text-[#B0B0B0]">Your order has been placed.</p>
      <p className="mt-6 tabular-nums text-lg font-semibold text-[#E8E8E8]">{data.orderNumber}</p>
      <p className="price mt-1 text-2xl font-bold text-[#D4AF37]">{formatPrice(data.total)}</p>
      <p className="mt-2 text-sm text-[#B0B0B0]">
        {data.paymentMethod === "paypal" ? "🅿️ PayPal" : "💳 Card Payment (Stripe)"}
      </p>
      {data.paymentStatus === "unpaid" && data.paymentMethod === "paypal" ? (
        <p className="mt-2 text-sm text-[#22D3EE]">Your order is confirmed. Complete payment via PayPal to process your order.</p>
      ) : null}
      {data.paymentStatus === "unpaid" && data.paymentMethod !== "paypal" ? (
        <p className="mt-2 text-sm text-[#22D3EE]">Your order is confirmed. Payment will be processed via Stripe.</p>
      ) : null}
      {data.items?.length ? (
        <ul className="mt-8 space-y-2 rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#111111] p-4 text-left text-sm text-[#B0B0B0]">
          {data.items.map((it, idx) => (
            <li key={idx} className="flex justify-between gap-2">
              <span>
                {it.name} ×{it.quantity}
                {it.variationLabel ? <span className="block text-xs text-[#707070]">{it.variationLabel}</span> : null}
                {it.customMeasurements && Object.keys(it.customMeasurements).length ? (
                  <span className="mt-1 block text-xs text-[#22D3EE]">
                    📏 {Object.entries(it.customMeasurements)
                      .map(([k, v]) => `${k}: ${v}`)
                      .join(" • ")}
                  </span>
                ) : null}
              </span>
              <span className="price tabular-nums">{formatPrice(it.price * it.quantity)}</span>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <Link href="/shop" className="rounded-xl border border-[rgba(212,175,55,0.4)] bg-transparent px-5 py-2.5 text-sm font-semibold text-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#0A0A0A]">
          Keep shopping
        </Link>
        <Link href="/account/orders" className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#111111] px-5 py-2.5 text-sm font-semibold text-[#E8E8E8] hover:bg-[#1A1A1A]">
          View orders (signed in)
        </Link>
      </div>
    </div>
  );
}
