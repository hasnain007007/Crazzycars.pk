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

function applyAddress(doc, cleanStreet, cleanCity) {
  if (!cleanCity && !cleanStreet) return;
  doc.address = {
    ...(doc.address?.toObject?.() || doc.address || {}),
    street: cleanStreet || doc.address?.street || "",
    city: cleanCity || doc.address?.city || "",
    country: "Pakistan",
  };
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
  const phoneDigits = normalizePhone(cleanPhone);

  async function emailAvailable(candidate, excludeId) {
    if (!candidate) return false;
    const q = { email: candidate };
    if (excludeId) q._id = { $ne: excludeId };
    const clash = await Customer.findOne(q).select("_id").lean();
    return !clash;
  }

  if (customerId && mongoose.Types.ObjectId.isValid(String(customerId))) {
    const existing = await Customer.findById(customerId);
    if (existing) {
      existing.name = cleanName || existing.name;
      if (cleanPhone) existing.phone = cleanPhone;
      if (
        cleanEmail &&
        String(existing.email || "").includes("@guest.") &&
        (await emailAvailable(cleanEmail, existing._id))
      ) {
        existing.email = cleanEmail;
      }
      applyAddress(existing, cleanStreet, cleanCity);
      await existing.save();
      return { customerId: existing._id, customer: existing.toObject(), created: false };
    }
  }

  let found = null;

  if (cleanEmail && !cleanEmail.includes("@guest.")) {
    found = await Customer.findOne({ email: cleanEmail });
  }
  if (!found && phoneDigits) {
    found = await Customer.findOne({
      $or: [{ phone: cleanPhone }, { phone: phoneDigits }],
    });
  }
  // Last-10 match for 03xx vs +92 formats only (avoid short suffix collisions).
  if (!found && phoneDigits.length >= 10) {
    const tail = phoneDigits.slice(-10).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    found = await Customer.findOne({ phone: { $regex: `${tail}$` } });
  }

  if (found) {
    found.name = cleanName || found.name;
    if (cleanPhone) found.phone = cleanPhone;
    if (
      cleanEmail &&
      !cleanEmail.includes("@guest.") &&
      (await emailAvailable(cleanEmail, found._id))
    ) {
      found.email = cleanEmail;
    }
    applyAddress(found, cleanStreet, cleanCity);
    await found.save();
    return { customerId: found._id, customer: found.toObject(), created: false };
  }

  const emailToUse =
    cleanEmail && !cleanEmail.includes("@guest.") && (await emailAvailable(cleanEmail))
      ? cleanEmail
      : guestEmailFromPhone(cleanPhone);
  let finalEmail = emailToUse;
  if (!(await emailAvailable(finalEmail))) {
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
