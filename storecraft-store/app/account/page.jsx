"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useCustomer } from "@/lib/customerAuth";

export default function AccountPage() {
  const router = useRouter();
  const { customer, loading, logout } = useCustomer();

  useEffect(() => {
    if (!loading && !customer) {
      router.push("/account/login");
    }
  }, [customer, loading, router]);

  if (loading) {
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

  if (!customer) return null;

  const menuItems = [
    {
      href: "/account/orders",
      icon: "📦",
      title: "My Orders",
      desc: "View and track your orders",
    },
    {
      href: "/account/addresses",
      icon: "📍",
      title: "My Addresses",
      desc: "Manage delivery addresses",
    },
    {
      href: "/account/profile",
      icon: "👤",
      title: "My Profile",
      desc: "Update your personal information",
    },
    {
      href: "/wishlist",
      icon: "♡",
      title: "My Wishlist",
      desc: "Products you have saved",
    },
    {
      href: "/compare",
      icon: "⇄",
      title: "Compare Products",
      desc: "Products you are comparing",
    },
  ];

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
          background: "#111111",
          borderRadius: 12,
          padding: "32px 40px",
          marginBottom: 32,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div>
          <p
            style={{
              fontSize: 12,
              color: "#D72323",
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              margin: "0 0 4px",
            }}
          >
            Welcome Back
          </p>
          <h1
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: 28,
              fontWeight: 700,
              color: "#FFFFFF",
              margin: "0 0 4px",
            }}
          >
            {customer.firstName} {customer.lastName}
          </h1>
          <p
            style={{
              fontSize: 13,
              color: "rgba(255,255,255,0.6)",
              margin: 0,
            }}
          >
            {customer.email}
          </p>
        </div>
        <button
          type="button"
          onClick={logout}
          style={{
            padding: "10px 20px",
            background: "rgba(255,255,255,0.1)",
            color: "#FFFFFF",
            border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Sign Out
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: 16,
        }}
      >
        {menuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            style={{
              textDecoration: "none",
              display: "block",
              padding: 24,
              background: "#FFFFFF",
              border: "1px solid #E5E5E5",
              borderRadius: 12,
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "#D72323";
              e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "#E5E5E5";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <span
              style={{
                fontSize: 32,
                display: "block",
                marginBottom: 12,
              }}
            >
              {item.icon}
            </span>
            <p
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: "#111111",
                margin: "0 0 4px",
                fontFamily: "var(--font-heading)",
              }}
            >
              {item.title}
            </p>
            <p
              style={{
                fontSize: 12,
                color: "#888888",
                margin: 0,
              }}
            >
              {item.desc}
            </p>
          </Link>
        ))}
      </div>
    </main>
  );
}
