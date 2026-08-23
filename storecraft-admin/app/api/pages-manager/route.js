import { NextResponse } from "next/server";
import { logActivity } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import { denyUnlessCapability } from "@/lib/denyCapability";
import Page from "@/lib/models/Page.model";
import { normalizeMetaKeywords } from "@/lib/seoKeywords";
import { slugify } from "@/lib/slugify";
import { requestIp } from "@/lib/requestIp";

async function uniqueSlug(base, excludeId) {
  const root = slugify(base) || "page";
  let slug = root;
  for (let i = 0; i < 5000; i += 1) {
    const q = { slug };
    if (excludeId) q._id = { $ne: excludeId };
    const exists = await Page.findOne(q).select("_id").lean();
    if (!exists) return slug;
    slug = `${root}-${i + 2}`;
  }
  throw new Error("Could not allocate slug.");
}

export async function GET(request) {
  try {
    if (!getRequestUser(request)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const status = (searchParams.get("status") || "all").trim();
    const filter = {};
    if (status !== "all") filter.status = status;
    const rows = await Page.find(filter).sort({ updatedAt: -1 }).lean();
    const pages = rows.map((p) => ({
      id: p._id.toString(),
      title: p.title,
      slug: p.slug,
      status: p.status,
      updatedAt: p.updatedAt,
    }));
    return NextResponse.json({ success: true, pages });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load pages." },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const user = getRequestUser(request);
    const denied = denyUnlessCapability(user, "canManageContent");
    if (denied) return denied;
    await dbConnect();
    const body = await request.json();
    const title = String(body.title || "").trim();
    if (!title) {
      return NextResponse.json({ success: false, error: "Title is required." }, { status: 400 });
    }
    const slug = await uniqueSlug(body.slug || title, null);
    const doc = await Page.create({
      title,
      slug,
      content: String(body.content || ""),
      status: ["draft", "published"].includes(body.status) ? body.status : "draft",
      showInFooter: Boolean(body.showInFooter),
      seo: {
        metaTitle: String(body.seo?.metaTitle || "").trim(),
        metaDescription: String(body.seo?.metaDescription || "").trim(),
        metaKeywords: normalizeMetaKeywords(body.seo?.metaKeywords),
      },
    });
    await logActivity({
      user: user.userId,
      userName: user.name || "Admin",
      action: `Page created: ${title}`,
      resource: "Page",
      resourceId: doc._id.toString(),
      type: "create",
      ip: requestIp(request),
    });
    return NextResponse.json({ success: true, page: doc.toObject() });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Create failed." },
      { status: 500 }
    );
  }
}
