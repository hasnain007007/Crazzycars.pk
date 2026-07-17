import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Page from "@/lib/models/Page.model";

export async function GET(req, { params }) {
  try {
    await dbConnect();
    const page = await Page.findOne({
      slug: String(params.slug),
      status: "published",
    }).lean();

    if (!page) {
      return NextResponse.json({ success: false, error: "Page not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, page });
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
