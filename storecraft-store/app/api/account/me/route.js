import { NextResponse } from "next/server";
import { customerForStorefront } from "@/lib/customerSerialize";
import { dbConnect } from "@/lib/db";
import Customer from "@/lib/models/Customer.model";
import { readStoreCustomerTokenFromRequest } from "@/lib/storeAuth";

export async function GET(request) {
  try {
    const session = readStoreCustomerTokenFromRequest(request);
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    await dbConnect();
    const c = await Customer.findById(session.customerId).select("-passwordHash").lean();
    if (!c || c.isActive === false) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({
      success: true,
      customer: {
        ...customerForStorefront(c),
        address: c.address || {},
      },
    });
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message || "Failed." }, { status: 500 });
  }
}
