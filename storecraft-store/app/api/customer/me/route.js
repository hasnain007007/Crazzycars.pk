import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Customer from "@/lib/models/Customer.model";
import { serializeAddress, pickDefaultAddress, toLegacySingularAddress } from "@/lib/addressBook";
import jwt from "jsonwebtoken";

export async function GET(req) {
  try {
    const token =
      req.cookies.get("customer_token")?.value ||
      req.cookies.get("store_token")?.value;

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: "Not authenticated",
        },
        { status: 401 }
      );
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (e) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid token",
        },
        { status: 401 }
      );
    }

    const customerId = decoded.customerId || decoded.sub;
    if (!customerId || decoded.type !== "store_customer") {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid token",
        },
        { status: 401 }
      );
    }

    await dbConnect();

    const customer = await Customer.findById(customerId).select("-password -passwordHash").lean();

    if (!customer) {
      return NextResponse.json(
        {
          success: false,
          error: "Customer not found",
        },
        { status: 404 }
      );
    }

    const addresses = (customer.addresses || []).map(serializeAddress).filter(Boolean);
    const def = pickDefaultAddress(addresses);
    const address = customer.address || (def ? toLegacySingularAddress(def) : null);

    return NextResponse.json({
      success: true,
      customer: {
        id: String(customer._id),
        firstName: customer.firstName,
        lastName: customer.lastName,
        name: customer.name || [customer.firstName, customer.lastName].filter(Boolean).join(" "),
        email: customer.email,
        phone: customer.phone || "",
        address,
        addresses,
        createdAt: customer.createdAt,
      },
    });
  } catch (e) {
    console.error("Me route error:", e);
    return NextResponse.json(
      {
        success: false,
        error: e.message,
      },
      { status: 500 }
    );
  }
}
