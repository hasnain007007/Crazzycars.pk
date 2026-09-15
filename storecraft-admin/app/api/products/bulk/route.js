/**
 * Bulk product updates: setAddOns, fetchByIds, saveRows.
 */
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { logActivity } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import { denyUnlessCapability } from "@/lib/denyCapability";
import Product from "@/lib/models/Product.model";
import { isBodyKitProduct } from "@/lib/codEligibility";
import { normalizeAddOns } from "@/lib/productPayload";
import { revalidateStorefront, CATALOG_REVALIDATE_PATHS } from "@/lib/revalidateStorefront";
import { denySecurityHoldMutation } from "@/lib/securityHold";

const BULK_LIMIT = 200;

function parseIds(raw) {
  return [
    ...new Set((Array.isArray(raw) ? raw : []).map((id) => String(id || "").trim()).filter(Boolean)),
  ].filter((id) => mongoose.Types.ObjectId.isValid(id));
}

function mergeAddOns(existing, incoming) {
  const next = Array.isArray(existing) ? existing.map((a) => ({ ...a })) : [];
  for (const item of incoming) {
    const nameKey = String(item.name || "").trim().toLowerCase();
    if (!nameKey) continue;
    const idx = next.findIndex((a) => String(a.name || "").trim().toLowerCase() === nameKey);
    if (idx >= 0) {
      next[idx] = {
        ...next[idx],
        name: item.name,
        price: item.price,
        required: Boolean(item.required),
      };
    } else {
      next.push({
        name: item.name,
        price: item.price,
        required: Boolean(item.required),
      });
    }
  }
  return next;
}

function removeAddOnsByName(existing, names) {
  const removeKeys = new Set(
    names.map((n) => String(n || "").trim().toLowerCase()).filter(Boolean)
  );
  if (!removeKeys.size) return Array.isArray(existing) ? existing : [];
  return (Array.isArray(existing) ? existing : []).filter(
    (a) => !removeKeys.has(String(a?.name || "").trim().toLowerCase())
  );
}

function requestIp(request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
}

function serializeBulkRow(doc) {
  return {
    _id: String(doc._id),
    name: doc.name || "",
    articleNo: doc.articleNo || "",
    slug: doc.slug || "",
    status: doc.status || "draft",
    featured: Boolean(doc.featured),
    codEnabled: isBodyKitProduct(doc) ? false : doc.codEnabled !== false,
    advancePercentRequired: Math.min(100, Math.max(0, Number(doc.advancePercentRequired) || 0)),
    media: doc.media || { images: [] },
    pricing: {
      regularPrice: Number(doc.pricing?.regularPrice) || 0,
      salePrice: doc.pricing?.salePrice ?? null,
    },
    inventory: {
      quantity: Number(doc.inventory?.quantity) || 0,
      trackInventory: doc.inventory?.trackInventory !== false,
      sku: doc.inventory?.sku || "",
    },
    categories: (doc.categories || []).map((c) =>
      c && typeof c === "object"
        ? { _id: String(c._id), name: c.name || "", slug: c.slug || "" }
        : { _id: String(c), name: "", slug: "" }
    ),
    addOns: normalizeAddOns(doc.addOns || []),
  };
}

async function handleSetAddOns({ user, body, request }) {
  const ids = parseIds(body.ids);
  if (!ids.length) {
    return NextResponse.json({ success: false, error: "No valid product ids." }, { status: 400 });
  }
  if (ids.length > BULK_LIMIT) {
    return NextResponse.json(
      { success: false, error: `Bulk limit is ${BULK_LIMIT} products at a time.` },
      { status: 400 }
    );
  }

  const modeRaw = String(body.mode || "replace").toLowerCase();
  const mode = ["replace", "merge", "remove", "clear"].includes(modeRaw) ? modeRaw : "replace";
  const addOns = normalizeAddOns(body.addOns).filter((a) => a.name);

  if (mode === "merge" || mode === "remove") {
    if (!addOns.length) {
      return NextResponse.json(
        { success: false, error: "Add at least one add-on name." },
        { status: 400 }
      );
    }
  }

  await dbConnect();

  let modified = 0;
  if (mode === "clear") {
    const result = await Product.updateMany({ _id: { $in: ids } }, { $set: { addOns: [] } });
    modified = result.modifiedCount || 0;
  } else if (mode === "replace") {
    const result = await Product.updateMany({ _id: { $in: ids } }, { $set: { addOns } });
    modified = result.modifiedCount || 0;
  } else if (mode === "merge") {
    const products = await Product.find({ _id: { $in: ids } }).select("_id addOns").lean();
    for (const doc of products) {
      const merged = mergeAddOns(doc.addOns, addOns);
      const res = await Product.updateOne({ _id: doc._id }, { $set: { addOns: merged } });
      if (res.modifiedCount) modified += 1;
    }
  } else {
    const names = addOns.map((a) => a.name);
    const products = await Product.find({ _id: { $in: ids } }).select("_id addOns").lean();
    for (const doc of products) {
      const next = removeAddOnsByName(doc.addOns, names);
      const before = Array.isArray(doc.addOns) ? doc.addOns.length : 0;
      if (next.length === before) continue;
      const res = await Product.updateOne({ _id: doc._id }, { $set: { addOns: next } });
      if (res.modifiedCount) modified += 1;
    }
  }

  await logActivity({
    user: user.id || user._id,
    userName: user.name || user.email || "Admin",
    action: "products.bulk.setAddOns",
    resource: "Product",
    details: { count: ids.length, modified, mode, addOns },
    type: "update",
    ip: requestIp(request),
  });

  return NextResponse.json({ success: true, matched: ids.length, modified, mode, addOns });
}

async function handleFetchByIds({ body }) {
  const ids = parseIds(body.ids);
  if (!ids.length) {
    return NextResponse.json({ success: false, error: "No valid product ids." }, { status: 400 });
  }
  if (ids.length > BULK_LIMIT) {
    return NextResponse.json(
      { success: false, error: `Bulk limit is ${BULK_LIMIT} products at a time.` },
      { status: 400 }
    );
  }

  await dbConnect();
  const docs = await Product.find({ _id: { $in: ids } })
    .select("name articleNo slug status featured codEnabled advancePercentRequired media pricing inventory categories addOns")
    .populate("categories", "name slug")
    .lean();

  const byId = new Map(docs.map((d) => [String(d._id), d]));
  const ordered = ids.map((id) => byId.get(id)).filter(Boolean).map(serializeBulkRow);

  return NextResponse.json({ success: true, data: ordered, total: ordered.length });
}

async function handleSaveRows({ user, body, request }) {
  const rows = Array.isArray(body.rows) ? body.rows : [];
  if (!rows.length) {
    return NextResponse.json({ success: false, error: "No rows to save." }, { status: 400 });
  }
  if (rows.length > BULK_LIMIT) {
    return NextResponse.json(
      { success: false, error: `Bulk limit is ${BULK_LIMIT} products at a time.` },
      { status: 400 }
    );
  }

  await dbConnect();

  let modified = 0;
  const errors = [];

  for (const row of rows) {
    const id = String(row?.id || row?._id || "").trim();
    if (!mongoose.Types.ObjectId.isValid(id)) {
      errors.push({ id, error: "Invalid id" });
      continue;
    }

    const $set = {};

    if (row.status != null) {
      const status = String(row.status).trim();
      if (["active", "inactive", "draft"].includes(status)) {
        $set.status = status;
      }
    }

    if (row.featured != null) {
      $set.featured = Boolean(row.featured);
    }

    if (row.codEnabled != null) {
      $set.codEnabled = row.codEnabled !== false;
    }
    if (isBodyKitProduct({ name: row.name, slug: row.slug })) {
      $set.codEnabled = false;
    }

    if (row.advancePercentRequired != null) {
      const pct = Number(row.advancePercentRequired);
      if (Number.isFinite(pct)) {
        $set.advancePercentRequired = Math.min(100, Math.max(0, Math.round(pct)));
      }
    }

    if (row.regularPrice != null || row.pricing?.regularPrice != null) {
      const price = Number(row.regularPrice ?? row.pricing?.regularPrice);
      if (Number.isFinite(price) && price >= 0) {
        $set["pricing.regularPrice"] = price;
      }
    }

    if (row.quantity != null || row.inventory?.quantity != null) {
      const qty = Number(row.quantity ?? row.inventory?.quantity);
      if (Number.isFinite(qty) && qty >= 0) {
        $set["inventory.quantity"] = Math.floor(qty);
      }
    }

    if (row.addOns !== undefined) {
      $set.addOns = normalizeAddOns(row.addOns).filter((a) => a.name);
    }

    if (!Object.keys($set).length) continue;

    try {
      const existing = await Product.findById(id).select("securityHold status").lean();
      if (!existing) {
        errors.push({ id, error: "Not found" });
        continue;
      }
      const holdDenied = denySecurityHoldMutation(
        existing,
        { status: $set.status, securityHold: $set.securityHold },
        user
      );
      if (holdDenied) {
        const body = await holdDenied.json().catch(() => ({}));
        errors.push({ id, error: body.error || "Security hold blocked update" });
        continue;
      }
      const res = await Product.updateOne({ _id: id }, { $set });
      if (res.modifiedCount) modified += 1;
    } catch (e) {
      errors.push({ id, error: e.message || "Update failed" });
    }
  }

  await logActivity({
    user: user.id || user._id,
    userName: user.name || user.email || "Admin",
    action: "products.bulk.saveRows",
    resource: "Product",
    details: { count: rows.length, modified, errorCount: errors.length },
    type: "update",
    ip: requestIp(request),
  });

  const revalidated = await revalidateStorefront(CATALOG_REVALIDATE_PATHS);

  return NextResponse.json({
    success: errors.length === 0,
    modified,
    matched: rows.length,
    errors,
    revalidated,
    error: errors.length ? `${errors.length} row(s) failed` : undefined,
  });
}

export async function POST(request) {
  try {
    const user = getRequestUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const denied = denyUnlessCapability(user, "canManageCatalog");
    if (denied) return denied;

    const body = await request.json().catch(() => ({}));
    const action = String(body.action || "").trim();

    if (action === "setAddOns") return handleSetAddOns({ user, body, request });
    if (action === "fetchByIds") return handleFetchByIds({ body });
    if (action === "saveRows") return handleSaveRows({ user, body, request });

    return NextResponse.json({ success: false, error: "Unsupported action." }, { status: 400 });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e.message || "Bulk update failed." },
      { status: 500 }
    );
  }
}
