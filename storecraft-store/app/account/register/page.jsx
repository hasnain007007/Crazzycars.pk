"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useCustomer } from "@/lib/customerAuth";
import { safeRedirectPath } from "@/lib/safeRedirectPath";

function RegisterPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = useMemo(
    () => safeRedirectPath(searchParams.get("redirect")),
    [searchParams]
  );
  const loginHref = useMemo(() => {
    const qs = redirect !== "/account" ? `?redirect=${encodeURIComponent(redirect)}` : "";
    return `/account/login${qs}`;
  }, [redirect]);

  const { setCustomer } = useCustomer();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (form.password !== form.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (form.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    if (!form.phone.trim()) {
      toast.error("Phone number is required");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/customer/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          password: form.password,
        }),
      });

      const data = await res.json();

      if (data.success) {
        if (typeof setCustomer === "function") {
          setCustomer(data.customer);
        }
        toast.success("Account created successfully!");
        router.push(redirect || "/account");
      } else {
        toast.error(data.error || "Registration failed");
      }
    } catch (e) {
      console.error("Register error:", e);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "12px 16px",
    border: "1px solid #E5E5E5",
    borderRadius: 6,
    fontSize: 14,
    color: "#111111",
    outline: "none",
    boxSizing: "border-box",
    fontFamily: "inherit",
  };

  return (
    <main
      style={{
        minHeight: "80vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 24px",
        background: "#F8F8F8",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 480,
          background: "#FFFFFF",
          borderRadius: 12,
          padding: 40,
          boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
        }}
      >
        <div
          style={{
            textAlign: "center",
            marginBottom: 32,
          }}
        >
          <h1
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: 26,
              fontWeight: 700,
              color: "#111111",
              margin: "0 0 8px",
            }}
          >
            Create Account
          </h1>
          <p
            style={{
              fontSize: 14,
              color: "#888888",
              margin: 0,
            }}
          >
            Join {process.env.NEXT_PUBLIC_STORE_NAME || "Crazzycars.pk"} today
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#374151",
                  marginBottom: 6,
                }}
              >
                First Name
              </label>
              <input
                type="text"
                required
                style={inputStyle}
                placeholder="Ali"
                value={form.firstName}
                onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
              />
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#374151",
                  marginBottom: 6,
                }}
              >
                Last Name
              </label>
              <input
                type="text"
                required
                style={inputStyle}
                placeholder="Khan"
                value={form.lastName}
                onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
              />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 600,
                color: "#374151",
                marginBottom: 6,
              }}
            >
              Email Address
            </label>
            <input
              type="email"
              required
              style={inputStyle}
              placeholder="info@crazzycars.pk"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 600,
                color: "#374151",
                marginBottom: 6,
              }}
            >
              Mobile Number
            </label>
            <input
              type="tel"
              required
              inputMode="numeric"
              autoComplete="tel"
              style={inputStyle}
              placeholder="03XX XXXXXXX"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 600,
                color: "#374151",
                marginBottom: 6,
              }}
            >
              Password
            </label>
            <input
              type="password"
              required
              style={inputStyle}
              placeholder="Min 6 characters"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 600,
                color: "#374151",
                marginBottom: 6,
              }}
            >
              Confirm Password
            </label>
            <input
              type="password"
              required
              style={inputStyle}
              placeholder="Repeat password"
              value={form.confirmPassword}
              onChange={(e) => setForm((f) => ({ ...f, confirmPassword: e.target.value }))}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "14px",
              background: loading ? "#888888" : "#111111",
              color: "#FFFFFF",
              border: "none",
              borderRadius: 6,
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: "0.06em",
              cursor: loading ? "not-allowed" : "pointer",
              textTransform: "uppercase",
            }}
          >
            {loading ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        <p
          style={{
            textAlign: "center",
            fontSize: 13,
            color: "#888888",
            marginTop: 24,
          }}
        >
          Already have an account?{" "}
          <Link
            href={loginHref}
            style={{
              color: "#D72323",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Sign In
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <main
          style={{
            minHeight: "80vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#F8F8F8",
          }}
        >
          <p style={{ color: "#888888", fontSize: 14 }}>Loading…</p>
        </main>
      }
    >
      <RegisterPageContent />
    </Suspense>
  );
}
