import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import { denyUnlessMinRole } from "@/lib/requireRole";
import Category from "@/lib/models/Category.model";

const ALLOWED_STATUS = new Set(["active", "inactive", "draft"]);
const DESC_MODES = new Set(["replace", "append", "prepend"]);

function parseIds(raw) {
  return [...new Set((Array.isArray(raw) ? raw : []).map((id) => String(id || "").trim()).filter(Boolean))].filter(
    (id) => mongoose.Types.ObjectId.isValid(id)
  );
}

function parseKeywords(raw) {
  if (Array.isArray(raw)) {
    return raw.map((k) => String(k || "").trim()).filter(Boolean);
  }
  return String(raw || "")
    .split(/[,|]/)
    .map((k) => k.trim())
    .filter(Boolean);
}

function applyStatusSideEffects($set, status) {
  if (status === "active") {
    if ($set.showInNav === undefined) $set.showInNav = true;
  } else {
    if ($set.showInNav === undefined) $set.showInNav = false;
    if ($set.showOnHomepage === undefined) $set.showOnHomepage = false;
    if ($set.showInFooter === undefined) $set.showInFooter = false;
  }
}

/** Build $set object from a partial patch (only keys explicitly sent). */
function buildSetFromPatch(patch) {
  const $set = {};

  if (patch.status !== undefined) {
    const status = String(patch.status).trim().toLowerCase();
    if (!ALLOWED_STATUS.has(status)) throw new Error("Invalid status.");
    $set.status = status;
    applyStatusSideEffects($set, status);
  }

  if (patch.description !== undefined && patch.description?.mode === "replace") {
    $set.description = String(patch.description.value ?? "");
  }

  if (patch.seo && typeof patch.seo === "object") {
    if (patch.seo.metaTitle !== undefined) $set["seo.metaTitle"] = String(patch.seo.metaTitle ?? "");
    if (patch.seo.metaDescription !== undefined) {
      $set["seo.metaDescription"] = String(patch.seo.metaDescription ?? "");
    }
    if (patch.seo.metaKeywords !== undefined) {
      $set["seo.metaKeywords"] = parseKeywords(patch.seo.metaKeywords);
    }
  }

  if (patch.featured !== undefined) {
    const flag = Boolean(patch.featured);
    $set.featured = flag;
    $set.isFeatured = flag;
  }
  if (patch.showInNav !== undefined) $set.showInNav = Boolean(patch.showInNav);
  if (patch.showInFooter !== undefined) $set.showInFooter = Boolean(patch.showInFooter);
  if (patch.showOnHomepage !== undefined) $set.showOnHomepage = Boolean(patch.showOnHomepage);
  if (patch.homepageOrder !== undefined) $set.homepageOrder = Number(patch.homepageOrder) || 0;
  if (patch.homepageIcon !== undefined) $set.homepageIcon = String(patch.homepageIcon ?? "");
  if (patch.sortOrder !== undefined) $set.sortOrder = Number(patch.sortOrder) || 0;

  if (patch.image && typeof patch.image === "object") {
    if (patch.image.url !== undefined) $set["image.url"] = String(patch.image.url ?? "");
    if (patch.image.publicId !== undefined) $set["image.publicId"] = String(patch.image.publicId ?? "");
    if (patch.image.altText !== undefined) $set["image.altText"] = String(patch.image.altText ?? "");
    if (patch.image.title !== undefined) $set["image.title"] = String(patch.image.title ?? "");
  }

  return $set;
}

/**
 * PATCH /api/categories/bulk
 * Body: { ids: string[], patch: { ...only fields to apply } }
 *
 * patch.description: { mode: "replace"|"append"|"prepend", value: string }
 */
export async function PATCH(request) {
  try {
    const user = getRequestUser(request);
    const denied = denyUnlessMinRole(user, "editor");
    if (denied) return denied;

    const body = await request.json();
    const ids = parseIds(body.ids);
    const patch = body.patch && typeof body.patch === "object" ? body.patch : null;

    if (!ids.length) {
      return NextResponse.json({ success: false, error: "No valid category ids provided." }, { status: 400 });
    }
    if (!patch || !Object.keys(patch).length) {
      return NextResponse.json({ success: false, error: "No fields to update." }, { status: 400 });
    }

    await dbConnect();
    const objectIds = ids.map((id) => new mongoose.Types.ObjectId(id));
    const filter = { _id: { $in: objectIds } };

    let modified = 0;

    const $set = buildSetFromPatch(patch);
    if (Object.keys($set).length) {
      const r = await Category.updateMany(filter, { $set });
      modified = Math.max(modified, r.modifiedCount);
    }

    const desc = patch.description;
    if (desc && desc.mode && desc.mode !== "replace" && DESC_MODES.has(desc.mode)) {
      const value = String(desc.value ?? "");
      const pipeline =
        desc.mode === "append"
          ? [{ $set: { description: { $concat: [{ $ifNull: ["$description", ""] }, value] } } }]
          : [{ $set: { description: { $concat: [value, { $ifNull: ["$description", ""] }] } } }];
      const r = await Category.updateMany(filter, pipeline);
      modified = Math.max(modified, r.modifiedCount);
    }

    return NextResponse.json({
      success: true,
      matched: ids.length,
      modified,
      fields: Object.keys(patch),
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Bulk update failed." },
      { status: 500 }
    );
  }
}
