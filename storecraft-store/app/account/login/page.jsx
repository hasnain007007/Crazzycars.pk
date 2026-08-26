"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useCustomer } from "@/lib/customerAuth";
import { safeRedirectPath } from "@/lib/safeRedirectPath";

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = useMemo(
    () => safeRedirectPath(searchParams.get("redirect")),
    [searchParams]
  );
  const registerHref = useMemo(() => {
    const qs = redirect !== "/account" ? `?redirect=${encodeURIComponent(redirect)}` : "";
    return `/account/register${qs}`;
  }, [redirect]);

  const { login } = useCustomer();
  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    console.log("1. Starting login...");
    console.log("2. login type:", typeof login);
    console.log("3. email:", form.email);

    try {
      if (typeof login !== "function") {
        console.error("login is not a function:", login);
        toast.error("Auth error - please refresh page");
        setLoading(false);
        return;
      }

      const result = await login(form.email, form.password);

      console.log("4. Login result:", result);

      if (result?.success) {
        toast.success("Welcome back!");
        router.push(redirect || "/account");
      } else {
        toast.error(result?.error || "Login failed");
      }
    } catch (e) {
      console.error("5. Login error:", e);
      toast.error(e?.message || "Something went wrong");
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
          maxWidth: 420,
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
            Welcome Back
          </h1>
          <p
            style={{
              fontSize: 14,
              color: "#888888",
              margin: 0,
            }}
          >
            Sign in to your account
          </p>
        </div>

        <form onSubmit={handleSubmit}>
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
              Password
            </label>
            <input
              type="password"
              required
              style={inputStyle}
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            />
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginTop: 4,
              marginBottom: 24,
            }}
          >
            <Link
              href="/account/forgot-password"
              style={{
                fontSize: 12,
                color: "#D72323",
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              Forgot Password?
            </Link>
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
            {loading ? "Signing In..." : "Sign In"}
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
          Don&apos;t have an account?{" "}
          <Link
            href={registerHref}
            style={{
              color: "#D72323",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Create Account
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
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
      <LoginPageContent />
    </Suspense>
  );
}
