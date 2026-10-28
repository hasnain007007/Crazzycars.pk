/**
 * Shared CrazzyCars.pk transactional email shell.
 * Inline styles only — email clients strip classes / most CSS.
 */

export const EMAIL_BRAND = {
  storeName: "CrazzyCars.pk",
  tagline: "Premium car accessories · Pakistan",
  siteUrl: "https://crazzycars.pk",
  adminUrl: "https://admin.crazzycars.pk",
  logoUrl: "https://crazzycars.pk/media/brand/crazzycars-logo.webp",
  supportEmail: "info@crazzycars.pk",
  whatsappDisplay: "0328 4010007",
  whatsappUrl: "https://wa.me/923284010007",
  trackUrl: "https://crazzycars.pk/track-order",
  red: "#D72323",
  black: "#111111",
  muted: "#6B7280",
  border: "#E5E7EB",
  bg: "#F3F4F6",
  card: "#F9FAFB",
};

export function getEmailBrand(overrides = {}) {
  const site =
    String(
      overrides.siteUrl ||
        process.env.NEXT_PUBLIC_APP_URL ||
        process.env.NEXT_PUBLIC_SITE_URL ||
        process.env.NEXT_PUBLIC_STORE_URL ||
        EMAIL_BRAND.siteUrl
    ).replace(/\/$/, "") || EMAIL_BRAND.siteUrl;

  const support =
    String(
      overrides.supportEmail ||
        process.env.REPLY_TO_EMAIL ||
        process.env.CONTACT_EMAIL ||
        EMAIL_BRAND.supportEmail
    ).trim() || EMAIL_BRAND.supportEmail;

  const storeName =
    String(
      overrides.storeName ||
        process.env.FROM_NAME ||
        process.env.NEXT_PUBLIC_STORE_NAME ||
        EMAIL_BRAND.storeName
    ).trim() || EMAIL_BRAND.storeName;

  const waRaw = String(overrides.whatsapp || process.env.NEXT_PUBLIC_WHATSAPP || "").replace(/\D/g, "");
  const waDigits = waRaw.length >= 10 ? waRaw : "923284010007";
  const waLocal = waDigits.startsWith("92") ? `0${waDigits.slice(2)}` : waDigits;

  return {
    ...EMAIL_BRAND,
    ...overrides,
    storeName,
    siteUrl: site,
    supportEmail: support,
    logoUrl: overrides.logoUrl || EMAIL_BRAND.logoUrl,
    whatsappDisplay: overrides.whatsappDisplay || waLocal.replace(/(\d{4})(\d{3})(\d{4})/, "$1 $2 $3"),
    whatsappUrl: `https://wa.me/${waDigits}`,
    trackUrl: `${site}/track-order`,
  };
}

export function emailButton(href, label, { bg } = {}) {
  const brand = getEmailBrand();
  const color = bg || brand.black;
  return `<a href="${href}" style="display:inline-block;padding:14px 28px;background:${color};color:#ffffff;text-decoration:none;font-size:13px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;border-radius:4px;">${label}</a>`;
}

export function emailInfoCard(rows = []) {
  const brand = getEmailBrand();
  const body = rows
    .filter((r) => r && (r.value || r.value === 0))
    .map(
      (r) => `<tr>
      <td style="padding:6px 0;font-size:13px;color:${brand.muted};">${r.label}</td>
      <td style="padding:6px 0;font-size:13px;color:${brand.black};text-align:right;font-weight:${r.bold ? 700 : 500};">${r.value}</td>
    </tr>`
    )
    .join("");
  return `<div style="background:${brand.card};border:1px solid ${brand.border};border-radius:8px;padding:16px 18px;margin:0 0 20px;">
    <table style="width:100%;border-collapse:collapse;">${body}</table>
  </div>`;
}

/**
 * Wrap inner HTML (body fragment) in the branded CrazzyCars shell.
 * Pass prebuilt full HTML documents through unchanged.
 */
export function wrapEmailLayout(innerHtml, options = {}) {
  const inner = String(innerHtml || "").trim();
  if (!inner) return "";
  if (/<html[\s>]/i.test(inner)) return inner;

  const brand = getEmailBrand(options);
  const eyebrow = options.eyebrow || brand.tagline;
  const preheader = options.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;mso-hide:all;">${options.preheader}</div>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${brand.storeName}</title>
</head>
<body style="margin:0;padding:0;background:${brand.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  ${preheader}
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${brand.bg};padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid ${brand.border};">
          <tr>
            <td style="background:${brand.black};padding:28px 32px;text-align:center;">
              <a href="${brand.siteUrl}" style="text-decoration:none;">
                <img src="${brand.logoUrl}" alt="${brand.storeName}" width="160" style="display:inline-block;max-width:160px;height:auto;border:0;" />
              </a>
              <p style="margin:12px 0 0;color:${brand.red};font-size:11px;letter-spacing:0.14em;text-transform:uppercase;font-weight:700;">
                ${brand.storeName}
              </p>
              <p style="margin:6px 0 0;color:rgba(255,255,255,0.55);font-size:11px;letter-spacing:0.04em;">
                ${eyebrow}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px;font-size:15px;line-height:1.65;color:#1F2937;">
              ${inner}
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 24px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${brand.card};border:1px solid ${brand.border};border-radius:8px;">
                <tr>
                  <td style="padding:16px 18px;text-align:center;font-size:13px;color:${brand.muted};line-height:1.7;">
                    Need help? Reply to this email or WhatsApp
                    <a href="${brand.whatsappUrl}" style="color:${brand.red};font-weight:700;text-decoration:none;">${brand.whatsappDisplay}</a><br/>
                    <a href="${brand.trackUrl}" style="color:${brand.black};font-weight:600;text-decoration:underline;">Track your order</a>
                    &nbsp;·&nbsp;
                    <a href="mailto:${brand.supportEmail}" style="color:${brand.black};font-weight:600;text-decoration:underline;">${brand.supportEmail}</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background:${brand.black};padding:20px 32px;text-align:center;">
              <p style="margin:0;color:rgba(255,255,255,0.55);font-size:11px;line-height:1.7;">
                &copy; ${new Date().getFullYear()} ${brand.storeName}. All rights reserved.<br/>
                Nationwide COD · Pakistan
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
