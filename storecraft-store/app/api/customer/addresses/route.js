import { NextResponse } from "next/server";
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

export async function GET(req) {
  try {
    const customer = await getAuthedCustomer(req);
    if (!customer) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }
    return NextResponse.json({ success: true, addresses: listAddresses(customer) });
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message || "Failed" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const customer = await getAuthedCustomer(req);
    if (!customer) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const addr = normalizeAddressInput(body);
    const errors = validateAddress(addr);
    if (Object.keys(errors).length) {
      return NextResponse.json({ success: false, error: Object.values(errors)[0], errors }, { status: 400 });
    }

    if (!Array.isArray(customer.addresses)) customer.addresses = [];
    if (!customer.addresses.length) addr.isDefault = true;
    if (addr.isDefault) {
      customer.addresses.forEach((a) => {
        a.isDefault = false;
      });
    }

    customer.addresses.push(addr);
    syncLegacyAddress(customer);
    customer.markModified("addresses");
    await customer.save();

    return NextResponse.json({
      success: true,
      addresses: listAddresses(customer),
      address: serializeAddress(customer.addresses[customer.addresses.length - 1]),
    });
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message || "Failed" }, { status: 500 });
  }
}
