import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import { denyUnlessMinRole } from "@/lib/requireRole";
import Page from "@/lib/models/Page.model";

export async function GET(req, { params }) {
  try {
    if (!getRequestUser(req)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    await dbConnect();
    const { id } = await params;
    const page = await Page.findById(id).lean();
    if (!page) {
      return NextResponse.json({ success: false, error: "Page not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, page });
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  try {
    const user = getRequestUser(req);
    const denied = denyUnlessMinRole(user, "editor");
    if (denied) return denied;
    await dbConnect();
    const { id } = await params;
    const body = await req.json();
    const page = await Page.findByIdAndUpdate(id, body, { new: true }).lean();
    if (!page) {
      return NextResponse.json({ success: false, error: "Page not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, page });
  } catch (e) {
    console.error("Update page error:", e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const user = getRequestUser(req);
    const denied = denyUnlessMinRole(user, "editor");
    if (denied) return denied;
    await dbConnect();
    const { id } = await params;
    await Page.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Delete page error:", e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
