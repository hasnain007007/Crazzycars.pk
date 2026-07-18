import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import Page from "@/lib/models/Page.model";

function toSlug(input = "") {
  return String(input)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export async function GET(req) {
  try {
    if (!getRequestUser(req)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    await dbConnect();
    const pages = await Page.find({}).sort({ sortOrder: 1, createdAt: -1 }).lean();
    return NextResponse.json({ success: true, pages, count: pages.length });
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    if (!getRequestUser(req)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    await dbConnect();
    const body = await req.json();
    if (!body.slug && body.title) {
      body.slug = toSlug(body.title);
    }
    const page = await Page.create(body);
    return NextResponse.json({ success: true, page });
  } catch (e) {
    console.error("Create page error:", e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
