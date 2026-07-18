import { NextResponse } from "next/server";
import mongoose from "mongoose";
import {
  normalizeAddressInput,
  serializeAddress,
  toLegacySingularAddress,
  validateAddress,
} from "@/lib/addressBook";
import { getAuthedCustomer } from "@/lib/customerAuthServer";

function listAddresses(customer) {
  return (customer.addresses || []).map(serializeAddress).filter(Boolean);
}

function syncLegacyAddress(customer) {
  const def = (customer.addresses || []).find((a) => a.isDefault) || customer.addresses?.[0];
  if (def) {
    customer.address = toLegacySingularAddress(def);
  }
}

function findAddress(customer, id) {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;
  return (customer.addresses || []).id(id);
}

export async function PUT(req, context) {
  try {
    const customer = await getAuthedCustomer(req);
    if (!customer) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    const id = (await context.params).id;
    const existing = findAddress(customer, id);
    if (!existing) {
      return NextResponse.json({ success: false, error: "Address not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const addr = normalizeAddressInput({ ...existing.toObject?.() || existing, ...body });
    const errors = validateAddress(addr);
    if (Object.keys(errors).length) {
      return NextResponse.json({ success: false, error: Object.values(errors)[0], errors }, { status: 400 });
    }

    if (addr.isDefault) {
      customer.addresses.forEach((a) => {
        a.isDefault = false;
      });
    }

    Object.assign(existing, addr);
    if (!(customer.addresses || []).some((a) => a.isDefault) && customer.addresses?.length) {
      existing.isDefault = true;
    }
    syncLegacyAddress(customer);
    customer.markModified("addresses");
    await customer.save();

    return NextResponse.json({
      success: true,
      addresses: listAddresses(customer),
      address: serializeAddress(existing),
    });
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message || "Failed" }, { status: 500 });
  }
}

export async function DELETE(req, context) {
  try {
    const customer = await getAuthedCustomer(req);
    if (!customer) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    const id = (await context.params).id;
    const existing = findAddress(customer, id);
    if (!existing) {
      return NextResponse.json({ success: false, error: "Address not found" }, { status: 404 });
    }

    const wasDefault = Boolean(existing.isDefault);
    existing.deleteOne();
    if (wasDefault && customer.addresses?.length) {
      customer.addresses[0].isDefault = true;
    }
    syncLegacyAddress(customer);
    customer.markModified("addresses");
    await customer.save();

    return NextResponse.json({ success: true, addresses: listAddresses(customer) });
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message || "Failed" }, { status: 500 });
  }
}
