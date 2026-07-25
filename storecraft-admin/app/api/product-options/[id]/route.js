import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import { denyUnlessMinRole } from "@/lib/requireRole";
import ProductOption from "@/lib/models/ProductOption.model";

const validStatuses = ["published", "draft", "active", "inactive"];
const normalizeStatus = (status) => {
  if (status === "active") return "published";
  if (status === "inactive") return "draft";
  if (["published", "draft"].includes(status)) return status;
  if (validStatuses.includes(status)) return status;
  return "published";
};

export async function GET(req, { params }) {
  try {
    const user = getRequestUser(req);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid id." }, { status: 400 });
    }
    await dbConnect();
    const option = await ProductOption.findById(id).lean();
    if (!option) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, option: { ...option, status: normalizeStatus(option.status) } });
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  try {
    const user = getRequestUser(req);
    const denied = denyUnlessMinRole(user, "editor");
    if (denied) return denied;
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid id." }, { status: 400 });
    }
    await dbConnect();
    const body = await req.json();
    if (!body.name?.trim()) {
      return NextResponse.json({ success: false, error: "Name is required" }, { status: 400 });
    }
    const status = normalizeStatus(body.status);
    const option = await ProductOption.findByIdAndUpdate(
      id,
      {
        name: body.name.trim(),
        trackInventory: body.trackInventory ?? true,
        status,
        sortOrder: Number(body.sortOrder) || 0,
      },
      { new: true, runValidators: true }
    );
    if (!option) {
      return NextResponse.json({ success: false, error: "Option not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, option });
  } catch (e) {
    console.error("PUT product-option error:", e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const user = getRequestUser(req);
    const denied = denyUnlessMinRole(user, "editor");
    if (denied) return denied;
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid id." }, { status: 400 });
    }
    await dbConnect();
    const deleted = await ProductOption.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json({ success: false, error: "Option not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: "Deleted successfully" });
  } catch (e) {
    console.error("DELETE product-option error:", e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
