"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const CustomerContext = createContext(null);

/** Stable fallback when `useCustomer` runs outside `CustomerProvider` (avoids crashes / "not a function"). */
const OUTSIDE_PROVIDER_CUSTOMER = Object.freeze({
  customer: null,
  loading: false,
  login: async () => ({ success: false, error: "Auth unavailable" }),
  register: async () => ({ success: false, error: "Auth unavailable" }),
  logout: async () => {},
  setCustomer: () => {},
  refresh: async () => {},
});

export function CustomerProvider({ children }) {
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/customer/me", {
        credentials: "include",
        cache: "no-store",
      });

      if (res.status === 401) {
        setCustomer(null);
        return;
      }

      const data = await res.json();
      if (data.success && data.customer) {
        setCustomer(data.customer);
      } else {
        setCustomer(null);
      }
    } catch {
      setCustomer(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const hasSession =
          typeof document !== "undefined" &&
          /(?:^|;\s*)(customer_token|store_token)=/.test(document.cookie || "");
        if (!hasSession) {
          setCustomer(null);
          setLoading(false);
          return;
        }

        const res = await fetch("/api/customer/me", {
          credentials: "include",
          cache: "no-store",
        });

        if (res.status === 401) {
          setCustomer(null);
          setLoading(false);
          return;
        }

        const data = await res.json();
        if (data.success && data.customer) {
          setCustomer(data.customer);
        } else {
          setCustomer(null);
        }
      } catch {
        setCustomer(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = useCallback(async (email, password) => {
    try {
      console.log("[CustomerAuth] login called");
      const res = await fetch("/api/customer/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      console.log("[CustomerAuth] login response status:", res.status);
      const data = await res.json();
      console.log("[CustomerAuth] login response data:", data);
      if (data.success) {
        if (data.customer) setCustomer(data.customer);
        return { success: true, customer: data.customer };
      }
      return { success: false, error: data.error || "Login failed" };
    } catch (e) {
      console.error("[CustomerAuth] login fetch error:", e);
      return { success: false, error: e?.message || "Login failed" };
    }
  }, []);

  const register = useCallback(async (formData) => {
    try {
      console.log("[CustomerAuth] register called with:", {
        firstName: formData?.firstName,
        lastName: formData?.lastName,
        email: formData?.email,
        hasPassword: !!formData?.password,
      });
      const res = await fetch("/api/customer/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formData),
      });
      console.log("[CustomerAuth] register response status:", res.status);
      const data = await res.json();
      console.log("[CustomerAuth] register response data:", data);
      if (data.success) {
        if (data.customer) setCustomer(data.customer);
        return { success: true, customer: data.customer };
      }
      return { success: false, error: data.error || "Registration failed" };
    } catch (e) {
      console.error("[CustomerAuth] register fetch error:", e);
      return { success: false, error: e?.message || "Registration failed" };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/customer/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (e) {
      console.error("Logout error:", e);
    }

    setCustomer(null);

    try {
      localStorage.removeItem("store_settings");
      localStorage.removeItem("customer_cache");
    } catch {
      // ignore
    }

    window.location.href = "/account/login";
  }, []);

  const value = useMemo(
    () => ({
      customer,
      loading,
      login,
      register,
      logout,
      setCustomer,
      refresh,
    }),
    [customer, loading, login, register, logout, refresh]
  );

  return <CustomerContext.Provider value={value}>{children}</CustomerContext.Provider>;
}

export function useCustomer() {
  const ctx = useContext(CustomerContext);
  if (!ctx) {
    return OUTSIDE_PROVIDER_CUSTOMER;
  }
  return ctx;
}
