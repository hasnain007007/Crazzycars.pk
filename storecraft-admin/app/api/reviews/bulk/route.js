import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import Review from "@/lib/models/Review.model";

export async function POST(request) {
  try {
    const user = getRequestUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const body = await request.json().catch(() => ({}));
    const { action, ids } = body;

    if (!Array.isArray(ids) || !ids.length) {
      return NextResponse.json({ success: false, error: "No reviews selected" }, { status: 400 });
    }

    const objectIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(String(id))).map((id) => new mongoose.Types.ObjectId(String(id)));
    if (!objectIds.length) {
      return NextResponse.json({ success: false, error: "No valid ids" }, { status: 400 });
    }

    switch (action) {
      case "approve":
        await Review.updateMany({ _id: { $in: objectIds } }, { $set: { status: "approved" } });
        break;
      case "reject":
        await Review.updateMany({ _id: { $in: objectIds } }, { $set: { status: "rejected" } });
        break;
      case "delete":
        await Review.deleteMany({ _id: { $in: objectIds } });
        break;
      case "feature":
        await Review.updateMany({ _id: { $in: objectIds } }, { $set: { featured: true } });
        break;
      default:
        return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message || "Bulk action failed" }, { status: 500 });
  }
}
