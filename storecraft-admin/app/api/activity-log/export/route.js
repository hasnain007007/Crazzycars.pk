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

function cell(v) {
  const s = String(v ?? "");
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(request) {
  try {
    if (!getRequestUser(request)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    await dbConnect();
    const { searchParams } = new URL(request.url);
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

    const rows = await ActivityLog.find(filter).sort({ createdAt: -1 }).limit(10000).lean();
    const header = ["User", "Action", "Resource", "Resource ID", "Type", "Details", "IP", "Date"];
    const lines = [header.join(",")];
    for (const l of rows) {
      lines.push(
        [
          cell(l.userName),
          cell(l.action),
          cell(l.resource),
          cell(l.resourceId),
          cell(l.type),
          cell(typeof l.details === "object" ? JSON.stringify(l.details) : l.details),
          cell(l.ip),
          cell(l.createdAt ? new Date(l.createdAt).toISOString() : ""),
        ].join(",")
      );
    }
    const csv = lines.join("\r\n");
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="activity-log.csv"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Export failed." },
      { status: 500 }
    );
  }
}
