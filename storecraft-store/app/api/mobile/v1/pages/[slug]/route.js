/**
 * GET /api/mobile/v1/pages/:slug
 */
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Page from "@/lib/models/Page.model";
import { mobileError } from "@/lib/mobile/response";

export const dynamic = "force-dynamic";

export async function GET(_request, context) {
  try {
    await dbConnect();
    const params = await context.params;
    const slug = String(params?.slug || "").trim();
    if (!slug) {
      return mobileError("VALIDATION_ERROR", "Invalid slug.", { status: 400 });
    }

    const page = await Page.findOne({ slug, status: "published" }).lean();
    if (!page) {
      return mobileError("NOT_FOUND", "Page not found.", { status: 404 });
    }

    return NextResponse.json({
      page: {
        id: String(page._id),
        title: page.title,
        slug: page.slug,
        content: page.content || "",
        template: page.template || "default",
        seo: page.seo || {},
      },
    });
  } catch (err) {
    console.error("[mobile/pages/slug]", err);
    return mobileError("INTERNAL_ERROR", "Failed to load page.", { status: 500 });
  }
}
