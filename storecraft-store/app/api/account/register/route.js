import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import Customer from "@/lib/models/Customer.model";
import { setStoreCustomerAuthCookie, signStoreCustomerToken } from "@/lib/storeAuth";

function splitName(full) {
  const name = String(full || "").trim();
  const parts = name.split(/\s+/);
  const firstName = parts[0] || name;
  const lastName = parts.slice(1).join(" ") || "";
  return { firstName, lastName, name };
}

export async function POST(request) {
  try {
    await dbConnect();
    const body = await request.json().catch(() => ({}));
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const phone = String(body.phone || "").trim();
    if (!name || !email || password.length < 8) {
      return NextResponse.json(
        { success: false, error: "Name, email, and password (8+ chars) are required." },
        { status: 400 }
      );
    }

    const exists = await Customer.findOne({ email }).select("+passwordHash").lean();
    if (exists?.passwordHash) {
      return NextResponse.json({ success: false, error: "An account with this email already exists." }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);
    const { firstName, lastName, name: displayName } = splitName(name);
    let customer;
    if (exists) {
      customer = await Customer.findByIdAndUpdate(
        exists._id,
        { $set: { name: displayName, firstName, lastName, phone, passwordHash } },
        { new: true }
      ).select("-passwordHash");
    } else {
      customer = await Customer.create({
        firstName,
        lastName,
        name: displayName,
        email,
        phone,
        passwordHash,
        address: {},
      });
    }

    const token = signStoreCustomerToken(customer._id.toString());
    const res = NextResponse.json({
      success: true,
      customer: { id: customer._id.toString(), name: customer.name, email: customer.email, phone: customer.phone || "" },
    });
    setStoreCustomerAuthCookie(res, token);
    return res;
  } catch (e) {
    if (e.code === 11000) {
      return NextResponse.json({ success: false, error: "Email already registered." }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: e.message || "Registration failed." }, { status: 500 });
  }
}
