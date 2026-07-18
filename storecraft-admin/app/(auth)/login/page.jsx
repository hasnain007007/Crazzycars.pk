/**
 * Login page for admin users using email/password authentication.
 */
"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function safeReturnPath(from) {
  if (!from || typeof from !== "string") return "/dashboard";
  if (!from.startsWith("/") || from.startsWith("//")) return "/dashboard";
  if (from.startsWith("/login")) return "/dashboard";
  return from;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = safeReturnPath(searchParams.get("from"));
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const onFieldChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          rememberMe,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        setError(data.error || "Invalid credentials.");
        return;
      }

      if (rememberMe) {
        localStorage.setItem("admin_remember", "true");
      } else {
        localStorage.removeItem("admin_remember");
      }

      router.push(returnTo);
      router.refresh();
    } catch (_error) {
      setError("Unable to login. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">
          {process.env.NEXT_PUBLIC_STORE_NAME || "Crazzycars.pk"} Admin
        </h1>
        <p className="mt-2 text-sm text-slate-500">Sign in to continue.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              value={formData.email}
              onChange={onFieldChange}
              required
              className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none ring-primary/30 placeholder:text-slate-400 focus:ring-2"
              placeholder="admin@crazzycars.pk"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="password">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={onFieldChange}
                required
                className="w-full rounded-lg border border-border px-3 py-2 pr-16 text-sm outline-none ring-primary/30 placeholder:text-slate-400 focus:ring-2"
                placeholder="Enter your password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute inset-y-0 right-0 px-3 text-xs font-medium text-slate-600 hover:text-slate-900"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              margin: "12px 0 20px",
            }}
          >
            <input
              type="checkbox"
              id="rememberMe"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              style={{
                width: 16,
                height: 16,
                cursor: "pointer",
                accentColor: "#009688",
              }}
            />
            <label
              htmlFor="rememberMe"
              style={{
                fontSize: 13,
                color: "#6B7280",
                cursor: "pointer",
                userSelect: "none",
              }}
            >
              Remember this device for 30 days
            </label>
          </div>

          {error ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-surface px-4">
          <div className="h-48 w-full max-w-md animate-pulse rounded-xl bg-slate-200" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
