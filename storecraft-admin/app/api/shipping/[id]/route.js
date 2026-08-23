import { NextResponse } from "next/server";
import mongoose from "mongoose";
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
  const fsEnabled = Boolean(body?.freeShipping?.enabled);
  const fsThreshold = Math.max(0, Number(body?.freeShipping?.threshold) || 0);
  const freeShipping = {
    enabled: fsEnabled,
    threshold: fsThreshold,
  };
  const legacyThreshold =
    body?.freeShippingThreshold !== undefined && body?.freeShippingThreshold !== null
      ? Math.max(0, Number(body.freeShippingThreshold) || 0)
      : fsEnabled
        ? fsThreshold
        : 0;
  return {
    name,
    provinces,
    isDefault: Boolean(body?.isDefault),
    status: ["active", "inactive"].includes(body?.status) ? body.status : "active",
    freeShipping,
    freeShippingThreshold: legacyThreshold,
    weightRanges,
    sortOrder: Number.isFinite(Number(body?.sortOrder)) ? Number(body.sortOrder) : 0,
  };
}

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
    const doc = await ShippingZone.findById(id).lean();
    if (!doc) return NextResponse.json({ success: false, error: "Not found." }, { status: 404 });
    return NextResponse.json({ success: true, zone: doc });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load zone." },
      { status: 500 }
    );
  }
}

export async function PUT(request, context) {
  try {
    const user = getRequestUser(request);
    const denied = denyUnlessCapability(user, "canManageSettings");
    if (denied) return denied;
    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid id." }, { status: 400 });
    }
    await dbConnect();
    const body = await request.json().catch(() => ({}));
    const normalized = normalizeZoneBody(body);
    if (!normalized.name) {
      return NextResponse.json({ success: false, error: "Zone name is required." }, { status: 400 });
    }
    if (!normalized.weightRanges.length) {
      return NextResponse.json({ success: false, error: "At least one weight range is required." }, { status: 400 });
    }
    const zone = await ShippingZone.findByIdAndUpdate(id, normalized, { new: true }).lean();
    if (!zone) return NextResponse.json({ success: false, error: "Not found." }, { status: 404 });
    await logActivity({
      user: user.userId,
      userName: user.name || "Admin",
      action: `Shipping zone updated: ${normalized.name}`,
      resource: "ShippingZone",
      resourceId: id,
      type: "update",
      ip: requestIp(request),
    });
    return NextResponse.json({ success: true, zone });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Update failed." },
      { status: 500 }
    );
  }
}

export async function DELETE(request, context) {
  try {
    const user = getRequestUser(request);
    const denied = denyUnlessCapability(user, "canManageSettings");
    if (denied) return denied;
    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid id." }, { status: 400 });
    }
    await dbConnect();
    const doc = await ShippingZone.findById(id).lean();
    if (!doc) return NextResponse.json({ success: false, error: "Not found." }, { status: 404 });
    await ShippingZone.deleteOne({ _id: id });
    await logActivity({
      user: user.userId,
      userName: user.name || "Admin",
      action: `Shipping zone deleted: ${doc.name || id}`,
      resource: "ShippingZone",
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
