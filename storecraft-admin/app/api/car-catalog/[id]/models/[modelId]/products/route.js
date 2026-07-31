/**
 * Manage products assigned to a Car Catalog model (via Vehicle + Product fitment).
 *
 * GET    — list products linked to this car
 * POST   — add product(s) { productId | productIds[] }
 * DELETE — remove product ?productId=
 *
 * Linking writes:
 *   - Product.compatibleVehicles += Vehicle._id
 *   - Product.compatibleCars row
 *   - Product.vehicleCompatibility.vehicles row
 */
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import { denyUnlessMinRole } from "@/lib/requireRole";
import CarCatalog from "@/lib/models/CarCatalog.model";
import Product from "@/lib/models/Product.model";
import Vehicle from "@/lib/models/Vehicle.model";
import { withProductSaleComputed } from "@/lib/productSale";

function escapeRegex(s) {
  return String(s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

async function resolveMakeAndModel(makeId, modelId) {
  if (!mongoose.Types.ObjectId.isValid(makeId)) {
    return { error: "Invalid make id.", status: 400 };
  }
  const make = await CarCatalog.findById(makeId).lean();
  if (!make) return { error: "Make not found.", status: 404 };

  const mid = String(modelId || "").trim();
  const model =
    (make.models || []).find((m) => String(m._id) === mid) ||
    (make.models || []).find((m) => String(m.slug) === mid) ||
    null;
  if (!model) return { error: "Model not found on this make.", status: 404 };

  return { make, model };
}

/** Find or create the Vehicle doc that powers /cars/[slug]. */
async function ensureVehicle(make, model) {
  const makeName = String(make.name || "").trim();
  const rawModelName = String(model.name || "").trim();
  const modelName = rawModelName.replace(new RegExp(`^${escapeRegex(makeName)}\\s+`, "i"), "").trim() || rawModelName;
  const yearsArr = Array.isArray(model.years)
    ? model.years.map(Number).filter((n) => Number.isFinite(n))
    : [];
  const yearFrom =
    Number(model.yearFrom) || (yearsArr.length ? Math.min(...yearsArr) : 0) || new Date().getFullYear() - 10;
  let yearTo = null;
  if (model.yearTo != null && model.yearTo !== "") yearTo = Number(model.yearTo);
  else if (yearsArr.length) yearTo = Math.max(...yearsArr);
  if (!Number.isFinite(yearTo)) yearTo = null;
  const generation = String(model.generation || model.nickname || "").trim();
  const makeSlug = slugify(makeName);
  const catalogModelSlug = slugify(model.slug || "");
  const rawModelSlug = catalogModelSlug;
  // Prefer a stable vehicle slug; keep catalogModelSlug for Shop-by-Car links like /cars/1-genx120
  const slug =
    slugify(
      rawModelSlug && (rawModelSlug.startsWith(`${makeSlug}-`) || rawModelSlug.includes(makeSlug))
        ? rawModelSlug
        : `${makeName}-${modelName}-${yearFrom}${generation ? `-${generation}` : ""}`
    ) || slugify(`${makeName}-${modelName}-${yearFrom}`);
  const displayName = generation
    ? `${makeName} ${modelName} ${generation}`
    : `${makeName} ${modelName}${yearFrom ? ` (${yearFrom}${yearTo ? `–${yearTo}` : "+"})` : ""}`;

  let vehicle =
    (catalogModelSlug
      ? await Vehicle.findOne({ catalogModelSlug }).lean()
      : null) ||
    (await Vehicle.findOne({ slug }).lean());
  if (!vehicle) {
    const genFilter = generation
      ? { generation: new RegExp(`^${escapeRegex(generation)}$`, "i") }
      : {};
    vehicle = await Vehicle.findOne({
      make: new RegExp(`^${escapeRegex(makeName)}$`, "i"),
      model: new RegExp(`^${escapeRegex(modelName)}$`, "i"),
      yearFrom,
      ...genFilter,
    }).lean();
  }

  if (!vehicle) {
    vehicle = (
      await Vehicle.create({
        make: makeName,
        model: modelName,
        generation,
        displayName,
        yearFrom,
        yearTo,
        slug,
        catalogModelSlug,
        image: model.image || "",
        isActive: model.isActive !== false,
        sortOrder: Number(model.popularOrder) || 0,
      })
    ).toObject();
  } else {
    const patch = {};
    if (catalogModelSlug && !vehicle.catalogModelSlug) patch.catalogModelSlug = catalogModelSlug;
    if (model.image && !vehicle.image) patch.image = model.image;
    if (Object.keys(patch).length) {
      await Vehicle.updateOne({ _id: vehicle._id }, { $set: patch });
      vehicle = { ...vehicle, ...patch };
    }
  }

  return vehicle;
}

function fitmentRow(make, model, vehicle) {
  const makeName = String(make.name || vehicle.make || "").trim();
  const rawModel = String(model.name || vehicle.model || "").trim();
  const modelName =
    rawModel.replace(new RegExp(`^${escapeRegex(makeName)}\\s+`, "i"), "").trim() || rawModel;
  return {
    make: makeName,
    model: modelName,
    generation: String(model.generation || vehicle.generation || "").trim(),
    yearFrom: Number(vehicle.yearFrom) || Number(model.yearFrom) || undefined,
    yearTo:
      vehicle.yearTo != null
        ? Number(vehicle.yearTo)
        : model.yearTo != null
          ? Number(model.yearTo)
          : undefined,
  };
}

function sameFitmentGeneration(a, b) {
  const makeEq = String(a.make || "").toLowerCase() === String(b.make || "").toLowerCase();
  const modelEq = String(a.model || "").toLowerCase() === String(b.model || "").toLowerCase();
  if (!makeEq || !modelEq) return false;
  const aFrom = Number(a.yearFrom);
  const bFrom = Number(b.yearFrom);
  if (Number.isFinite(aFrom) && Number.isFinite(bFrom) && aFrom !== bFrom) return false;
  const aGen = String(a.generation || "").trim().toLowerCase();
  const bGen = String(b.generation || "").trim().toLowerCase();
  if (aGen && bGen && aGen !== bGen) return false;
  const aTo = a.yearTo != null ? Number(a.yearTo) : null;
  const bTo = b.yearTo != null ? Number(b.yearTo) : null;
  if (Number.isFinite(aTo) && Number.isFinite(bTo) && aTo !== bTo) return false;
  return true;
}

function productsForCarFilter(vehicle, make, model) {
  const vehicleId = vehicle._id;
  const mk = String(make.name || "").trim();
  const md = String(model.name || "").trim();
  const mkRx = new RegExp(`^${escapeRegex(mk)}$`, "i");
  const mdRx = new RegExp(`^${escapeRegex(md)}$`, "i");

  return {
    $or: [
      { compatibleVehicles: vehicleId },
      { compatibleCars: { $elemMatch: { make: mkRx, model: mdRx } } },
      {
        "vehicleCompatibility.fitmentType": { $in: ["specific", "semi-universal"] },
        "vehicleCompatibility.vehicles": { $elemMatch: { make: mkRx, model: mdRx } },
      },
    ],
  };
}

export async function GET(request, context) {
  try {
    const user = getRequestUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const { id, modelId } = await context.params;
    await dbConnect();

    const resolved = await resolveMakeAndModel(id, modelId);
    if (resolved.error) {
      return NextResponse.json({ success: false, error: resolved.error }, { status: resolved.status });
    }
    const { make, model } = resolved;
    const vehicle = await ensureVehicle(make, model);

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page"), 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit"), 10) || 20));
    const search = (searchParams.get("search") || "").trim();

    const filter = productsForCarFilter(vehicle, make, model);
    if (search) {
      const rx = new RegExp(escapeRegex(search), "i");
      filter.$and = [{ $or: [{ name: rx }, { articleNo: rx }, { "inventory.sku": rx }] }];
    }

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      Product.find(filter)
        .select("name slug status media pricing inventory articleNo compatibleVehicles isUniversal createdAt updatedAt")
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(filter),
    ]);

    return NextResponse.json({
      success: true,
      make: { _id: make._id, name: make.name, slug: make.slug },
      model: {
        _id: model._id,
        name: model.name,
        slug: model.slug,
        yearFrom: model.yearFrom,
        yearTo: model.yearTo,
        generation: model.generation || "",
      },
      vehicle: {
        _id: vehicle._id,
        slug: vehicle.slug,
        displayName: vehicle.displayName,
        yearFrom: vehicle.yearFrom,
        yearTo: vehicle.yearTo,
      },
      products: items.map(withProductSaleComputed),
      data: items.map(withProductSaleComputed),
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to list car products." },
      { status: 500 }
    );
  }
}

export async function POST(request, context) {
  try {
    const user = getRequestUser(request);
    const denied = denyUnlessMinRole(user, "editor");
    if (denied) return denied;
    const { id, modelId } = await context.params;
    const body = await request.json();
    const rawIds = Array.isArray(body.productIds)
      ? body.productIds
      : body.productId
        ? [body.productId]
        : [];
    const productIds = [
      ...new Set(
        rawIds
          .map((pid) => String(pid || "").trim())
          .filter((pid) => mongoose.Types.ObjectId.isValid(pid))
      ),
    ];
    if (!productIds.length) {
      return NextResponse.json(
        { success: false, error: "Provide productId or productIds[]." },
        { status: 400 }
      );
    }

    await dbConnect();
    const resolved = await resolveMakeAndModel(id, modelId);
    if (resolved.error) {
      return NextResponse.json({ success: false, error: resolved.error }, { status: resolved.status });
    }
    const { make, model } = resolved;
    const vehicle = await ensureVehicle(make, model);
    const row = fitmentRow(make, model, vehicle);
    const vehicleOid = new mongoose.Types.ObjectId(String(vehicle._id));

    let modified = 0;
    for (const pid of productIds) {
      const product = await Product.findById(pid);
      if (!product) continue;

      const ids = (product.compatibleVehicles || []).map(String);
      if (!ids.includes(String(vehicleOid))) {
        product.compatibleVehicles = [...(product.compatibleVehicles || []), vehicleOid];
      }

      const cars = Array.isArray(product.compatibleCars) ? product.compatibleCars : [];
      const hasCar = cars.some((c) => sameFitmentGeneration(c, row));
      if (!hasCar) {
        product.compatibleCars = [...cars, row];
      }

      const vc = product.vehicleCompatibility || {};
      const vehicles = Array.isArray(vc.vehicles) ? [...vc.vehicles] : [];
      const hasVc = vehicles.some((c) => sameFitmentGeneration(c, row));
      if (!hasVc) {
        vehicles.push({
          make: row.make,
          model: row.model,
          yearFrom: row.yearFrom,
          yearTo: row.yearTo,
          bodyStyle: model.bodyStyle || "",
          notes: row.generation || "",
        });
      }
      product.vehicleCompatibility = {
        ...vc,
        fitmentType: vc.fitmentType === "universal" ? "universal" : "specific",
        vehicles,
      };
      if (product.isUniversal && product.vehicleCompatibility.fitmentType === "specific") {
        // keep isUniversal as-is; storefront OR includes both
      }

      await product.save();
      modified += 1;
    }

    return NextResponse.json({
      success: true,
      message:
        productIds.length === 1
          ? "Product added to this car."
          : `${productIds.length} products added to this car.`,
      productIds,
      vehicleId: String(vehicle._id),
      modified,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to add product." },
      { status: 500 }
    );
  }
}

export async function DELETE(request, context) {
  try {
    const user = getRequestUser(request);
    const denied = denyUnlessMinRole(user, "editor");
    if (denied) return denied;
    const { id, modelId } = await context.params;

    const { searchParams } = new URL(request.url);
    let productIds = [];
    const singleQs = (searchParams.get("productId") || "").trim();
    if (singleQs) productIds.push(singleQs);
    const multiQs = searchParams.getAll("productIds").flatMap((v) => String(v || "").split(","));
    productIds.push(...multiQs);
    try {
      const body = await request.json();
      if (body.productId) productIds.push(String(body.productId));
      if (Array.isArray(body.productIds)) productIds.push(...body.productIds.map(String));
    } catch {
      /* no body */
    }
    productIds = [
      ...new Set(
        productIds
          .map((pid) => String(pid || "").trim())
          .filter((pid) => mongoose.Types.ObjectId.isValid(pid))
      ),
    ];
    if (!productIds.length) {
      return NextResponse.json(
        { success: false, error: "Provide productId or productIds[]." },
        { status: 400 }
      );
    }

    await dbConnect();
    const resolved = await resolveMakeAndModel(id, modelId);
    if (resolved.error) {
      return NextResponse.json({ success: false, error: resolved.error }, { status: resolved.status });
    }
    const { make, model } = resolved;
    const vehicle = await ensureVehicle(make, model);
    const row = fitmentRow(make, model, vehicle);
    const vehicleIdStr = String(vehicle._id);

    let removed = 0;
    for (const productId of productIds) {
      const product = await Product.findById(productId);
      if (!product) continue;

      product.compatibleVehicles = (product.compatibleVehicles || []).filter(
        (v) => String(v) !== vehicleIdStr
      );
      product.compatibleCars = (product.compatibleCars || []).filter(
        (c) => !sameFitmentGeneration(c, row)
      );
      if (product.vehicleCompatibility?.vehicles) {
        product.vehicleCompatibility.vehicles = product.vehicleCompatibility.vehicles.filter(
          (c) => !sameFitmentGeneration(c, row)
        );
        product.markModified("vehicleCompatibility");
      }
      await product.save();
      removed += 1;
    }

    return NextResponse.json({
      success: true,
      message:
        removed === 1
          ? "Product removed from this car."
          : `${removed} products removed from this car.`,
      productIds,
      removed,
      vehicleId: vehicleIdStr,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to remove product." },
      { status: 500 }
    );
  }
}
