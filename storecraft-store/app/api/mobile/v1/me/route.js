/**
 * GET    /api/mobile/v1/me — Return current customer profile.
 * PATCH  /api/mobile/v1/me — Update profile (firstName, lastName, phone, password).
 * DELETE /api/mobile/v1/me — Anonymize account (store-required deletion).
 *
 * Anonymize: blank name/phone/addresses/wishlist, replace email with deleted+id@deleted.local,
 * clear password, set isActive:false, revoke all refresh tokens, delete MobileDevice.
 * Orders are retained for fulfilment/accounting.
 */
import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import Customer from "@/lib/models/Customer.model";
import MobileDevice from "@/lib/models/MobileDevice.model";
import { normalizePkMobile, isValidPkMobile } from "@/lib/customerPhone";
import { requireMobileAuth } from "@/lib/mobile/auth";
import { revokeAllRefreshTokens } from "@/lib/mobile/refreshToken";
import { mobileError } from "@/lib/mobile/response";

export const dynamic = "force-dynamic";

function serializeCustomer(c) {
  return {
    id: String(c._id),
    name: c.name || "",
    firstName: c.firstName || "",
    lastName: c.lastName || "",
    email: c.email || "",
    phone: c.phone || "",
    avatar: c.avatar || "",
    isVerified: Boolean(c.isVerified),
    addresses: (c.addresses || []).map((a) => ({
      id: String(a._id || ""),
      label: a.label || "Home",
      firstName: a.firstName || "",
      lastName: a.lastName || "",
      phone: a.phone || "",
      street: a.street || "",
      street2: a.street2 || "",
      area: a.area || "",
      city: a.city || "",
      province: a.province || a.state || "",
      postcode: a.postcode || a.zip || "",
      country: a.country || "Pakistan",
      isDefault: Boolean(a.isDefault),
    })),
    createdAt: c.createdAt,
  };
}

export async function GET(request) {
  let authCtx;
  try {
    authCtx = await requireMobileAuth(request);
  } catch (err) {
    return mobileError(err.code || "UNAUTHORIZED", err.message, { status: err.statusCode || 401 });
  }

  await dbConnect();
  const customer = await Customer.findById(authCtx.customer._id).select("-password -passwordHash");
  if (!customer) {
    return mobileError("NOT_FOUND", "Customer not found.", { status: 404 });
  }

  return NextResponse.json({ customer: serializeCustomer(customer) });
}

export async function PATCH(request) {
  let authCtx;
  try {
    authCtx = await requireMobileAuth(request);
  } catch (err) {
    return mobileError(err.code || "UNAUTHORIZED", err.message, { status: err.statusCode || 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return mobileError("INVALID_BODY", "Request body must be valid JSON.", { status: 400 });
  }

  await dbConnect();
  const doc = await Customer.findById(authCtx.customer._id);
  if (!doc || doc.isActive === false) {
    return mobileError("ACCOUNT_INACTIVE", "Account not found or inactive.", { status: 401 });
  }

  if (body.firstName !== undefined) doc.firstName = String(body.firstName || "").trim();
  if (body.lastName !== undefined) doc.lastName = String(body.lastName || "").trim();
  if (body.firstName !== undefined || body.lastName !== undefined) {
    doc.name = `${doc.firstName || ""} ${doc.lastName || ""}`.trim();
  }
  if (body.phone !== undefined) {
    const phoneRaw = String(body.phone || "").trim();
    if (phoneRaw && !isValidPkMobile(phoneRaw)) {
      return mobileError("VALIDATION_ERROR", "Enter a valid Pakistani mobile number.", {
        status: 400,
        fields: { phone: "Invalid phone." },
      });
    }
    doc.phone = phoneRaw ? normalizePkMobile(phoneRaw) : "";
  }

  const pwd = String(body.password || "").trim();
  if (pwd) {
    if (pwd.length < 8) {
      return mobileError("VALIDATION_ERROR", "Password must be at least 8 characters.", {
        status: 400,
        fields: { password: "Min 8 characters." },
      });
    }
    const hashed = await hashPassword(pwd);
    doc.passwordHash = hashed;
    doc.password = hashed;
  }

  try {
    await doc.save();
  } catch (err) {
    if (err.code === 11000) {
      return mobileError("CONFLICT", "Phone number is already in use.", { status: 409 });
    }
    console.error("[mobile/me PATCH]", err);
    return mobileError("INTERNAL_ERROR", "Could not update profile.", { status: 500 });
  }

  const lean = await Customer.findById(doc._id).select("-password -passwordHash").lean();
  return NextResponse.json({ customer: serializeCustomer(lean) });
}

export async function DELETE(request) {
  let authCtx;
  try {
    authCtx = await requireMobileAuth(request);
  } catch (err) {
    return mobileError(err.code || "UNAUTHORIZED", err.message, { status: err.statusCode || 401 });
  }

  await dbConnect();
  const customerId = authCtx.customer._id;
  const deletedEmail = `deleted+${String(customerId)}@deleted.local`;

  try {
    await Customer.updateOne(
      { _id: customerId },
      {
        $set: {
          name: "",
          firstName: "",
          lastName: "",
          email: deletedEmail,
          phone: "",
          password: "",
          passwordHash: "",
          isActive: false,
          addresses: [],
          wishlist: [],
          address: { street: "", street2: "", area: "", city: "", state: "", country: "", zip: "" },
        },
      }
    );

    // Revoke all refresh tokens
    await revokeAllRefreshTokens(customerId);

    // Remove device registrations
    await MobileDevice.deleteMany({ customerId });
  } catch (err) {
    console.error("[mobile/me DELETE]", err);
    return mobileError("INTERNAL_ERROR", "Failed to delete account. Please try again.", { status: 500 });
  }

  return NextResponse.json({ success: true, message: "Account deleted. Your orders are retained for records." });
}
