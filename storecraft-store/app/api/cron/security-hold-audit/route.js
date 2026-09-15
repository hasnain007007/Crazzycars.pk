/**
 * GET /api/cron/security-hold-audit — assert security-held SKUs stay off the storefront.
 * Auth: Authorization: Bearer $CRON_SECRET
 *
 * Alerts (HTTP 409 + structured body) when any product with securityHold=true
 * has status=active — a silent reactivation that would confuse customers.
 */
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Product from "@/lib/models/Product.model";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

function resolveCronSecret() {
  return String(process.env.CRON_SECRET || process.env.REVALIDATE_SECRET || "").trim();
}

function authorized(request) {
  const secret = resolveCronSecret();
  if (!secret) return false;
  const header = request.headers.get("authorization") || "";
  return header === `Bearer ${secret}`;
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

    if (breaches.length) {
      console.error(
        "[security-hold-audit] BREACH",
        breaches.map((p) => ({
          articleNo: p.articleNo,
          slug: p.slug,
          status: p.status,
        }))
      );
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
          heldDraftCount,
          checkedAt: new Date().toISOString(),
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      alert: false,
      breaches: [],
      heldDraftCount,
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[security-hold-audit]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Audit failed" },
      { status: 500 }
    );
  }
}
