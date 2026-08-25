import { NextResponse } from "next/server";
import { logActivity } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import { denyUnlessCapability } from "@/lib/denyCapability";
import ShippingZone from "@/lib/models/Shipping.model";
import { requestIp } from "@/lib/requestIp";

function normalizeZoneBody(body) {
  const name = String(body?.name || "").trim();
  const provinces = Array.isArray(body?.provinces)
    ? [...new Set(body.provinces.map((p) => String(p || "").trim()).filter(Boolean))]
    : [];
  const weightRanges = Array.isArray(body?.weightRanges)
    ? body.weightRanges.map((r) => ({
        minWeight: Math.max(0, Number(r?.minWeight) || 0),
        maxWeight: Math.max(0, Number(r?.maxWeight) || 0),
        price: Math.max(0, Number(r?.price) || 0),
      }))
    : [];
  const freeShipping = {
    enabled: false,
    threshold: 0,
  };
  return {
    name,
    provinces,
    isDefault: Boolean(body?.isDefault),
    status: ["active", "inactive"].includes(body?.status) ? body.status : "active",
    freeShipping,
    freeShippingThreshold: 0,
    weightRanges,
    sortOrder: Number.isFinite(Number(body?.sortOrder)) ? Number(body.sortOrder) : 0,
  };
}

export async function GET(request) {
  try {
    if (!getRequestUser(request)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const status = (searchParams.get("status") || "all").trim();
    const filter = {};
    if (status !== "all") filter.status = status;
    const zones = await ShippingZone.find(filter).sort({ sortOrder: 1, name: 1 }).lean();
    return NextResponse.json({ success: true, zones });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load zones." },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const user = getRequestUser(request);
    const denied = denyUnlessCapability(user, "canManageSettings");
    if (denied) return denied;
    await dbConnect();
    const body = await request.json().catch(() => ({}));
    const normalized = normalizeZoneBody(body);
    if (!normalized.name) {
      return NextResponse.json({ success: false, error: "Zone name is required." }, { status: 400 });
    }
    if (!normalized.weightRanges.length) {
      return NextResponse.json({ success: false, error: "At least one weight range is required." }, { status: 400 });
    }
    const zone = await ShippingZone.create(normalized);
    await logActivity({
      user: user.userId,
      userName: user.name || "Admin",
      action: `Shipping zone created: ${normalized.name}`,
      resource: "ShippingZone",
      resourceId: zone._id.toString(),
      type: "create",
      ip: requestIp(request),
    });
    return NextResponse.json({ success: true, zone: zone.toObject() });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Create failed." },
      { status: 500 }
    );
  }
}
