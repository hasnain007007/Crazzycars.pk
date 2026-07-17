import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import ProductOption from "@/lib/models/ProductOption.model";

const validStatuses = ["published", "draft", "active", "inactive"];
const normalizeStatus = (status) => {
  if (status === "active") return "published";
  if (status === "inactive") return "draft";
  if (["published", "draft"].includes(status)) return status;
  if (validStatuses.includes(status)) return status;
  return "published";
};

export async function GET(req) {
  try {
    const user = getRequestUser(req);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    await dbConnect();
    const options = await ProductOption.find({}).sort({ sortOrder: 1, createdAt: 1 }).lean();
    const normalizedOptions = options.map((o) => ({ ...o, status: normalizeStatus(o.status) }));
    return NextResponse.json({ success: true, options: normalizedOptions });
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const user = getRequestUser(req);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    await dbConnect();
    const body = await req.json();
    if (!body.name || !body.name.trim()) {
      return NextResponse.json({ success: false, error: "Name is required" }, { status: 400 });
    }
    const status = normalizeStatus(body.status);
    const option = await ProductOption.create({
      name: body.name.trim(),
      trackInventory: body.trackInventory ?? true,
      status,
      sortOrder: Number(body.sortOrder) || 0,
    });
    return NextResponse.json({ success: true, option });
  } catch (e) {
    console.error("POST product-options error:", e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
