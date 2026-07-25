import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { logActivity } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import { denyUnlessMinRole } from "@/lib/requireRole";
import Redirect from "@/lib/models/Redirect.model";
import { normalizeFromPath, normalizeToPath } from "@/lib/redirectPaths";
import { requestIp } from "@/lib/requestIp";

export async function GET(request, context) {
  try {
    if (!getRequestUser(request)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid id." }, { status: 400 });
    }
    await dbConnect();
    const doc = await Redirect.findById(id).lean();
    if (!doc) return NextResponse.json({ success: false, error: "Not found." }, { status: 404 });
    return NextResponse.json({ success: true, redirect: doc });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load redirect." },
      { status: 500 }
    );
  }
}

export async function PUT(request, context) {
  try {
    const user = getRequestUser(request);
    const denied = denyUnlessMinRole(user, "editor");
    if (denied) return denied;
    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid id." }, { status: 400 });
    }
    await dbConnect();
    const doc = await Redirect.findById(id);
    if (!doc) return NextResponse.json({ success: false, error: "Not found." }, { status: 404 });
    const body = await request.json();

    if (body.fromPath !== undefined) {
      const fp = normalizeFromPath(body.fromPath);
      if (fp === "/") {
        return NextResponse.json({ success: false, error: "Invalid from path." }, { status: 400 });
      }
      doc.fromPath = fp;
    }
    if (body.toPath !== undefined) {
      doc.toPath = normalizeToPath(body.toPath);
    }
    if (body.type !== undefined) {
      doc.type = Number(body.type) === 302 ? 302 : 301;
    }

    await doc.save();
    await logActivity({
      user: user.userId,
      userName: user.name || "Admin",
      action: `Redirect updated: ${doc.fromPath}`,
      resource: "Redirect",
      resourceId: id,
      type: "update",
      ip: requestIp(request),
    });
    return NextResponse.json({ success: true, redirect: doc.toObject() });
  } catch (error) {
    if (error.code === 11000) {
      return NextResponse.json(
        { success: false, error: "A redirect for this path already exists." },
        { status: 400 }
      );
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
    const denied = denyUnlessMinRole(user, "editor");
    if (denied) return denied;
    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid id." }, { status: 400 });
    }
    await dbConnect();
    const doc = await Redirect.findById(id);
    if (!doc) return NextResponse.json({ success: false, error: "Not found." }, { status: 404 });
    await Redirect.deleteOne({ _id: id });
    await logActivity({
      user: user.userId,
      userName: user.name || "Admin",
      action: `Redirect deleted: ${doc.fromPath}`,
      resource: "Redirect",
      resourceId: id,
      type: "delete",
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
