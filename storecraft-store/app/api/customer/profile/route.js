import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/auth";
import { customerForStorefront } from "@/lib/customerSerialize";
import { dbConnect } from "@/lib/db";
import Customer from "@/lib/models/Customer.model";
import { readStoreCustomerTokenFromRequest } from "@/lib/storeAuth";

export async function PUT(req) {
  try {
    const session = readStoreCustomerTokenFromRequest(req);
    if (!session) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    await dbConnect();

    const doc = await Customer.findById(session.customerId).select("+passwordHash");
    if (!doc || doc.isActive === false) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (body.firstName !== undefined) doc.firstName = String(body.firstName || "").trim();
    if (body.lastName !== undefined) doc.lastName = String(body.lastName || "").trim();
    if (body.phone !== undefined) doc.phone = String(body.phone || "").trim();

    const pwd = String(body.password || "").trim();
    if (pwd) {
      if (pwd.length < 8) {
        return NextResponse.json(
          { success: false, error: "Password must be at least 8 characters." },
          { status: 400 }
        );
      }
      doc.passwordHash = await hashPassword(pwd);
    }

    await doc.save();

    const lean = await Customer.findById(doc._id).select("-passwordHash").lean();
    return NextResponse.json({
      success: true,
      customer: customerForStorefront(lean),
    });
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message || "Update failed" }, { status: 500 });
  }
}
