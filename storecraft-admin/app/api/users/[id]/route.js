import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { hashPassword, logActivity } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import { isSuperadmin, requireAuth } from "@/lib/requireRole";
import User from "@/lib/models/User.model";
import { requestIp } from "@/lib/requestIp";

export async function GET(request, context) {
  try {
    const user = getRequestUser(request);
    if (!requireAuth(user)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid id." }, { status: 400 });
    }
    await dbConnect();
    const doc = await User.findById(id).select("-password").lean();
    if (!doc) return NextResponse.json({ success: false, error: "Not found." }, { status: 404 });
    return NextResponse.json({ success: true, user: doc });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load user." },
      { status: 500 }
    );
  }
}

export async function PUT(request, context) {
  try {
    const user = getRequestUser(request);
    if (!requireAuth(user)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (!isSuperadmin(user)) {
      return NextResponse.json({ success: false, error: "Superadmin only." }, { status: 403 });
    }
    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid id." }, { status: 400 });
    }
    await dbConnect();
    const doc = await User.findById(id);
    if (!doc) return NextResponse.json({ success: false, error: "Not found." }, { status: 404 });

    const self = String(user.userId) === id;
    const body = await request.json();

    if (self && body.status === "inactive") {
      return NextResponse.json(
        { success: false, error: "You cannot deactivate your own account." },
        { status: 400 }
      );
    }
    if (self && body.role !== undefined && body.role !== doc.role) {
      return NextResponse.json(
        { success: false, error: "You cannot change your own role." },
        { status: 400 }
      );
    }

    if (body.name !== undefined) doc.name = String(body.name || "").trim();
    if (body.email !== undefined) doc.email = String(body.email || "").trim().toLowerCase();
    if (!self && body.role !== undefined && ["superadmin", "admin", "editor", "viewer"].includes(body.role)) {
      doc.role = body.role;
    }
    if (body.status !== undefined) doc.status = body.status === "inactive" ? "inactive" : "active";

    const pwd = String(body.password || "").trim();
    if (pwd) {
      doc.password = await hashPassword(pwd);
    }

    await doc.save();
    await logActivity({
      user: user.userId,
      userName: user.name || "Admin",
      action: `User updated: ${doc.email}`,
      resource: "User",
      resourceId: id,
      type: "user",
      ip: requestIp(request),
    });
    const lean = await User.findById(id).select("-password").lean();
    return NextResponse.json({ success: true, user: lean });
  } catch (error) {
    if (error.code === 11000) {
      return NextResponse.json({ success: false, error: "Email already in use." }, { status: 400 });
    }
    return NextResponse.json(
      { success: false, error: error.message || "Update failed." },
      { status: 500 }
    );
  }
}

export async function DELETE(request, context) {
  try {
    const user = getRequestUser(request);
    if (!requireAuth(user)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (!isSuperadmin(user)) {
      return NextResponse.json({ success: false, error: "Superadmin only." }, { status: 403 });
    }
    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid id." }, { status: 400 });
    }
    if (String(user.userId) === id) {
      return NextResponse.json(
        { success: false, error: "You cannot delete your own account." },
        { status: 400 }
      );
    }
    await dbConnect();
    const doc = await User.findById(id);
    if (!doc) return NextResponse.json({ success: false, error: "Not found." }, { status: 404 });

    if (doc.role === "superadmin") {
      const superadmins = await User.countDocuments({ role: "superadmin", status: "active" });
      if (superadmins <= 1) {
        return NextResponse.json(
          { success: false, error: "Cannot delete the last superadmin." },
          { status: 400 }
        );
      }
    }

    await User.deleteOne({ _id: id });
    await logActivity({
      user: user.userId,
      userName: user.name || "Admin",
      action: `User deleted: ${doc.email}`,
      resource: "User",
      resourceId: id,
      type: "user",
      ip: requestIp(request),
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Delete failed." },
      { status: 500 }
    );
  }
}
