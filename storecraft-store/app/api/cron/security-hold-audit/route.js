/**
 * GET /api/cron/security-hold-audit — assert security-held SKUs stay off the storefront.
 * Auth: Authorization: Bearer $CRON_SECRET
 *
 * On breach: HTTP 409 + structured body + email to info@crazzycars.pk
 * (silent reactivation of a held SKU must not go unnoticed).
 */
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Product from "@/lib/models/Product.model";
import { sendEmail } from "@/lib/email";
import { STORE_CONTACT_EMAIL } from "@/lib/storeContact";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const ALERT_TO = STORE_CONTACT_EMAIL || "info@crazzycars.pk";

function resolveCronSecret() {
  return String(process.env.CRON_SECRET || process.env.REVALIDATE_SECRET || "").trim();
}

function authorized(request) {
  const secret = resolveCronSecret();
  if (!secret) return false;
  const header = request.headers.get("authorization") || "";
  return header === `Bearer ${secret}`;
}

function breachRowsHtml(breaches) {
  const rows = breaches
    .map((p) => {
      const sku = String(p.articleNo || "").replace(/</g, "&lt;");
      const name = String(p.name || "").replace(/</g, "&lt;");
      const slug = String(p.slug || "").replace(/</g, "&lt;");
      const reason = String(p.securityHoldReason || "—").replace(/</g, "&lt;");
      const id = String(p._id || "");
      const adminHref = id
        ? `https://admin.crazzycars.pk/catalog/products/${id}`
        : "https://admin.crazzycars.pk/catalog/products";
      return `<tr>
        <td style="padding:8px;border:1px solid #e5e7eb;font-family:monospace">${sku}</td>
        <td style="padding:8px;border:1px solid #e5e7eb">${name}<br><span style="color:#6b7280;font-size:12px">${slug}</span></td>
        <td style="padding:8px;border:1px solid #e5e7eb;font-size:13px">${reason}</td>
        <td style="padding:8px;border:1px solid #e5e7eb"><a href="${adminHref}">Admin catalog</a></td>
      </tr>`;
    })
    .join("");
  return `<table style="border-collapse:collapse;width:100%;font-size:14px">
    <thead><tr style="background:#fef2f2">
      <th style="padding:8px;border:1px solid #e5e7eb;text-align:left">SKU</th>
      <th style="padding:8px;border:1px solid #e5e7eb;text-align:left">Product</th>
      <th style="padding:8px;border:1px solid #e5e7eb;text-align:left">Hold reason</th>
      <th style="padding:8px;border:1px solid #e5e7eb;text-align:left">Link</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

async function sendBreachEmail(breaches, checkedAt) {
  const count = breaches.length;
  const subject = `[CrazzyCars] Security hold breach: ${count} held SKU(s) are ACTIVE`;
  const listText = breaches
    .map((p) => `- ${p.articleNo || "?"} | ${p.slug || "?"} | ${p.name || ""}`)
    .join("\n");
  const html = `
    <div style="font-family:system-ui,sans-serif;line-height:1.5;color:#111">
      <h2 style="color:#b91c1c;margin:0 0 12px">Security hold breach</h2>
      <p><strong>${count}</strong> product(s) have <code>securityHold=true</code> but <code>status=active</code>.
      They may be visible on the storefront until fixed.</p>
      <p style="color:#6b7280;font-size:13px">Checked at ${checkedAt}</p>
      ${breachRowsHtml(breaches)}
      <p style="margin-top:16px">Set status back to <strong>draft</strong> (or clear the hold as owner only if intentional).</p>
      <pre style="background:#f9fafb;padding:12px;font-size:12px;overflow:auto">${listText.replace(/</g, "&lt;")}</pre>
    </div>
  `;
  return sendEmail({ to: ALERT_TO, subject, html });
}

export async function GET(request) {
  try {
    if (!authorized(request)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const breaches = await Product.find({
      securityHold: true,
      status: "active",
    })
      .select("articleNo slug name status securityHold securityHoldReason updatedAt")
      .lean();

    const heldDraftCount = await Product.countDocuments({
      securityHold: true,
      status: { $ne: "active" },
    });

    const checkedAt = new Date().toISOString();

    if (breaches.length) {
      console.error(
        "[security-hold-audit] BREACH",
        breaches.map((p) => ({
          articleNo: p.articleNo,
          slug: p.slug,
          status: p.status,
        }))
      );

      let email = { success: false, skipped: true };
      try {
        email = await sendBreachEmail(breaches, checkedAt);
        if (!email?.success) {
          console.error("[security-hold-audit] email failed:", email?.error || email);
        }
      } catch (err) {
        console.error("[security-hold-audit] email error:", err?.message || err);
        email = { success: false, error: err?.message || String(err) };
      }

      return NextResponse.json(
        {
          success: false,
          alert: true,
          message: `${breaches.length} security-held product(s) are active on the storefront`,
          breaches: breaches.map((p) => ({
            articleNo: p.articleNo || "",
            slug: p.slug || "",
            name: p.name || "",
            status: p.status,
            securityHoldReason: p.securityHoldReason || "",
            updatedAt: p.updatedAt,
          })),
          emailSent: Boolean(email?.success),
          emailTo: ALERT_TO,
          emailError: email?.success ? undefined : email?.error || undefined,
          heldDraftCount,
          checkedAt,
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      alert: false,
      breaches: [],
      heldDraftCount,
      checkedAt,
    });
  } catch (error) {
    console.error("[security-hold-audit]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Audit failed" },
      { status: 500 }
    );
  }
}
