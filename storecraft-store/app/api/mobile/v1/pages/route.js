/**
 * GET /api/mobile/v1/catalog/pages
 * Published pages list. Useful for legal/info pages in the mobile app.
 */
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Page from "@/lib/models/Page.model";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await dbConnect();
    const pages = await Page.find({ status: "published" })
      .select("title slug template showInNav showInFooter sortOrder")
      .sort({ sortOrder: 1, createdAt: 1 })
      .lean();

    return NextResponse.json({
      pages: pages.map((p) => ({
        id: String(p._id),
        title: p.title,
        slug: p.slug,
        template: p.template || "default",
        showInNav: Boolean(p.showInNav),
        showInFooter: Boolean(p.showInFooter),
      })),
    });
  } catch (err) {
    console.error("[mobile/catalog/pages]", err);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Failed to load pages." } }, { status: 500 });
  }
}
