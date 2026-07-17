import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import ActivityLog from "@/lib/models/ActivityLog.model";

function utcStartOfDay(d) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}

function utcEndOfDay(d) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999));
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function GET(request) {
  try {
    if (!getRequestUser(request)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page"), 10) || 1);
    const limit = 50;
    const skip = (page - 1) * limit;
    const userQ = (searchParams.get("user") || "").trim();
    const type = (searchParams.get("type") || "all").trim();
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const filter = {};
    if (type && type !== "all") filter.type = type;
    if (from || to) {
      filter.createdAt = {};
      if (from) {
        const d = new Date(from);
        if (!Number.isNaN(d.getTime())) filter.createdAt.$gte = utcStartOfDay(d);
      }
      if (to) {
        const d = new Date(to);
        if (!Number.isNaN(d.getTime())) filter.createdAt.$lte = utcEndOfDay(d);
      }
    }
    if (userQ) {
      if (mongoose.Types.ObjectId.isValid(userQ)) {
        filter.user = new mongoose.Types.ObjectId(userQ);
      } else {
        filter.userName = new RegExp(escapeRegex(userQ), "i");
      }
    }

    const [items, total] = await Promise.all([
      ActivityLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("user", "name email")
        .lean(),
      ActivityLog.countDocuments(filter),
    ]);

    const logs = items.map((l) => ({
      id: l._id.toString(),
      userName: l.userName || l.user?.name || "System",
      userEmail: l.user?.email || "",
      action: l.action,
      resource: l.resource,
      resourceId: l.resourceId,
      details: l.details,
      type: l.type,
      ip: l.ip,
      createdAt: l.createdAt,
    }));

    return NextResponse.json({
      success: true,
      logs,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load activity log." },
      { status: 500 }
    );
  }
}
