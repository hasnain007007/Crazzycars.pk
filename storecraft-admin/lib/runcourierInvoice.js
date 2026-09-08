/**
 * Fetch Run Courier portal airbill HTML and inline images so the browser
 * can render a same-origin PDF (html2canvas + jsPDF) without CORS issues.
 */

const PORTAL_ORIGIN = "https://portal.runcourier.com";

function absolutizeUrl(raw, baseUrl) {
  const src = String(raw || "").trim();
  if (!src || src.startsWith("data:") || src.startsWith("blob:")) return src;
  try {
    return new URL(src, baseUrl || PORTAL_ORIGIN).toString();
  } catch {
    return src;
  }
}

/** Prefer the print-friendly invoice URL when we only have order_id. */
export function normalizeRunCourierInvoiceUrl(raw) {
  const link = String(raw || "").trim();
  if (!link.startsWith("http")) return "";
  try {
    const u = new URL(link);
    if (/invoicehtml\.php/i.test(u.pathname) && u.searchParams.get("print") !== "1") {
      u.searchParams.set("print", "1");
    }
    return u.toString();
  } catch {
    return link;
  }
}

async function fetchAsDataUri(url) {
  const abs = absolutizeUrl(url, PORTAL_ORIGIN);
  if (!abs || abs.startsWith("data:")) return abs;
  try {
    const res = await fetch(abs, {
      method: "GET",
      headers: { Accept: "image/*,*/*", "User-Agent": "CrazzycarsLabel/1.0" },
      cache: "no-store",
    });
    if (!res.ok) return abs;
    const buf = Buffer.from(await res.arrayBuffer());
    if (!buf.length) return abs;
    const ct = String(res.headers.get("content-type") || "image/png")
      .split(";")[0]
      .trim();
    if (!ct.startsWith("image/")) return abs;
    return `data:${ct};base64,${buf.toString("base64")}`;
  } catch {
    return abs;
  }
}

/**
 * Rewrite relative asset URLs, strip scripts, and inline <img> as data URIs.
 */
export async function prepareRunCourierInvoiceHtml(invoiceLink) {
  const url = normalizeRunCourierInvoiceUrl(invoiceLink);
  if (!url) {
    return { success: false, error: "Invoice link missing.", html: "" };
  }

  let html = "";
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "CrazzycarsLabel/1.0",
      },
      cache: "no-store",
    });
    html = await res.text();
    if (!res.ok || !html) {
      return {
        success: false,
        error: `Could not load airbill (HTTP ${res.status}).`,
        html: "",
      };
    }
  } catch (e) {
    return {
      success: false,
      error: e?.message || "Could not load airbill HTML.",
      html: "",
    };
  }

  // Drop scripts (JsBarcode / analytics) — barcode/QR are already <img>s.
  html = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/on\w+\s*=\s*(['"])[\s\S]*?\1/gi, "");

  // Portal HTML often omits <html> — required for reliable rendering.
  if (!/<html[\s>]/i.test(html)) {
    if (/<!DOCTYPE/i.test(html)) {
      html = html.replace(/<!DOCTYPE[^>]*>/i, "$&\n<html>");
    } else {
      html = `<!DOCTYPE html><html>${html}`;
    }
    if (!/<\/html>/i.test(html)) html = `${html}</html>`;
  }

  // Neutralize float layout that collapses height in PDF/html2canvas captures.
  const layoutFix = `<style id="cc-airbill-fix">
    html, body { background:#fff !important; }
    .page-wrap, .table_invoice { float:none !important; display:block !important; width:867px !important; max-width:100% !important; }
    .table_invoice::after { content:""; display:table; clear:both; }
    button, .print_btn { display:none !important; }
  </style>`;
  if (/<\/head>/i.test(html)) {
    html = html.replace(/<\/head>/i, `${layoutFix}</head>`);
  } else if (/<head[^>]*>/i.test(html)) {
    html = html.replace(/<head([^>]*)>/i, `<head$1>${layoutFix}`);
  } else {
    html = html.replace(/<html[^>]*>/i, (m) => `${m}<head>${layoutFix}</head>`);
  }

  // Absolutize remaining relative URLs in common attributes.
  html = html.replace(
    /\b(src|href)=(["'])(?!data:|https?:|\/\/)([^"']+)\2/gi,
    (_, attr, quote, path) => `${attr}=${quote}${absolutizeUrl(path, url)}${quote}`
  );

  const imgSrcs = [...html.matchAll(/<img\b[^>]*\bsrc=(["'])([^"']+)\1/gi)].map((m) => m[2]);
  const unique = [...new Set(imgSrcs.filter((s) => s && !s.startsWith("data:")))];
  const map = new Map();
  await Promise.all(
    unique.map(async (src) => {
      map.set(src, await fetchAsDataUri(src));
    })
  );

  for (const [from, to] of map.entries()) {
    if (!to || to === from) continue;
    const escaped = from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    html = html.replace(new RegExp(escaped, "g"), to);
  }

  // Ensure a light background for PDF capture.
  if (!/<base\s/i.test(html)) {
    html = html.replace(
      /<head([^>]*)>/i,
      `<head$1><base href="${PORTAL_ORIGIN}/" />`
    );
  }

  return { success: true, html, invoiceLink: url };
}
