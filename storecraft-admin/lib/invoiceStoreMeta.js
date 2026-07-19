/**
 * Full store brand details for invoices / print documents.
 */
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
    const logoUrl =
      (typeof g.logoUrl === "string" && g.logoUrl) ||
      (typeof g.logo === "string" && g.logo) ||
      g.logo?.url ||
      "";
    return {
      storeName: String(g.storeName || "").trim() || "Crazzycars.pk",
      logoUrl: String(logoUrl || "").trim(),
      phone: String(g.phone || "").trim(),
      email: String(g.email || "").trim(),
      website: String(g.website || "").trim(),
      address: String(g.address || "").trim(),
      footerText: String(g.footerText || "").trim(),
      currency: String(g.currency || g.defaultCurrency || "PKR").trim() || "PKR",
      primaryColor: String(appearance.primaryColor || "#1A7A4C").trim() || "#1A7A4C",
      ntn: String(invoice.ntn || "").trim(),
      strn: String(invoice.strn || "").trim(),
      bankName: String(invoice.bankName || "").trim(),
      bankAccountTitle: String(invoice.bankAccountTitle || "").trim(),
      bankAccountNumber: String(invoice.bankAccountNumber || "").trim(),
      bankIban: String(invoice.bankIban || "").trim(),
      terms: String(invoice.terms || "").trim(),
      footerNote: String(invoice.footerNote || "").trim(),
    };
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
    primaryColor: "#1A7A4C",
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
