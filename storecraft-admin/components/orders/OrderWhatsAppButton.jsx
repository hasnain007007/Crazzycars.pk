"use client";

import { useEffect, useState } from "react";
import { STORE_NAME } from "@/lib/constants";
import {
  getAdminNewOrderWhatsAppMessage,
  getCustomerOrderWhatsAppMessage,
} from "@/lib/whatsappTemplates";

/** Pakistan WhatsApp deep link: https://wa.me/923XXXXXXXXX?text=... */
export function buildWaLink(phone, message) {
  if (!phone) return null;
  let cleaned = String(phone).replace(/\D/g, "");
  if (!cleaned) return null;
  if (cleaned.startsWith("0") && cleaned.length === 11) {
    cleaned = `92${cleaned.slice(1)}`;
  }
  if (cleaned.startsWith("3") && cleaned.length === 10) {
    cleaned = `92${cleaned}`;
  }
  const encoded = encodeURIComponent(message || "");
  return `https://wa.me/${cleaned}?text=${encoded}`;
}

export function openWhatsApp(phone, message) {
  const url = buildWaLink(phone, message);
  if (!url) return false;
  window.open(url, "_blank", "noopener,noreferrer");
  return true;
}

/** Admin/store WhatsApp from Settings → WhatsApp (never hardcode). */
export function getAdminWhatsAppNumber(settings) {
  return String(settings?.whatsapp?.number ?? "").trim();
}

/** Customer order phone — shipping address first. */
export function getCustomerOrderPhone(order) {
  return String(order?.shippingAddress?.phone ?? order?.customer?.phone ?? "").trim();
}

function getLegacyWhatsAppMessage(order) {
  const orderNum = order.orderNumber || order.id || order._id || "";
  const customerName =
    [order.customer?.firstName, order.customer?.lastName].filter(Boolean).join(" ").trim() ||
    order.customer?.name ||
    "Customer";
  const total = Number(order.total ?? order.pricing?.total ?? 0).toFixed(2);
  const currency = order.currency || "PKR";
  const paymentMethod = String(order.paymentMethod || order.payment?.method || "");
  const paymentStatus = String(order.paymentStatus || "");
  const pm = paymentMethod.toLowerCase();
  const isPayPal = pm.includes("paypal");
  const isCard = pm.includes("stripe") || pm.includes("card");
  const isCOD = pm.includes("cod") || pm.includes("cash");
  let paymentLine = "";
  if (isPayPal) {
    const paypalId = order.payment?.paypalOrderId || order.payment?.paypalCaptureId || "";
    paymentLine =
      paymentStatus === "paid"
        ? `✅ Payment received via PayPal${paypalId ? ` (ID: ${paypalId})` : ""}`
        : `⏳ PayPal payment pending`;
  } else if (isCard) {
    const stripeId = order.payment?.stripePaymentIntentId || "";
    paymentLine =
      paymentStatus === "paid"
        ? `✅ Payment received via Credit/Debit Card${stripeId ? ` (ID: ${stripeId})` : ""}`
        : `⏳ Card payment pending`;
  } else if (isCOD) {
    paymentLine = `💵 Cash on Delivery - payment due on arrival`;
  } else {
    paymentLine = `Payment Method: ${paymentMethod || "Not specified"}`;
  }
  return `Hello ${customerName}! 👋

Thank you for your order at ${STORE_NAME}! 🛍️

📦 *Order #${orderNum}*
💰 Total: ${currency} ${total}
${paymentLine}

Your order is being processed and will be shipped soon.

If you have any questions, feel free to ask!

Thank you for shopping at Crazzycars.pk! 🙏
${STORE_NAME}`;
}

export function OrderWhatsAppButton({ order, onNotified, settings: settingsProp }) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(order?.whatsappNotified || false);
  const [settingsLocal, setSettingsLocal] = useState(null);
  const settings = settingsProp ?? settingsLocal;

  useEffect(() => {
    if (settingsProp) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/settings", { credentials: "include" });
        const data = await res.json();
        if (!cancelled && data.success) {
          setSettingsLocal(data.settings || data.data || {});
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [settingsProp]);

  const rawPhone = getCustomerOrderPhone(order);
  const plainMessage = order
    ? getCustomerOrderWhatsAppMessage(order, settings || {}) ||
      getLegacyWhatsAppMessage(order)
    : "";
  const waUrl = buildWaLink(rawPhone, plainMessage);
  const orderApiId = order?.id || order?._id;

  function openCustomerWhatsApp() {
    if (!waUrl) return;
    openWhatsApp(rawPhone, plainMessage);
    void recordNotified();
  }

  async function recordNotified() {
    if (!orderApiId) return;
    setLoading(true);
    try {
      await fetch(`/api/orders/${orderApiId}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ whatsappNotified: true }),
      });
      setDone(true);
      onNotified?.();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  if (!waUrl) {
    return (
      <button
        type="button"
        disabled
        title="No phone number available"
        style={{
          padding: "8px 16px",
          background: "#9ca3af",
          color: "#fff",
          border: "none",
          borderRadius: 6,
          fontSize: 13,
          fontWeight: 600,
          cursor: "not-allowed",
        }}
      >
        WhatsApp (No Phone)
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={openCustomerWhatsApp}
        disabled={loading}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          padding: "8px 16px",
          background: done ? "#bbf7d0" : "#25D366",
          color: done ? "#166534" : "#fff",
          border: done ? "1px solid #86efac" : "none",
          borderRadius: 6,
          fontSize: 13,
          fontWeight: 600,
          cursor: loading ? "wait" : "pointer",
          opacity: loading ? 0.7 : 1,
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
        {loading ? "Sending…" : done ? "✓ Opened WhatsApp" : "WhatsApp Customer"}
      </button>
      {done ? (
        <p className="text-xs text-[#6b7280]">WhatsApp opened. Customer confirms by replying if needed.</p>
      ) : null}
    </div>
  );
}

/** Opens WhatsApp to store admin number (settings.whatsapp.number) with new-order alert template */
export function OrderAdminWhatsAppButton({ order, settings: settingsProp }) {
  const [settingsLocal, setSettingsLocal] = useState(null);
  const settings = settingsProp ?? settingsLocal;

  useEffect(() => {
    if (settingsProp) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/settings", { credentials: "include" });
        const data = await res.json();
        if (!cancelled && data.success) {
          setSettingsLocal(data.settings || data.data || {});
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [settingsProp]);

  const adminPhoneRaw = getAdminWhatsAppNumber(settings);
  const msg = order ? getAdminNewOrderWhatsAppMessage(order, settings || {}) : "";
  const adminWaUrl = buildWaLink(adminPhoneRaw, msg);

  if (!adminWaUrl) {
    return (
      <button
        type="button"
        disabled
        title="Set WhatsApp number in Settings → WhatsApp"
        style={{
          padding: "8px 16px",
          background: "#9ca3af",
          color: "#fff",
          border: "none",
          borderRadius: 6,
          fontSize: 13,
          fontWeight: 600,
          cursor: "not-allowed",
        }}
      >
        WhatsApp Admin (No Number)
      </button>
    );
  }

  if (!msg) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() => openWhatsApp(adminPhoneRaw, msg)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        padding: "8px 16px",
        background: "#111827",
        color: "#fff",
        border: "none",
        borderRadius: 6,
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer",
      }}
    >
      WhatsApp Admin Alert
    </button>
  );
}
