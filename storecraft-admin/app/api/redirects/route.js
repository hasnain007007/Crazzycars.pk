import { NextResponse } from "next/server";
import { logActivity } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import Redirect from "@/lib/models/Redirect.model";
import { normalizeFromPath, normalizeToPath } from "@/lib/redirectPaths";
import { requestIp } from "@/lib/requestIp";

export async function GET(request) {
  try {
    if (!getRequestUser(request)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    await dbConnect();
    const rows = await Redirect.find().sort({ updatedAt: -1 }).lean();
    const redirects = rows.map((r) => ({
      id: r._id.toString(),
      fromPath: r.fromPath,
      toPath: r.toPath,
      type: r.type,
      updatedAt: r.updatedAt,
    }));
    return NextResponse.json({ success: true, redirects });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load redirects." },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const user = getRequestUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    await dbConnect();
    const body = await request.json();
    const fromPath = normalizeFromPath(body.fromPath);
    const toPath = normalizeToPath(body.toPath);
    if (fromPath === "/") {
      return NextResponse.json({ success: false, error: "Invalid from path." }, { status: 400 });
    }
    if (!toPath) {
      return NextResponse.json({ success: false, error: "To path is required." }, { status: 400 });
    }
    const type = Number(body.type) === 302 ? 302 : 301;
    const doc = await Redirect.create({ fromPath, toPath, type });
    await logActivity({
      user: user.userId,
      userName: user.name || "Admin",
      action: `Redirect created: ${fromPath} → ${toPath}`,
      resource: "Redirect",
      resourceId: doc._id.toString(),
      type: "create",
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
      { success: false, error: error.message || "Create failed." },
      { status: 500 }
    );
  }
}
