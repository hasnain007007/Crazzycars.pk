"use client";

import { useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/customer/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setSent(true);
      } else {
        toast.error(data.error || "Something went wrong");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
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
            textAlign: "center",
          }}
        >
          <p style={{ fontSize: 48, marginBottom: 16 }}>📧</p>
          <h2
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: 22,
              fontWeight: 700,
              color: "#111111",
              margin: "0 0 12px",
            }}
          >
            Check Your Email
          </h2>
          <p
            style={{
              fontSize: 14,
              color: "#888888",
              lineHeight: 1.6,
              margin: "0 0 24px",
            }}
          >
            We sent a password reset link to{" "}
            <strong style={{ color: "#111111" }}>{email}</strong>. Check your inbox and click the
            link.
          </p>
          <Link
            href="/account/login"
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
              borderRadius: 6,
            }}
          >
            Back to Login
          </Link>
        </div>
      </main>
    );
  }

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
            Forgot Password?
          </h1>
          <p
            style={{
              fontSize: 14,
              color: "#888888",
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            Enter your email and we will send you a reset link
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 20 }}>
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
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="info@crazzycars.pk"
              style={{
                width: "100%",
                padding: "12px 16px",
                border: "1px solid #E5E5E5",
                borderRadius: 6,
                fontSize: 14,
                color: "#111111",
                outline: "none",
                boxSizing: "border-box",
                fontFamily: "inherit",
              }}
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
            {loading ? "Sending..." : "Send Reset Link"}
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
          Remember your password?{" "}
          <Link
            href="/account/login"
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
