/**
 * Find or create a Customer for invoice walk-in sales.
 * Match by phone (preferred) or email; guest email if none provided.
 */
import mongoose from "mongoose";
import Customer from "@/lib/models/Customer.model";

function normalizePhone(phone) {
  return String(phone || "").replace(/\D/g, "");
}

function guestEmailFromPhone(phone) {
  const digits = normalizePhone(phone) || String(Date.now());
  return `invoice+${digits}@guest.invoice`;
}

/**
 * @returns {Promise<{ customerId: import("mongoose").Types.ObjectId, customer: object, created: boolean }>}
 */
export async function upsertInvoiceCustomer({
  name,
  email,
  phone,
  city,
  address,
  customerId,
}) {
  const cleanName = String(name || "").trim();
  const cleanPhone = String(phone || "").trim();
  const cleanEmail = String(email || "").trim().toLowerCase();
  const cleanCity = String(city || "").trim();
  const cleanStreet = String(address || "").trim();

  if (customerId && mongoose.Types.ObjectId.isValid(String(customerId))) {
    const existing = await Customer.findById(customerId);
    if (existing) {
      existing.name = cleanName || existing.name;
      if (cleanPhone) existing.phone = cleanPhone;
      if (cleanEmail && !String(existing.email || "").includes("@guest.")) {
        // keep real email; only set if provided and existing is guest
      } else if (cleanEmail) {
        existing.email = cleanEmail;
      }
      if (cleanCity || cleanStreet) {
        existing.address = {
          ...(existing.address?.toObject?.() || existing.address || {}),
          street: cleanStreet || existing.address?.street || "",
          city: cleanCity || existing.address?.city || "",
          country: "Pakistan",
        };
      }
      await existing.save();
      return { customerId: existing._id, customer: existing.toObject(), created: false };
    }
  }

  const phoneDigits = normalizePhone(cleanPhone);
  let found = null;

  if (cleanEmail && !cleanEmail.includes("@guest.")) {
    found = await Customer.findOne({ email: cleanEmail });
  }
  if (!found && phoneDigits) {
    found = await Customer.findOne({
      $or: [
        { phone: cleanPhone },
        { phone: phoneDigits },
        { phone: { $regex: `${phoneDigits}$` } },
      ],
    });
  }

  if (found) {
    found.name = cleanName || found.name;
    if (cleanPhone) found.phone = cleanPhone;
    if (cleanEmail && !cleanEmail.includes("@guest.")) found.email = cleanEmail;
    if (cleanCity || cleanStreet) {
      found.address = {
        ...(found.address?.toObject?.() || found.address || {}),
        street: cleanStreet || found.address?.street || "",
        city: cleanCity || found.address?.city || "",
        country: "Pakistan",
      };
    }
    await found.save();
    return { customerId: found._id, customer: found.toObject(), created: false };
  }

  const emailToUse = cleanEmail && !cleanEmail.includes("@guest.") ? cleanEmail : guestEmailFromPhone(cleanPhone);
  // Ensure unique email if collision
  let finalEmail = emailToUse;
  const clash = await Customer.findOne({ email: finalEmail }).select("_id").lean();
  if (clash) {
    finalEmail = `invoice+${phoneDigits || Date.now()}.${Math.random().toString(36).slice(2, 6)}@guest.invoice`;
  }

  const created = await Customer.create({
    name: cleanName,
    email: finalEmail,
    phone: cleanPhone,
    status: "active",
    isActive: true,
    address: {
      street: cleanStreet,
      city: cleanCity,
      country: "Pakistan",
    },
  });

  return { customerId: created._id, customer: created.toObject(), created: true };
}
