"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useCustomer } from "@/lib/customerAuth";

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id ? String(params.id) : "";
  const { customer, loading: authLoading } = useCustomer();
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!authLoading && !customer) {
      router.push("/account/login");
      return;
    }
    if (!id || !customer) return;
    fetch(`/api/customer/orders/${encodeURIComponent(id)}`, { credentials: "include" })
      .then((r) => r.json())
      .then((j) => {
        if (j.success) setData(j.order);
        else setErr(j.error || "Could not load order");
      })
      .catch(() => setErr("Could not load order"));
  }, [id, customer, authLoading, router]);

  if (!authLoading && !customer) {
    return null;
  }

  if (authLoading || (customer && !data && !err)) {
    return (
      <main
        style={{
          minHeight: "60vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            border: "3px solid #E5E5E5",
            borderTop: "3px solid #111111",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
      </main>
    );
  }

  if (err || !data) {
    return (
      <main style={{ maxWidth: 600, margin: "0 auto", padding: "40px 24px" }}>
        <Link href="/account/orders" style={{ fontSize: 13, color: "#888888" }}>
          ← Back to orders
        </Link>
        <p style={{ marginTop: 24, color: "#991b1b" }}>{err || "Order not found"}</p>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "40px 24px", minHeight: "60vh" }}>
      <Link href="/account/orders" style={{ fontSize: 13, color: "#888888", textDecoration: "none" }}>
        ← Back to orders
      </Link>
      <h1
        style={{
          fontFamily: "var(--font-heading)",
          fontSize: 24,
          fontWeight: 700,
          marginTop: 16,
          color: "#111111",
        }}
      >
        Order #{data.orderNumber}
      </h1>
      <p style={{ fontSize: 13, color: "#888888", marginTop: 4 }}>
        {data.createdAt ? new Date(data.createdAt).toLocaleString("en-GB") : ""} · {data.status} · Payment:{" "}
        {data.paymentStatus}
      </p>

      <div
        style={{
          marginTop: 24,
          padding: 20,
          border: "1px solid #E5E5E5",
          borderRadius: 12,
          background: "#FFFFFF",
        }}
      >
        <p style={{ fontSize: 12, fontWeight: 700, color: "#888888", margin: "0 0 8px" }}>ITEMS</p>
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {(data.items || []).map((item, idx) => (
            <li
              key={idx}
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                padding: "10px 0",
                borderBottom: "1px solid #F0F0F0",
                fontSize: 14,
              }}
            >
              <span>
                {item.name} × {item.quantity}
              </span>
              <span style={{ fontFamily: "var(--font-price)", fontWeight: 600 }}>
                Rs. {Number(item.total || 0).toFixed(2)}
              </span>
            </li>
          ))}
        </ul>
        <p style={{ textAlign: "right", marginTop: 16, fontSize: 18, fontWeight: 700, fontFamily: "var(--font-price)" }}>
          Total Rs. {Number(data.total || 0).toFixed(2)}
        </p>
      </div>

      {data.shippingAddress && Object.keys(data.shippingAddress).length > 0 ? (
        <div
          style={{
            marginTop: 20,
            padding: 20,
            border: "1px solid #E5E5E5",
            borderRadius: 12,
            background: "#FAFAFA",
            fontSize: 14,
            color: "#374151",
          }}
        >
          <p style={{ fontSize: 12, fontWeight: 700, color: "#888888", margin: "0 0 8px" }}>SHIPPING</p>
          <p style={{ margin: 0 }}>{data.shippingAddress.name}</p>
          <p style={{ margin: 0 }}>{data.shippingAddress.street}</p>
          <p style={{ margin: 0 }}>
            {data.shippingAddress.city} {data.shippingAddress.zip}
          </p>
          <p style={{ margin: 0 }}>{data.shippingAddress.country}</p>
        </div>
      ) : null}

      {data.tracking?.number ? (
        <p style={{ marginTop: 16, fontSize: 14 }}>
          Tracking: <strong>{data.tracking.carrier}</strong> {data.tracking.number}
        </p>
      ) : null}
    </main>
  );
}
