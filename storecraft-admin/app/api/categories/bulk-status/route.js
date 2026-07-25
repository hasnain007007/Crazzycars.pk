import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import { denyUnlessMinRole } from "@/lib/requireRole";
import Category from "@/lib/models/Category.model";

const ALLOWED = new Set(["active", "inactive", "draft"]);

function buildStatusUpdate(status) {
  if (status === "active") {
    return {
      status: "active",
      showInNav: true,
    };
  }
  return {
    status,
    showInNav: false,
    showOnHomepage: false,
    showInFooter: false,
  };
}

/** PATCH /api/categories/bulk-status — set status on many categories at once. */
export async function PATCH(request) {
  try {
    const user = getRequestUser(request);
    const denied = denyUnlessMinRole(user, "editor");
    if (denied) return denied;

    const body = await request.json();
    const status = String(body.status || "").trim().toLowerCase();
    const rawIds = Array.isArray(body.ids) ? body.ids : [];

    if (!ALLOWED.has(status)) {
      return NextResponse.json(
        { success: false, error: "status must be active, inactive, or draft." },
        { status: 400 }
      );
    }

    const ids = [...new Set(rawIds.map((id) => String(id || "").trim()).filter(Boolean))].filter((id) =>
      mongoose.Types.ObjectId.isValid(id)
    );

    if (!ids.length) {
      return NextResponse.json({ success: false, error: "No valid category ids provided." }, { status: 400 });
    }

    await dbConnect();

    const result = await Category.updateMany(
      { _id: { $in: ids.map((id) => new mongoose.Types.ObjectId(id)) } },
      { $set: buildStatusUpdate(status) }
    );

    return NextResponse.json({
      success: true,
      status,
      matched: result.matchedCount,
      modified: result.modifiedCount,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Bulk status update failed." },
      { status: 500 }
    );
  }
}
