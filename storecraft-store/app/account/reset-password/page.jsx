"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [form, setForm] = useState({
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [valid, setValid] = useState(true);

  useEffect(() => {
    if (!token) {
      setValid(false);
    }
  }, [token]);

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

    setLoading(true);
    try {
      const res = await fetch("/api/customer/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          password: form.password,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Password reset successfully!");
        router.push("/account/login");
      } else {
        toast.error(data.error || "Reset failed");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (!valid) {
    return (
      <div style={{ textAlign: "center", padding: 40 }}>
        <p style={{ fontSize: 48, marginBottom: 16 }}>❌</p>
        <h2
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: 22,
            fontWeight: 700,
            color: "#111111",
            marginBottom: 12,
          }}
        >
          Invalid Reset Link
        </h2>
        <p
          style={{
            fontSize: 14,
            color: "#888888",
            marginBottom: 24,
          }}
        >
          This link is invalid or has expired.
        </p>
        <Link
          href="/account/forgot-password"
          style={{
            display: "inline-block",
            padding: "12px 32px",
            background: "#111111",
            color: "#FFFFFF",
            textDecoration: "none",
            fontSize: 13,
            fontWeight: 700,
            borderRadius: 6,
          }}
        >
          Request New Link
        </Link>
      </div>
    );
  }

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
    <div>
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
          Reset Password
        </h1>
        <p
          style={{
            fontSize: 14,
            color: "#888888",
            margin: 0,
          }}
        >
          Enter your new password below
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
            New Password
          </label>
          <input
            type="password"
            required
            style={inputStyle}
            placeholder="Min 6 characters"
            value={form.password}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                password: e.target.value,
              }))
            }
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
            Confirm New Password
          </label>
          <input
            type="password"
            required
            style={inputStyle}
            placeholder="Repeat password"
            value={form.confirmPassword}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                confirmPassword: e.target.value,
              }))
            }
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
          {loading ? "Resetting..." : "Reset Password"}
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
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
        <Suspense fallback={<p>Loading...</p>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </main>
  );
}
