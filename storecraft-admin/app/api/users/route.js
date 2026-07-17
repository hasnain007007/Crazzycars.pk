import { NextResponse } from "next/server";
import { hashPassword, logActivity } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import { isSuperadmin, requireAuth } from "@/lib/requireRole";
import User from "@/lib/models/User.model";
import { requestIp } from "@/lib/requestIp";

export async function GET(request) {
  try {
    const user = getRequestUser(request);
    if (!requireAuth(user)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    await dbConnect();
    const rows = await User.find({}).select("-password").sort({ createdAt: -1 }).lean();
    const users = rows.map((u) => ({
      id: u._id.toString(),
      name: u.name,
      email: u.email,
      role: u.role,
      status: u.status,
      lastLogin: u.lastLogin,
      createdAt: u.createdAt,
    }));
    return NextResponse.json({ success: true, users });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load users." },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const user = getRequestUser(request);
    if (!requireAuth(user)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (!isSuperadmin(user)) {
      return NextResponse.json({ success: false, error: "Superadmin only." }, { status: 403 });
    }
    await dbConnect();
    const body = await request.json();
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const role = ["superadmin", "admin", "editor", "viewer"].includes(body.role) ? body.role : "editor";
    if (!name || !email || !password) {
      return NextResponse.json(
        { success: false, error: "Name, email, and password are required." },
        { status: 400 }
      );
    }
    const hash = await hashPassword(password);
    const doc = await User.create({
      name,
      email,
      password: hash,
      role,
      status: body.status === "inactive" ? "inactive" : "active",
    });
    await logActivity({
      user: user.userId,
      userName: user.name || "Admin",
      action: `User created: ${email}`,
      resource: "User",
      resourceId: doc._id.toString(),
      type: "user",
      ip: requestIp(request),
    });
    const lean = await User.findById(doc._id).select("-password").lean();
    return NextResponse.json({ success: true, user: lean });
  } catch (error) {
    if (error.code === 11000) {
      return NextResponse.json({ success: false, error: "Email already in use." }, { status: 400 });
    }
    return NextResponse.json(
      { success: false, error: error.message || "Create failed." },
      { status: 500 }
    );
  }
}
