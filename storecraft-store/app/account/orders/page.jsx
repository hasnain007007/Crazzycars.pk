"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useCustomer } from "@/lib/customerAuth";

const STATUS_COLORS = {
  placed: { bg: "#dbeafe", color: "#1e40af" },
  pending: { bg: "#fef3c7", color: "#92400e" },
  confirmed: { bg: "#e0e7ff", color: "#3730a3" },
  processing: { bg: "#e0f2fe", color: "#075985" },
  packed: { bg: "#f0fdf4", color: "#166534" },
  shipped: { bg: "#ede9fe", color: "#5b21b6" },
  delivered: { bg: "#d1fae5", color: "#065f46" },
  cancelled: { bg: "#fee2e2", color: "#991b1b" },
  refunded: { bg: "#fce7f3", color: "#9d174d" },
  disputed: { bg: "#f3f4f6", color: "#374151" },
};

export default function OrdersPage() {
  const router = useRouter();
  const { customer, loading } = useCustomer();
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);

  useEffect(() => {
    if (!loading && !customer) {
      router.push("/account/login");
      return;
    }
    if (customer) {
      fetch("/api/customer/orders", { credentials: "include" })
        .then((r) => r.json())
        .then((data) => {
          if (data.success) setOrders(data.orders);
        })
        .catch(() => {})
        .finally(() => setOrdersLoading(false));
    }
  }, [customer, loading, router]);

  if (loading || ordersLoading) {
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

  return (
    <main
      style={{
        maxWidth: 900,
        margin: "0 auto",
        padding: "40px 24px",
        minHeight: "60vh",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 32,
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: 26,
              fontWeight: 700,
              color: "#111111",
              margin: "0 0 4px",
            }}
          >
            My Orders
          </h1>
          <p
            style={{
              fontSize: 13,
              color: "#888888",
              margin: 0,
            }}
          >
            {orders.length} order{orders.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/account"
          style={{
            fontSize: 13,
            color: "#888888",
            textDecoration: "none",
          }}
        >
          ← Back to Account
        </Link>
      </div>

      {orders.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "60px 20px",
          }}
        >
          <p style={{ fontSize: 48, marginBottom: 16 }}>📦</p>
          <p
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: "#111111",
              marginBottom: 8,
            }}
          >
            No orders yet
          </p>
          <p
            style={{
              fontSize: 14,
              color: "#888888",
              marginBottom: 32,
            }}
          >
            Start shopping to see your orders here
          </p>
          <Link
            href="/shop"
            style={{
              display: "inline-block",
              padding: "12px 32px",
              background: "#111111",
              color: "#FFFFFF",
              textDecoration: "none",
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              borderRadius: 4,
            }}
          >
            Shop Now
          </Link>
        </div>
      )}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        {orders.map((order) => {
          const key = String(order.status || "").toLowerCase();
          const statusStyle = STATUS_COLORS[key] || STATUS_COLORS.pending;

          return (
            <div
              key={order.id}
              style={{
                background: "#FFFFFF",
                border: "1px solid #E5E5E5",
                borderRadius: 12,
                padding: 24,
                transition: "all 0.2s",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: 16,
                  flexWrap: "wrap",
                  gap: 8,
                }}
              >
                <div>
                  <p
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: "#111111",
                      margin: "0 0 4px",
                    }}
                  >
                    Order #{order.orderNumber}
                  </p>
                  <p
                    style={{
                      fontSize: 12,
                      color: "#888888",
                      margin: 0,
                    }}
                  >
                    {order.createdAt
                      ? new Date(order.createdAt).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })
                      : ""}
                  </p>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: "4px 12px",
                        borderRadius: 99,
                        background: statusStyle.bg,
                        color: statusStyle.color,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                      }}
                    >
                      {order.status}
                    </span>
                    {order.trackingNumber ? (
                      <span style={{ fontSize: 11, color: "#6B7280" }}>
                        {order.courier || "Postex"} · {order.trackingNumber}
                      </span>
                    ) : null}
                  </div>
                  <span
                    style={{
                      fontSize: 16,
                      fontWeight: 700,
                      color: "#111111",
                      fontFamily: "var(--font-price)",
                    }}
                  >
                    Rs. {Number(order.total || 0).toFixed(2)}
                  </span>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 8,
                  marginBottom: 16,
                  flexWrap: "wrap",
                }}
              >
                {(order.items || []).slice(0, 3).map((item, i) => (
                  <div
                    key={i}
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 6,
                      background: "#F8F8F8",
                      overflow: "hidden",
                      border: "1px solid #E5E5E5",
                      flexShrink: 0,
                    }}
                  >
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name || ""}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    ) : null}
                  </div>
                ))}
                {order.itemCount > 3 ? (
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 6,
                      background: "#F8F8F8",
                      border: "1px solid #E5E5E5",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#888888",
                    }}
                  >
                    +{order.itemCount - 3}
                  </div>
                ) : null}
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingTop: 16,
                  borderTop: "1px solid #F0F0F0",
                }}
              >
                <p
                  style={{
                    fontSize: 12,
                    color: "#888888",
                    margin: 0,
                  }}
                >
                  {order.itemCount} item{order.itemCount !== 1 ? "s" : ""}
                </p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {order.trackingNumber ? (
                    <Link
                      href={`/track-order?tracking=${encodeURIComponent(order.trackingNumber)}`}
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: "#C41E1E",
                        textDecoration: "none",
                        padding: "8px 16px",
                        border: "1px solid #C41E1E",
                        borderRadius: 4,
                        letterSpacing: "0.04em",
                      }}
                    >
                      Track Order
                    </Link>
                  ) : null}
                  <Link
                    href={`/account/orders/${order.id}`}
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#111111",
                      textDecoration: "none",
                      padding: "8px 16px",
                      border: "1px solid #111111",
                      borderRadius: 4,
                      letterSpacing: "0.04em",
                    }}
                  >
                    View Details →
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
