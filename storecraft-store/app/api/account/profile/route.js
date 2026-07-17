import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import Customer from "@/lib/models/Customer.model";
import { readStoreCustomerTokenFromRequest } from "@/lib/storeAuth";

export async function PUT(request) {
  try {
    const session = readStoreCustomerTokenFromRequest(request);
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    await dbConnect();
    const doc = await Customer.findById(session.customerId).select("+passwordHash");
    if (!doc || doc.isActive === false) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    if (body.name !== undefined) doc.name = String(body.name || "").trim();
    if (body.phone !== undefined) doc.phone = String(body.phone || "").trim();
    if (body.address && typeof body.address === "object") {
      doc.address = {
        street: String(body.address.street || "").trim(),
        city: String(body.address.city || "").trim(),
        state: String(body.address.state || "").trim(),
        country: String(body.address.country || "").trim(),
        zip: String(body.address.zip || "").trim(),
      };
    }
    const pwd = String(body.password || "").trim();
    if (pwd) {
      if (pwd.length < 8) {
        return NextResponse.json({ success: false, error: "Password must be at least 8 characters." }, { status: 400 });
      }
      doc.passwordHash = await hashPassword(pwd);
    }
    await doc.save();

    const lean = await Customer.findById(doc._id).select("-passwordHash").lean();
    return NextResponse.json({
      success: true,
      customer: {
        id: lean._id.toString(),
        name: lean.name,
        email: lean.email,
        phone: lean.phone || "",
        address: lean.address || {},
      },
    });
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message || "Update failed." }, { status: 500 });
  }
}
