/**
 * Full store brand details for invoices / print documents.
 */
import { sanitizeStoreName } from "@/lib/sanitizeForeignBrand";

/**
 * Make invoice logos print-safe.
 * - Settings store absolute storefront URLs (`https://crazzycars.pk/media/...`).
 * - Print runs on `admin.crazzycars.pk` with `crossorigin="anonymous"` historically →
 *   browsers require CORS; store Caddy does not send ACAO → broken image icon.
 * - Rewrite our `/media/` logos to the current origin (admin also serves them).
 */
export function resolveInvoiceLogoUrl(logoUrl) {
  const raw = String(logoUrl || "").trim();
  if (!raw) return "";
  try {
    const fallbackOrigin =
      typeof window !== "undefined" && window.location?.origin
        ? window.location.origin
        : "https://admin.crazzycars.pk";
    const u = new URL(raw, fallbackOrigin);
    const host = u.hostname.toLowerCase();
    const isOurs =
      host === "crazzycars.pk" ||
      host === "www.crazzycars.pk" ||
      host === "admin.crazzycars.pk" ||
      host.endsWith(".crazzycars.pk");
    if (isOurs && u.pathname.startsWith("/media/")) {
      if (typeof window !== "undefined" && window.location?.origin) {
        return `${window.location.origin}${u.pathname}${u.search || ""}`;
      }
      return `https://admin.crazzycars.pk${u.pathname}${u.search || ""}`;
    }
    return u.href;
  } catch {
    return raw;
  }
}

function buildMetaFromParts(g, appearance, invoice) {
  const logoRaw =
    (typeof g.logoUrl === "string" && g.logoUrl) ||
    (typeof g.logo === "string" && g.logo) ||
    g.logo?.url ||
    "";
  return {
    storeName: sanitizeStoreName(g.storeName),
    logoUrl: resolveInvoiceLogoUrl(logoRaw),
    phone: String(g.phone || "").trim(),
    email: String(g.email || "").trim(),
    website: String(g.website || "").trim(),
    address: String(g.address || "").trim(),
    footerText: String(g.footerText || "").trim(),
    currency: String(g.currency || g.defaultCurrency || "PKR").trim() || "PKR",
    primaryColor: String(appearance.primaryColor || "#C41E1E").trim() || "#C41E1E",
    ntn: String(invoice.ntn || "").trim(),
    strn: String(invoice.strn || "").trim(),
    bankName: String(invoice.bankName || "").trim(),
    bankAccountTitle: String(invoice.bankAccountTitle || "").trim(),
    bankAccountNumber: String(invoice.bankAccountNumber || "").trim(),
    bankIban: String(invoice.bankIban || "").trim(),
    terms: String(invoice.terms || "").trim(),
    footerNote: String(invoice.footerNote || "").trim(),
  };
}

export async function getInvoiceStoreMeta() {
  if (typeof window === "undefined") {
    return defaultMeta();
  }
  try {
    const res = await fetch(`/api/settings?_=${Date.now()}`, {
      credentials: "include",
      cache: "no-store",
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
      },
    });
    const json = await res.json();
    if (!json.success) return defaultMeta();
    const g = json.settings?.general || json.data?.general || {};
    const appearance = json.settings?.appearance || json.data?.appearance || {};
    const invoice = json.settings?.invoice || json.data?.invoice || {};
    return buildMetaFromParts(g, appearance, invoice);
  } catch {
    return defaultMeta();
  }
}

function defaultMeta() {
  return {
    storeName: process.env.NEXT_PUBLIC_STORE_NAME || "Crazzycars.pk",
    logoUrl: "",
    phone: "",
    email: "",
    website: "",
    address: "",
    footerText: "",
    currency: "PKR",
    primaryColor: "#C41E1E",
    ntn: "",
    strn: "",
    bankName: "",
    bankAccountTitle: "",
    bankAccountNumber: "",
    bankIban: "",
    terms: "",
    footerNote: "",
  };
}

/** Build invoice chrome from Settings document (server-side). */
export function storeMetaFromSettings(settingsDoc) {
  if (!settingsDoc) return defaultMeta();
  const g = settingsDoc.general || {};
  const appearance = settingsDoc.appearance || {};
  const invoice = settingsDoc.invoice || {};
  return buildMetaFromParts(g, appearance, invoice);
}
