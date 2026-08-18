/**
 * Customer account ledger (shopkeeper AR).
 * GET /api/customers/[id]/ledger?from=&to=
 * GET /api/customers/[id]/ar — outstanding + open bills
 */
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import Customer from "@/lib/models/Customer.model";
import { buildCustomerLedger, getCustomerArSummary } from "@/lib/customerAr";

export async function GET(request, context) {
  try {
    if (!getRequestUser(request)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid customer id." }, { status: 400 });
    }

    await dbConnect();
    const customer = await Customer.findById(id).lean();
    if (!customer) {
      return NextResponse.json({ success: false, error: "Customer not found." }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("mode") || "ledger";
    const from = searchParams.get("from") || "";
    const to = searchParams.get("to") || "";

    if (mode === "ar" || mode === "summary") {
      const ar = await getCustomerArSummary(id, customer);
      return NextResponse.json({
        success: true,
        customer: {
          id: String(customer._id),
          name: customer.name,
          phone: customer.phone || "",
          email: customer.email || "",
        },
        ar,
      });
    }

    const ledger = await buildCustomerLedger(id, customer, { from: from || undefined, to: to || undefined });
    return NextResponse.json({
      success: true,
      customer: {
        id: String(customer._id),
        name: customer.name,
        phone: customer.phone || "",
        email: customer.email || "",
      },
      from: from || null,
      to: to || null,
      ...ledger,
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e.message || "Could not load ledger." },
      { status: 500 }
    );
  }
}
