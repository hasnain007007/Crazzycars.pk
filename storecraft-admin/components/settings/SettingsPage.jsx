"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import AnnouncementBarSettings from "@/components/settings/AnnouncementBarSettings";
import CheckoutSettings from "@/components/settings/CheckoutSettings";
import BrandStorySettings from "@/components/settings/BrandStorySettings";
import AboutPageSettings from "@/components/settings/AboutPageSettings";
import { BrandingSettings } from "@/components/settings/BrandingSettings";
import ContactPageSettings from "@/components/settings/ContactPageSettings";
import { FooterSettings } from "@/components/settings/FooterSettings";
import MegaMenuSettings from "@/components/settings/MegaMenuSettings";
import ProductBadgeSettings from "@/components/settings/ProductBadgeSettings";
import SeoSettings from "@/components/settings/SeoSettings";
import HomepageSettings from "@/components/settings/HomepageSettings";
import WhatsAppSettings from "@/components/settings/WhatsAppSettings";
import WhatsAppTemplateSettings from "@/components/settings/WhatsAppTemplateSettings";
import PakistaniPaymentSettings from "@/components/settings/PakistaniPaymentSettings";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import { defaultOrderNumberConfig, formatOrderNumber, previewNextSequence } from "@/lib/orderNumberFormat";
import { clearStorefrontBrowserCache } from "@/lib/clearStorefrontBrowserCache";
import { clearAdminSettingsCache } from "@/lib/adminSettingsCache";
import {
  DEFAULT_PRODUCT_IMAGE_WATERMARK,
  normalizeProductImageWatermark,
} from "@/lib/productImageWatermark";
import { WatermarkCssOverlay } from "@/components/ui/WatermarkCssOverlay";

const TABS = [
  "General",
  "Notifications",
  "Payments 🇵🇰",
  "Appearance",
  "SEO",
  "Email templates",
  "Footer",
  "Checkout Messages",
  "WhatsApp",
  "Announcement Bar",
  "Brand Story",
  "About Page",
  "Contact Page",
  "Mega Menu",
  "Product Badges",
  "Checkout",
  "Homepage",
  "Courier",
];

const TEMPLATE_KEYS = [
  { id: "orderConfirmation", label: "Order confirmation" },
  { id: "orderShipped", label: "Order shipped" },
  { id: "passwordReset", label: "Password reset" },
];

const VAR_CHIPS = ["{customer_name}", "{order_id}", "{total}", "{store_name}", "{tracking_link}", "{reset_link}"];

function deepClone(o) {
  return JSON.parse(JSON.stringify(o || {}));
}

const GENERAL_REGIONAL_DEFAULTS = {
  currency: "PKR",
  timezone: "Asia/Karachi",
  defaultCountry: "Pakistan",
  defaultCountryCode: "PK",
  defaultCurrency: "PKR",
  defaultPhonePrefix: "+92",
};

const GENERAL_CONTENT_DEFAULTS = {
  storeName: "Homefy.pk",
  email: "info@homefy.pk",
  phone: "+92 324 422 0007",
};

/** Ensure regional fields exist in form state after load (Mongo may omit unset keys). */
function normalizeGeneral(general = {}) {
  const g = general && typeof general === "object" ? general : {};
  return {
    ...g,
    currency: g.currency || GENERAL_REGIONAL_DEFAULTS.currency,
    timezone: g.timezone || GENERAL_REGIONAL_DEFAULTS.timezone,
    defaultCountry: g.defaultCountry ?? GENERAL_REGIONAL_DEFAULTS.defaultCountry,
    defaultCountryCode: g.defaultCountryCode ?? GENERAL_REGIONAL_DEFAULTS.defaultCountryCode,
    defaultCurrency: g.defaultCurrency ?? GENERAL_REGIONAL_DEFAULTS.defaultCurrency,
    defaultPhonePrefix: g.defaultPhonePrefix ?? GENERAL_REGIONAL_DEFAULTS.defaultPhonePrefix,
    storeName: String(g.storeName ?? "").trim() || GENERAL_CONTENT_DEFAULTS.storeName,
    email: String(g.email ?? "").trim() || GENERAL_CONTENT_DEFAULTS.email,
    phone: String(g.phone ?? "").trim() || GENERAL_CONTENT_DEFAULTS.phone,
  };
}

/** Explicit payload for PUT /api/settings — always includes regional defaults. */
function buildGeneralSavePayload(general) {
  const g = normalizeGeneral(general);
  return {
    ...g,
    storeName: String(g.storeName ?? "").trim(),
    phone: String(g.phone ?? "").trim(),
    email: String(g.email ?? "").trim(),
    website: String(g.website ?? "").trim(),
    footerText: String(g.footerText ?? "").trim(),
    address: String(g.address ?? "").trim(),
    currency: "PKR",
    timezone: "Asia/Karachi",
    defaultCountry: "Pakistan",
    defaultCountryCode: "PK",
    defaultCurrency: "PKR",
    defaultPhonePrefix: "+92",
    showStoreName: g.showStoreName !== false,
    logoUrl: typeof g.logoUrl === "string" ? g.logoUrl : g.logo?.url || "",
    logo:
      g.logo && typeof g.logo === "object"
        ? { url: g.logo.url || g.logoUrl || "", publicId: g.logo.publicId || "" }
        : { url: g.logoUrl || "", publicId: "" },
    faviconUrl: typeof g.faviconUrl === "string" ? g.faviconUrl : g.favicon?.url || "",
    favicon:
      g.favicon && typeof g.favicon === "object"
        ? { url: g.favicon.url || g.faviconUrl || "", publicId: g.favicon.publicId || "" }
        : { url: g.faviconUrl || "", publicId: "" },
  };
}

export function SettingsPage() {
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [s, setS] = useState(null);
  const [tplKey, setTplKey] = useState("orderConfirmation");
  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const res = await fetch("/api/settings", { credentials: "include" });
      const json = await res.json();
      if (res.status === 401) {
        window.location.href = `/login?from=${encodeURIComponent("/settings")}`;
        return;
      }
      if (!res.ok || !json.success) {
        const message = json.error || "Failed to load settings";
        setLoadError(message);
        toast.error(message);
        return;
      }
      const settings = deepClone(json.settings);
      settings.general = normalizeGeneral(settings.general);
      setS(settings);
    } catch {
      setLoadError("Network error");
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function save(partial) {
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(partial),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error || "Save failed");
        return;
      }
      toast.success("Settings saved");
      const settings = deepClone(json.settings);
      settings.general = normalizeGeneral(settings.general);
      setS(settings);
      clearStorefrontBrowserCache();
      clearAdminSettingsCache();
    } catch {
      toast.error("Network error");
    }
  }

  const orderPreview = useMemo(() => {
    if (!s) return "";
    const ord = { ...defaultOrderNumberConfig(), ...(s.orderNumber || {}) };
    return formatOrderNumber(ord, previewNextSequence(ord));
  }, [s]);

  if (loading) {
    return <div className="h-48 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />;
  }

  if (!s) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Settings</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          {loadError || "Could not load settings. Sign in again or try once more."}
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={load}
            className="rounded-lg bg-[#1d6fb8] px-4 py-2 text-sm font-semibold text-white hover:bg-[#185f9e]"
          >
            Retry
          </button>
          <Link
            href="/login?from=%2Fsettings"
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  const g = s.general || {};
  const ord = { ...defaultOrderNumberConfig(), ...(s.orderNumber || {}) };
  const n = s.notifications || {};
  const sp = s.storePayment || {};
  const courier = s.courier || {};
  const seo = s.seo || {};
  const productImageWatermark = normalizeProductImageWatermark(s.productImageWatermark);

  function patchProductImageWatermark(patch) {
    setS((prev) => ({
      ...prev,
      productImageWatermark: {
        ...normalizeProductImageWatermark(prev?.productImageWatermark),
        ...patch,
      },
    }));
  }

  function buildProductImageWatermarkSavePayload() {
    return normalizeProductImageWatermark(s.productImageWatermark);
  }

  function buildStorePaymentSavePayload() {
    const raw = s.storePayment || {};
    return {
      ...raw,
      freeShippingThreshold: 0,
      minimumOrderAmount: Math.max(0, Number(raw.minimumOrderAmount) || 0),
      codFee: 0,
      freeShippingOnAdvancePayment: false,
      freeShippingOnOrderAbove: 0,
      freeShippingOnOrderAboveEnabled: false,
      advancePaymentAmount: Math.max(0, Number(raw.advancePaymentAmount) || 250),
      advancePaymentMessageEnabled: raw.advancePaymentMessageEnabled !== false,
      advancePaymentMessageTitle: (() => {
        const t = String(raw.advancePaymentMessageTitle || "").trim();
        if (!t || /pay delivery charges to confirm/i.test(t)) return "Confirm Your Order";
        return t;
      })(),
      advancePaymentMessage: String(raw.advancePaymentMessage || "").trim(),
      advancePaymentDiscountEnabled: raw.advancePaymentDiscountEnabled !== false,
      advancePaymentDiscountPercent: Math.min(
        100,
        Math.max(0, Number(raw.advancePaymentDiscountPercent) || 3)
      ),
      flatDeliveryCharge: 250,
      majorCitiesDays: String(raw.majorCitiesDays || "2-3").trim(),
      otherAreasDays: String(raw.otherAreasDays || "4-7").trim(),
      deliveryNote: String(raw.deliveryNote || "Delivery charges Rs. 250").trim(),
    };
  }

  function patchStorePayment(field, value) {
    setS({
      ...s,
      storePayment: { ...sp, [field]: value },
    });
  }
  const em = s.emailTemplates || {};
  const sf = s.storefront || { checkoutSuccess: {} };
  const cx = sf.checkoutSuccess || {};

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Settings</h1>
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2 dark:border-slate-700">
        {TABS.map((label, i) => (
          <button
            key={label}
            type="button"
            onClick={() => setTab(i)}
            className={[
              "rounded-lg px-3 py-2 text-sm font-medium",
              tab === i ? "bg-[#1d6fb8] text-white" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
            ].join(" ")}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 0 ? (
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Store name" value={g.storeName} onChange={(v) => setS({ ...s, general: { ...g, storeName: v } })} />
            <div
              className="sm:col-span-2 dark:border-slate-700"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "14px 0",
                borderBottom: "1px solid #f3f4f6",
              }}
            >
              <div>
                <p
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "#111827",
                    margin: "0 0 2px",
                  }}
                  className="dark:!text-slate-100"
                >
                  Show Store Name in Header
                </p>
                <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }} className="dark:!text-slate-400">
                  Display store name next to logo in navigation
                </p>
              </div>
              <label
                style={{
                  position: "relative",
                  display: "inline-block",
                  width: 44,
                  height: 24,
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                <input
                  type="checkbox"
                  checked={g.showStoreName !== false}
                  onChange={(e) => setS({ ...s, general: { ...g, showStoreName: e.target.checked } })}
                  style={{ display: "none" }}
                />
                <span
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: g.showStoreName !== false ? "#009688" : "#d1d5db",
                    borderRadius: 99,
                    transition: "background 0.2s",
                  }}
                />
                <span
                  style={{
                    position: "absolute",
                    top: 2,
                    left: g.showStoreName !== false ? 22 : 2,
                    width: 20,
                    height: 20,
                    background: "#fff",
                    borderRadius: "50%",
                    transition: "left 0.2s",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                  }}
                />
              </label>
            </div>
            <Field label="Phone" value={g.phone} onChange={(v) => setS({ ...s, general: { ...g, phone: v } })} />
            <Field label="Email" value={g.email} onChange={(v) => setS({ ...s, general: { ...g, email: v } })} />
            <Field label="Website" value={g.website} onChange={(v) => setS({ ...s, general: { ...g, website: v } })} />
          </div>
          <BrandingSettings
            general={g}
            onChange={(nextGeneral) => setS({ ...s, general: nextGeneral })}
          />
          <Field label="Footer text" value={g.footerText} onChange={(v) => setS({ ...s, general: { ...g, footerText: v } })} multiline />
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-slate-600">Currency</label>
              <select
                value="PKR"
                disabled
                className="mt-1 w-full rounded-lg border bg-slate-100 px-2 py-2 text-sm dark:bg-slate-800"
              >
                <option value="PKR">PKR (Pakistani Rupee)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Timezone</label>
              <select
                value="Asia/Karachi"
                disabled
                className="mt-1 w-full rounded-lg border bg-slate-100 px-2 py-2 text-sm dark:bg-slate-800"
              >
                <option value="Asia/Karachi">Asia/Karachi (PKT)</option>
              </select>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-600 dark:bg-slate-800/40">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Regional defaults</h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Regional defaults for Pakistan (used as reference for checkout and customer forms).
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-slate-600">Default country</label>
                <input
                  type="text"
                  value="Pakistan"
                  readOnly
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Default country code</label>
                <input
                  type="text"
                  value="PK"
                  readOnly
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Default currency (display)</label>
                <select
                  value="PKR"
                  disabled
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-100 px-2 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
                >
                  <option value="PKR">PKR</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Default phone prefix</label>
                <input
                  type="text"
                  value="+92"
                  readOnly
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-6 dark:border-slate-700">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Order number format</h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              New orders get the next number from the sequence. Year and month use UTC.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field
                label="Prefix"
                value={ord.prefix}
                onChange={(v) => setS({ ...s, orderNumber: { ...ord, prefix: v } })}
              />
              <Field
                label="Separator"
                value={ord.separator}
                onChange={(v) => setS({ ...s, orderNumber: { ...ord, separator: v } })}
              />
              <div>
                <label className="text-xs font-medium text-slate-600">Starting number</label>
                <input
                  type="number"
                  min={1}
                  value={ord.startingNumber}
                  onChange={(e) =>
                    setS({
                      ...s,
                      orderNumber: { ...ord, startingNumber: Math.max(1, parseInt(e.target.value, 10) || 1) },
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
                />
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <Toggle
                label="Include year (e.g. ORD-2026-00001)"
                checked={!!ord.includeYear}
                onChange={(v) => setS({ ...s, orderNumber: { ...ord, includeYear: v } })}
              />
              <Toggle
                label="Include month (e.g. ORD-2026-04-00001)"
                checked={!!ord.includeMonth}
                onChange={(v) => setS({ ...s, orderNumber: { ...ord, includeMonth: v } })}
              />
            </div>
            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-600 dark:bg-slate-800/50">
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Your order numbers will look like:</p>
              <p className="mt-2 font-mono text-sm font-semibold text-slate-900 dark:text-white">{orderPreview}</p>
            </div>
            <button
              type="button"
              onClick={() =>
                save({
                  orderNumber: {
                    prefix: ord.prefix,
                    separator: ord.separator,
                    includeYear: ord.includeYear,
                    includeMonth: ord.includeMonth,
                    startingNumber: ord.startingNumber,
                    currentSequence: typeof s.orderNumber?.currentSequence === "number" ? s.orderNumber.currentSequence : 0,
                  },
                })
              }
              className="mt-4 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              Save format
            </button>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-600 dark:bg-slate-800/40">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Invoice branding</h3>
            <p className="mt-1 text-xs text-slate-500">
              Shown on professional invoice PDFs (logo &amp; store details come from General above).
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field
                label="Business address"
                value={g.address || ""}
                onChange={(v) => setS({ ...s, general: { ...g, address: v } })}
                multiline
              />
              <Field
                label="NTN"
                value={s.invoice?.ntn || ""}
                onChange={(v) => setS({ ...s, invoice: { ...(s.invoice || {}), ntn: v } })}
              />
              <Field
                label="STRN"
                value={s.invoice?.strn || ""}
                onChange={(v) => setS({ ...s, invoice: { ...(s.invoice || {}), strn: v } })}
              />
              <Field
                label="Bank name"
                value={s.invoice?.bankName || ""}
                onChange={(v) => setS({ ...s, invoice: { ...(s.invoice || {}), bankName: v } })}
              />
              <Field
                label="Account title"
                value={s.invoice?.bankAccountTitle || ""}
                onChange={(v) => setS({ ...s, invoice: { ...(s.invoice || {}), bankAccountTitle: v } })}
              />
              <Field
                label="Account number"
                value={s.invoice?.bankAccountNumber || ""}
                onChange={(v) => setS({ ...s, invoice: { ...(s.invoice || {}), bankAccountNumber: v } })}
              />
              <Field
                label="IBAN"
                value={s.invoice?.bankIban || ""}
                onChange={(v) => setS({ ...s, invoice: { ...(s.invoice || {}), bankIban: v } })}
              />
              <Field
                label="Invoice terms"
                value={s.invoice?.terms || ""}
                onChange={(v) => setS({ ...s, invoice: { ...(s.invoice || {}), terms: v } })}
                multiline
              />
              <Field
                label="Invoice footer note"
                value={s.invoice?.footerNote || ""}
                onChange={(v) => setS({ ...s, invoice: { ...(s.invoice || {}), footerNote: v } })}
                multiline
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              save({
                general: buildGeneralSavePayload({ ...s.general, address: g.address }),
                invoice: {
                  ntn: String(s.invoice?.ntn || "").trim(),
                  strn: String(s.invoice?.strn || "").trim(),
                  bankName: String(s.invoice?.bankName || "").trim(),
                  bankAccountTitle: String(s.invoice?.bankAccountTitle || "").trim(),
                  bankAccountNumber: String(s.invoice?.bankAccountNumber || "").trim(),
                  bankIban: String(s.invoice?.bankIban || "").trim(),
                  terms: String(s.invoice?.terms || "").trim(),
                  footerNote: String(s.invoice?.footerNote || "").trim(),
                },
              })
            }
            className="rounded-lg bg-[#1d6fb8] px-4 py-2 text-sm font-semibold text-white"
          >
            Save general
          </button>
        </div>
      ) : null}

      {tab === 1 ? (
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
          <Toggle label="Email on new order" checked={!!n.emailOnNewOrder} onChange={(v) => setS({ ...s, notifications: { ...n, emailOnNewOrder: v } })} />
          <Toggle label="Email on low stock" checked={!!n.emailOnLowStock} onChange={(v) => setS({ ...s, notifications: { ...n, emailOnLowStock: v } })} />
          <Toggle label="Email on new review" checked={!!n.emailOnNewReview} onChange={(v) => setS({ ...s, notifications: { ...n, emailOnNewReview: v } })} />
          <Field
            label="Notification email address"
            value={n.notificationEmail || ""}
            onChange={(v) => setS({ ...s, notifications: { ...n, notificationEmail: v } })}
          />
          <button type="button" onClick={() => save({ notifications: s.notifications })} className="rounded-lg bg-[#1d6fb8] px-4 py-2 text-sm font-semibold text-white">
            Save notifications
          </button>
        </div>
      ) : null}

      {tab === 2 ? (
        <div className="space-y-6 rounded-xl border border-slate-200 bg-white p-6" style={{ color: "#111111" }}>
          <section>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "#111111", margin: "0 0 8px" }}>Store checkout rules</h3>
            <p style={{ fontSize: 12, color: "#6b7280", margin: "0 0 16px" }}>
              Flat delivery Rs. 250 on every order. Free delivery is disabled by store policy.
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="text-xs font-medium text-slate-600">Minimum Order Amount (Rs.)</label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={sp.minimumOrderAmount ?? 0}
                  onChange={(e) => patchStorePayment("minimumOrderAmount", parseFloat(e.target.value) || 0)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">COD Fee (Rs.)</label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={sp.codFee ?? 0}
                  onChange={(e) => patchStorePayment("codFee", parseFloat(e.target.value) || 0)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
                />
                <p className="mt-1 text-xs text-slate-500">Extra charge for cash on delivery (0 = none)</p>
              </div>
            </div>
          </section>

          <section className="border-t border-slate-200 pt-6">
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "#111111", margin: "0 0 8px" }}>
              Delivery Estimate (shown on product pages)
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-slate-600">Major Cities Delivery Days</label>
                <input
                  type="text"
                  value={sp.majorCitiesDays ?? "2-3"}
                  onChange={(e) => patchStorePayment("majorCitiesDays", e.target.value)}
                  placeholder="2-3"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
                />
                <p className="mt-1 text-xs text-slate-500">e.g. 2-3 days for Lahore, Karachi, Islamabad</p>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Other Areas Delivery Days</label>
                <input
                  type="text"
                  value={sp.otherAreasDays ?? "4-7"}
                  onChange={(e) => patchStorePayment("otherAreasDays", e.target.value)}
                  placeholder="4-7"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
                />
                <p className="mt-1 text-xs text-slate-500">e.g. 4-7 days for remote areas</p>
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-slate-600">Delivery Note</label>
                <input
                  type="text"
                  value={sp.deliveryNote ?? "Delivery charges Rs. 250"}
                  onChange={(e) => patchStorePayment("deliveryNote", e.target.value)}
                  placeholder="Delivery charges Rs. 250"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
                />
                <p className="mt-1 text-xs text-slate-500">Shown in green below delivery estimate</p>
              </div>
            </div>
          </section>

          <section className="border-t border-slate-200 pt-6">
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "#111111", margin: "0 0 8px" }}>Shipping Rules</h3>
            <p style={{ fontSize: 12, color: "#6b7280", margin: "0 0 16px" }}>
              Smart delivery rules applied at checkout and on the order success page.
            </p>

            <div className="space-y-4 rounded-lg border border-slate-100 p-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-sm font-semibold text-slate-800">Delivery charge: Rs. 250 (locked)</p>
                <p className="mt-1 text-xs text-slate-500">
                  Free delivery is not offered. Checkout always charges at least Rs. 250.
                </p>
              </div>
              <Toggle
                label="Discount on Advance Payment"
                checked={sp.advancePaymentDiscountEnabled !== false}
                onChange={(v) => patchStorePayment("advancePaymentDiscountEnabled", v)}
              />
              <div>
                <label className="text-xs font-medium text-slate-600">Advance payment discount (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={sp.advancePaymentDiscountPercent ?? 3}
                  onChange={(e) =>
                    patchStorePayment("advancePaymentDiscountPercent", parseFloat(e.target.value) || 0)
                  }
                  className="mt-1 w-full max-w-xs rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
                />
                <p className="mt-1 text-xs text-slate-500">
                  e.g. 3 = customer gets 3% off when paying via JazzCash / bank / Meezan (not COD)
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-3 rounded-lg border border-slate-100 p-4">
              <Toggle
                label="Show advance payment message to customers"
                checked={sp.advancePaymentMessageEnabled !== false}
                onChange={(v) => patchStorePayment("advancePaymentMessageEnabled", v)}
              />
              <div>
                <label className="text-xs font-medium text-slate-600">Message Title</label>
                <input
                  type="text"
                  value={sp.advancePaymentMessageTitle ?? "Confirm Your Order"}
                  onChange={(e) => patchStorePayment("advancePaymentMessageTitle", e.target.value)}
                  placeholder="Confirm Your Order"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Minimum Advance Amount (Rs.)</label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={sp.advancePaymentAmount ?? 500}
                  onChange={(e) => patchStorePayment("advancePaymentAmount", parseFloat(e.target.value) || 0)}
                  className="mt-1 w-full max-w-xs rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Message to Customer</label>
                <textarea
                  rows={4}
                  value={sp.advancePaymentMessage ?? ""}
                  onChange={(e) => patchStorePayment("advancePaymentMessage", e.target.value)}
                  placeholder="To confirm your order, please pay..."
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Shown on checkout and order success for COD when delivery applies. Use {"{amount}"} and{" "}
                  {"{whatsapp}"} placeholders.
                </p>
              </div>
            </div>
          </section>

          <PakistaniPaymentSettings
            settings={s}
            setSettings={setS}
            onSave={(partial) => save({ ...partial, storePayment: buildStorePaymentSavePayload() })}
          />

          <section className="border-t border-slate-200 pt-6">
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "#111111", margin: "0 0 8px" }}>Checkout success page (customer store)</h3>
            <p className="mt-1 text-xs text-slate-500">
              Text shown on the storefront after an order is placed. Use{" "}
              <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">{"{storeName}"}</code> in the thank-you
              paragraph to insert your store name.
            </p>
            <div className="mt-4 grid gap-4">
              <Field
                label="Heading"
                value={cx.title || ""}
                onChange={(v) =>
                  setS({
                    ...s,
                    storefront: {
                      ...(s.storefront || {}),
                      checkoutSuccess: { ...(s.storefront?.checkoutSuccess || {}), title: v },
                    },
                  })
                }
              />
              <Field
                label="Thank-you message"
                value={cx.thankYouMessage || ""}
                onChange={(v) =>
                  setS({
                    ...s,
                    storefront: {
                      ...(s.storefront || {}),
                      checkoutSuccess: { ...(s.storefront?.checkoutSuccess || {}), thankYouMessage: v },
                    },
                  })
                }
                multiline
                rows={4}
              />
              <Field
                label="Payment confirmed note (when paid online)"
                value={cx.paymentConfirmedMessage || ""}
                onChange={(v) =>
                  setS({
                    ...s,
                    storefront: {
                      ...(s.storefront || {}),
                      checkoutSuccess: { ...(s.storefront?.checkoutSuccess || {}), paymentConfirmedMessage: v },
                    },
                  })
                }
                multiline
                rows={4}
              />
              <Field
                label="COD advance payment note (Cash on Delivery)"
                value={cx.codAdvanceNote || ""}
                onChange={(v) =>
                  setS({
                    ...s,
                    storefront: {
                      ...(s.storefront || {}),
                      checkoutSuccess: { ...(s.storefront?.checkoutSuccess || {}), codAdvanceNote: v },
                    },
                  })
                }
                multiline
                rows={4}
              />
              <Field
                label="Footer note (e.g. email confirmation)"
                value={cx.footerMessage || ""}
                onChange={(v) =>
                  setS({
                    ...s,
                    storefront: {
                      ...(s.storefront || {}),
                      checkoutSuccess: { ...(s.storefront?.checkoutSuccess || {}), footerMessage: v },
                    },
                  })
                }
                multiline
                rows={4}
              />
            </div>
          </section>

          <button
            type="button"
            onClick={() =>
              save({
                storePayment: buildStorePaymentSavePayload(),
                storefront: {
                  checkoutSuccess: {
                    title: String(s.storefront?.checkoutSuccess?.title ?? ""),
                    thankYouMessage: String(s.storefront?.checkoutSuccess?.thankYouMessage ?? ""),
                    paymentConfirmedMessage: String(s.storefront?.checkoutSuccess?.paymentConfirmedMessage ?? ""),
                    codAdvanceNote: String(s.storefront?.checkoutSuccess?.codAdvanceNote ?? ""),
                    footerMessage: String(s.storefront?.checkoutSuccess?.footerMessage ?? ""),
                  },
                },
              })
            }
            className="rounded-lg bg-[#1d6fb8] px-4 py-2 text-sm font-semibold text-white"
          >
            Save checkout success page
          </button>
        </div>
      ) : null}

      {tab === 3 ? (
        <div className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
          <div>
            <label className="text-xs font-medium text-slate-600">Theme default</label>
            <select
              value={seo.themeDefault || "light"}
              onChange={(e) => setS({ ...s, seo: { ...seo, themeDefault: e.target.value } })}
              className="mt-1 w-full rounded-lg border px-2 py-2 text-sm dark:bg-slate-800"
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="system">System</option>
            </select>
          </div>

          <div className="border-t border-slate-200 pt-6 dark:border-slate-700">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Product Image Watermark</h2>
            <p className="mt-1 text-sm text-slate-500">
              CSS overlay on storefront product images (not burned into uploaded files).
            </p>

            <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              <input
                type="checkbox"
                checked={productImageWatermark.enabled}
                onChange={(e) => patchProductImageWatermark({ enabled: e.target.checked })}
                className="rounded border-slate-300"
              />
              Enable watermark on product images
            </label>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-slate-600">Watermark text</label>
                <input
                  type="text"
                  value={productImageWatermark.text}
                  onChange={(e) => patchProductImageWatermark({ text: e.target.value })}
                  placeholder={DEFAULT_PRODUCT_IMAGE_WATERMARK.text}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Position</label>
                <select
                  value={productImageWatermark.position}
                  onChange={(e) => patchProductImageWatermark({ position: e.target.value })}
                  className="mt-1 w-full rounded-lg border px-2 py-2 text-sm dark:bg-slate-800"
                >
                  <option value="bottom-right">Bottom right</option>
                  <option value="bottom-left">Bottom left</option>
                  <option value="bottom-center">Bottom center</option>
                  <option value="top-right">Top right</option>
                  <option value="top-left">Top left</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">
                  Opacity ({productImageWatermark.opacity})
                </label>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.1}
                  value={productImageWatermark.opacity}
                  onChange={(e) => patchProductImageWatermark({ opacity: Number(e.target.value) })}
                  className="mt-2 w-full"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Font size (px)</label>
                <input
                  type="number"
                  min={8}
                  max={120}
                  value={productImageWatermark.fontSize}
                  onChange={(e) => patchProductImageWatermark({ fontSize: Number(e.target.value) || 24 })}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Text color</label>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="color"
                    value={productImageWatermark.color}
                    onChange={(e) => patchProductImageWatermark({ color: e.target.value })}
                    className="h-10 w-14 cursor-pointer rounded border border-slate-200"
                  />
                  <input
                    type="text"
                    value={productImageWatermark.color}
                    onChange={(e) => patchProductImageWatermark({ color: e.target.value })}
                    className="flex-1 rounded-lg border px-3 py-2 font-mono text-sm dark:bg-slate-800"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6">
              <p className="text-xs font-medium text-slate-600">Preview</p>
              <div
                className="relative mt-2 max-w-sm overflow-hidden rounded-lg border border-slate-200 bg-slate-800"
                style={{ aspectRatio: "4 / 3" }}
              >
                <div
                  className="absolute inset-0 bg-gradient-to-br from-slate-600 to-slate-900"
                  aria-hidden
                />
                <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-400">
                  Sample product image
                </div>
                <WatermarkCssOverlay watermark={productImageWatermark} />
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              save({
                seo: { ...seo, themeDefault: seo.themeDefault || "light" },
                productImageWatermark: buildProductImageWatermarkSavePayload(),
              })
            }
            className="rounded-lg bg-[#1d6fb8] px-4 py-2 text-sm font-semibold text-white"
          >
            Save appearance
          </button>
        </div>
      ) : null}

      {tab === 4 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
          <SeoSettings />
        </div>
      ) : null}

      {tab === 5 ? (
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
          <div>
            <label className="text-xs font-medium text-slate-600">Template</label>
            <select
              value={tplKey}
              onChange={(e) => setTplKey(e.target.value)}
              className="mt-1 w-full rounded-lg border px-2 py-2 text-sm dark:bg-slate-800"
            >
              {TEMPLATE_KEYS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap gap-1">
            {VAR_CHIPS.map((v) => (
              <button
                key={v}
                type="button"
                className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-xs dark:border-slate-600 dark:bg-slate-800"
                onClick={() => toast(`Insert ${v} in the editor manually (chip: copied concept).`)}
              >
                {v}
              </button>
            ))}
          </div>
          <Field
            label="Subject"
            value={em[tplKey]?.subject || ""}
            onChange={(v) =>
              setS({
                ...s,
                emailTemplates: { ...em, [tplKey]: { ...em[tplKey], subject: v, body: em[tplKey]?.body || "" } },
              })
            }
          />
          <div>
            <label className="text-xs font-medium text-slate-600">Body</label>
            <div className="mt-2 min-h-[200px] rounded-lg border dark:border-slate-600">
              <RichTextEditor
                key={tplKey}
                variant="lite"
                content={em[tplKey]?.body || ""}
                onChange={(html) =>
                  setS({
                    ...s,
                    emailTemplates: {
                      ...em,
                      [tplKey]: { ...em[tplKey], subject: em[tplKey]?.subject || "", body: html },
                    },
                  })
                }
              />
            </div>
          </div>
          <button
            type="button"
            onClick={() => save({ emailTemplates: s.emailTemplates })}
            className="rounded-lg bg-[#1d6fb8] px-4 py-2 text-sm font-semibold text-white"
          >
            Save templates
          </button>
        </div>
      ) : null}

      {tab === 6 ? <FooterSettings settings={s} setSettings={setS} onSave={save} /> : null}

      {tab === 7 ? (
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
          <h3 className="font-semibold text-slate-900 dark:text-white">Checkout messages</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            These messages appear on the storefront success/failure page after payment.
          </p>
          <div className="grid gap-4">
            <Field
              label="Success title"
              value={cx.successTitle || cx.title || ""}
              onChange={(v) =>
                setS({
                  ...s,
                  storefront: {
                    ...(s.storefront || {}),
                    checkoutSuccess: { ...(s.storefront?.checkoutSuccess || {}), successTitle: v },
                  },
                })
              }
            />
            <Field
              label="Success message"
              value={cx.successMessage || cx.thankYouMessage || ""}
              onChange={(v) =>
                setS({
                  ...s,
                  storefront: {
                    ...(s.storefront || {}),
                    checkoutSuccess: { ...(s.storefront?.checkoutSuccess || {}), successMessage: v },
                  },
                })
              }
              multiline
            />
            <Field
              label="Failed title"
              value={cx.failedTitle || ""}
              onChange={(v) =>
                setS({
                  ...s,
                  storefront: {
                    ...(s.storefront || {}),
                    checkoutSuccess: { ...(s.storefront?.checkoutSuccess || {}), failedTitle: v },
                  },
                })
              }
            />
            <Field
              label="Failed message"
              value={cx.failedMessage || ""}
              onChange={(v) =>
                setS({
                  ...s,
                  storefront: {
                    ...(s.storefront || {}),
                    checkoutSuccess: { ...(s.storefront?.checkoutSuccess || {}), failedMessage: v },
                  },
                })
              }
              multiline
            />
            <Field
              label="Email subject"
              value={cx.emailSubject || ""}
              onChange={(v) =>
                setS({
                  ...s,
                  storefront: {
                    ...(s.storefront || {}),
                    checkoutSuccess: { ...(s.storefront?.checkoutSuccess || {}), emailSubject: v },
                  },
                })
              }
            />
            <Field
              label="Email message"
              value={cx.emailMessage || ""}
              onChange={(v) =>
                setS({
                  ...s,
                  storefront: {
                    ...(s.storefront || {}),
                    checkoutSuccess: { ...(s.storefront?.checkoutSuccess || {}), emailMessage: v },
                  },
                })
              }
              multiline
            />
          </div>
          <button
            type="button"
            onClick={() =>
              save({
                storefront: {
                  checkoutSuccess: {
                    successTitle: String(s.storefront?.checkoutSuccess?.successTitle ?? ""),
                    successMessage: String(s.storefront?.checkoutSuccess?.successMessage ?? ""),
                    failedTitle: String(s.storefront?.checkoutSuccess?.failedTitle ?? ""),
                    failedMessage: String(s.storefront?.checkoutSuccess?.failedMessage ?? ""),
                    emailSubject: String(s.storefront?.checkoutSuccess?.emailSubject ?? ""),
                    emailMessage: String(s.storefront?.checkoutSuccess?.emailMessage ?? ""),
                  },
                },
              })
            }
            className="rounded-lg bg-[#1d6fb8] px-4 py-2 text-sm font-semibold text-white"
          >
            Save checkout messages
          </button>
        </div>
      ) : null}

      {tab === 8 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
          <WhatsAppSettings />
          <WhatsAppTemplateSettings />
        </div>
      ) : null}

      {tab === 9 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
          <AnnouncementBarSettings />
        </div>
      ) : null}

      {tab === 10 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
          <BrandStorySettings />
        </div>
      ) : null}

      {tab === 11 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
          <AboutPageSettings />
        </div>
      ) : null}

      {tab === 12 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
          <ContactPageSettings />
        </div>
      ) : null}

      {tab === 13 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
          <MegaMenuSettings />
        </div>
      ) : null}

      {tab === 14 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
          <ProductBadgeSettings />
        </div>
      ) : null}

      {tab === 15 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
          <CheckoutSettings />
        </div>
      ) : null}

      {tab === 16 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
          <HomepageSettings />
        </div>
      ) : null}

      {tab === 17 ? (
        <CourierSettingsTab
          courier={courier}
          onPatch={(partial) => setS({ ...s, courier: { ...courier, ...partial } })}
          onSave={() => save({ courier })}
        />
      ) : null}
    </div>
  );
}

function CourierSettingsTab({ courier, onPatch, onSave }) {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState("");

  async function testConnection() {
    const tn = String(courier.testTrackingNumber || "").trim();
    if (!tn) {
      toast.error("Enter a test tracking number first.");
      return;
    }
    setTesting(true);
    setTestResult("");
    try {
      const res = await fetch(`/api/postex/track?trackingNumber=${encodeURIComponent(tn)}`, {
        credentials: "include",
      });
      const json = await res.json();
      if (json.success) {
        setTestResult(`Connected — status: ${json.status}`);
        toast.success("Postex connection OK");
      } else {
        setTestResult(json.error || "Connection failed");
        toast.error(json.error || "Test failed");
      }
    } catch {
      setTestResult("Network error");
      toast.error("Network error");
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Courier & Postex</h2>
      <p className="text-sm text-slate-600 dark:text-slate-400">
        API key is read from <code className="text-xs">POSTEX_API_KEY</code> environment variable first, then from the
        field below.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-xs font-medium text-slate-600">Default Courier</label>
          <select
            value={courier.defaultCourier || "Postex"}
            onChange={(e) => onPatch({ defaultCourier: e.target.value })}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
          >
            {["Postex", "TCS", "Leopards", "M&P", "Other"].map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <Field
          label="Origin City"
          value={courier.originCity || "Gujranwala"}
          onChange={(v) => onPatch({ originCity: v })}
        />
        <p className="text-xs text-slate-500 sm:col-span-2">
          Your warehouse/dispatch city sent as originCityName on every Postex booking.
        </p>
        <Field
          label="Postex Account ID (optional)"
          value={courier.postexAccountId || ""}
          onChange={(v) => onPatch({ postexAccountId: v })}
        />
        <div className="sm:col-span-2">
          <Field
            label="Postex Pickup Address Code *"
            value={courier.postexAddressCode || ""}
            onChange={(v) => onPatch({ postexAddressCode: v })}
          />
          <p className="mt-1 text-xs text-slate-500">
            Required for Postex booking. Get from Postex portal → Settings → Pickup Addresses
          </p>
        </div>
        <Field
          label="Postex API Key"
          password
          value={courier.postexApiKey || ""}
          onChange={(v) => onPatch({ postexApiKey: v })}
        />
        <Field
          label="Test tracking number"
          value={courier.testTrackingNumber || ""}
          onChange={(v) => onPatch({ testTrackingNumber: v })}
        />
      </div>
      <Toggle
        label="Auto-create Postex shipment when shipping (future)"
        checked={Boolean(courier.autoCreateShipment)}
        onChange={(v) => onPatch({ autoCreateShipment: v })}
      />
      <Toggle
        label="Send tracking to customer (WhatsApp template enabled)"
        checked={courier.sendTrackingToCustomer !== false}
        onChange={(v) => onPatch({ sendTrackingToCustomer: v })}
      />
      <Field
        label="Tracking message template"
        multiline
        value={
          courier.trackingMessageTemplate ||
          "Your order #{orderNumber} has been shipped via Postex! Track here: {trackingUrl}"
        }
        onChange={(v) => onPatch({ trackingMessageTemplate: v })}
      />
      <p className="text-xs text-slate-500">Placeholders: {"{orderNumber}"}, {"{trackingUrl}"}, {"{trackingNumber}"}</p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={testConnection}
          disabled={testing}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold hover:bg-slate-50 dark:border-slate-600"
        >
          {testing ? "Testing…" : "Test Connection"}
        </button>
        <button
          type="button"
          onClick={onSave}
          className="rounded-lg bg-[#1d6fb8] px-4 py-2 text-sm font-semibold text-white hover:bg-[#185f9e]"
        >
          Save Courier Settings
        </button>
      </div>
      {testResult ? (
        <p className="text-sm text-slate-600 dark:text-slate-300">{testResult}</p>
      ) : null}
    </div>
  );
}

function Field({ label, value, onChange, multiline, password, rows = 4 }) {
  return (
    <div>
      <label className="text-xs font-medium text-slate-600">{label}</label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          className="mt-1 min-h-[6rem] w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words dark:border-slate-600 dark:bg-slate-800"
        />
      ) : (
        <input
          type={password ? "password" : "text"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
        />
      )}
    </div>
  );
}

function Toggle({ label, checked, onChange }) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-lg border border-slate-100 px-3 py-2 dark:border-slate-800">
      <span className="text-sm text-slate-800 dark:text-slate-200">{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}
