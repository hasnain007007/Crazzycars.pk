/**
 * Products: list (filters + stats) and create.
 */
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { logActivity } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import { denyUnlessMinRole } from "@/lib/requireRole";
import { normalizeMetaKeywords } from "@/lib/seoKeywords";
import { slugify } from "@/lib/slugify";
import Product from "@/lib/models/Product.model";
import {
  normalizeAddOns,
  normalizeCustomSizing,
  normalizeMediaVideos,
  normalizeVariations,
  normalizeProductCategoryIds,
  normalizeProductOrganisation,
} from "@/lib/productPayload";
import { sanitizeMediaImages, syncStockAlertForProduct } from "@/lib/productMutations";
import { withProductSaleComputed } from "@/lib/productSale";
import { buildVehicleCompatibilityPayload } from "@/lib/vehicleCompatibility";

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function uniqueProductSlug(base, excludeId) {
  const root = slugify(base || "product") || "product";
  let slug = root;
  const exclude = excludeId ? { _id: { $ne: excludeId } } : {};
  for (let i = 0; i < 5000; i += 1) {
    const exists = await Product.findOne({ slug, ...exclude }).select("_id").lean();
    if (!exists) return slug;
    slug = `${root}-${i + 1}`;
  }
  throw new Error("Could not allocate unique slug.");
}

function requestIp(request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
}

export async function GET(request) {
  try {
    const user = getRequestUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const lite = searchParams.get("lite") === "1" || searchParams.get("lite") === "true";
    const includeStats =
      !lite &&
      (searchParams.get("includeStats") === "1" ||
        searchParams.get("includeStats") === "true" ||
        searchParams.get("stats") !== "0");
    const page = Math.max(1, parseInt(searchParams.get("page"), 10) || 1);
    const maxLimit = lite ? 500 : 100;
    const limit = Math.min(maxLimit, Math.max(1, parseInt(searchParams.get("limit"), 10) || (lite ? 500 : 50)));
    const search = (searchParams.get("search") || searchParams.get("q") || "").trim();
    const status = (searchParams.get("status") || "").trim();
    const categoryId = (searchParams.get("category") || "").trim();

    const filter = {};
    if (search) {
      const rx = new RegExp(escapeRegex(search), "i");
      filter.$or = [
        { name: rx },
        { slug: rx },
        { articleNo: rx },
        { "inventory.sku": rx },
        { shortDescription: rx },
        { tags: rx },
        { "compatibleCars.make": rx },
        { "compatibleCars.model": rx },
        { "vehicleCompatibility.vehicles.make": rx },
        { "vehicleCompatibility.vehicles.model": rx },
      ];
    }
    if (status && ["active", "inactive", "draft"].includes(status)) {
      filter.status = status;
    }
    if (categoryId && mongoose.Types.ObjectId.isValid(categoryId)) {
      filter.categories = categoryId;
    }

    const skip = (page - 1) * limit;
    const selectFields = lite
      ? "name status media.images pricing.regularPrice pricing.salePrice pricing.saleSchedule inventory.quantity inventory.sku articleNo"
      : "name slug status media pricing inventory featured newArrival createdAt updatedAt categories articleNo vehicleCompatibility isUniversal compatibleCars shortDescription tags";

    const listQuery = Product.find(filter)
      .select(selectFields)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    if (!lite) {
      listQuery.populate("categories", "name slug");
    }

    const tasks = [listQuery, Product.countDocuments(filter)];
    if (includeStats) {
      tasks.push(
        Product.countDocuments({}),
        Product.countDocuments({ status: "active" }),
        Product.countDocuments({ status: "draft" }),
        Product.countDocuments({
          $and: [
            { $or: [{ "inventory.trackInventory": true }, { "inventory.trackInventory": { $exists: false } }] },
            {
              $expr: {
                $lte: [
                  { $toDouble: { $ifNull: ["$inventory.quantity", 0] } },
                  { $toDouble: { $ifNull: ["$inventory.lowStockThreshold", 5] } },
                ],
              },
            },
          ],
        })
      );
    }

    const results = await Promise.all(tasks);
    const items = results[0];
    const total = results[1];

    const payload = {
      success: true,
      data: items.map(withProductSaleComputed),
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    };

    if (includeStats) {
      payload.stats = {
        total: results[2],
        active: results[3],
        draft: results[4],
        lowStock: results[5],
      };
    }

    return NextResponse.json(payload, {
      headers: lite
        ? { "Cache-Control": "private, max-age=15" }
        : undefined,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to list products." },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const user = getRequestUser(request);
    const denied = denyUnlessMinRole(user, "editor");
    if (denied) return denied;
    await dbConnect();
    const body = await request.json();
    const name = (body.name || "").trim();
    if (!name) {
      return NextResponse.json({ success: false, error: "Name is required." }, { status: 400 });
    }
    const regularPrice = Number(body.pricing?.regularPrice);
    if (!Number.isFinite(regularPrice) || regularPrice < 0) {
      return NextResponse.json({ success: false, error: "Valid regular price is required." }, { status: 400 });
    }

    const statusNext = ["active", "inactive", "draft"].includes(body.status) ? body.status : "draft";
    const articleTrim = String(body.articleNo || "").trim();
    if (statusNext === "active" && !articleTrim) {
      return NextResponse.json(
        { success: false, error: "Article number is required for Active products." },
        { status: 400 }
      );
    }

    let slug = await uniqueProductSlug(body.slug || name);
    const categories = normalizeProductCategoryIds(body.categories);

    const org = normalizeProductOrganisation(body);
    const fitPayload = buildVehicleCompatibilityPayload(body.vehicleCompatibility);

    const doc = await Product.create({
      name,
      slug,
      articleNo: articleTrim,
      ean: body.ean || "",
      categories,
      shortDescription: (body.shortDescription || "").trim().slice(0, 300),
      longDescription: typeof body.longDescription === "string" ? body.longDescription : "",
      pricing: {
        regularPrice,
        salePrice:
          body.pricing?.salePrice != null && body.pricing.salePrice !== ""
            ? Number(body.pricing.salePrice)
            : undefined,
        costPerItem: Math.max(
          0,
          Number(
            body.pricing?.costPerItem != null && body.pricing.costPerItem !== ""
              ? body.pricing.costPerItem
              : 0
          ) || 0
        ),
        saleSchedule: (() => {
          const ss = body.pricing?.saleSchedule;
          if (!ss) return { enabled: false };
          return {
            enabled: Boolean(ss.enabled),
            startDate: ss.startDate ? new Date(ss.startDate) : undefined,
            endDate: ss.endDate ? new Date(ss.endDate) : undefined,
          };
        })(),
      },
      inventory: {
        quantity: Math.max(0, Number(body.inventory?.quantity) || 0),
        weight: body.inventory?.weight != null && body.inventory.weight !== "" ? Number(body.inventory.weight) : undefined,
        weightUnit: ["kg", "g", "lb", "oz"].includes(body.inventory?.weightUnit)
          ? body.inventory.weightUnit
          : "g",
        trackInventory: body.inventory?.trackInventory !== false,
        allowBackorder: body.inventory?.allowBackorder === true,
        lowStockThreshold: Math.max(0, Number(body.inventory?.lowStockThreshold) || 5),
        sku: (body.inventory?.sku || "").trim(),
      },
      media: {
        images: sanitizeMediaImages(body.media?.images),
        videos: normalizeMediaVideos(body.media?.videos),
        videoUrl: String(body.media?.videoUrl || "").trim(),
        videoType: ["youtube", "mp4"].includes(body.media?.videoType) ? body.media.videoType : "",
      },
      variations: normalizeVariations(body.variations),
      simpleVariations: Array.isArray(body.simpleVariations) ? body.simpleVariations : [],
      variationCombinations: Array.isArray(body.variationCombinations) ? body.variationCombinations : [],
      customSizing: normalizeCustomSizing(body.customSizing),
      addOns: normalizeAddOns(body.addOns),
      features: Array.isArray(body.features) ? body.features.map((s) => String(s || "").trim()).filter(Boolean) : [],
      specifications: Array.isArray(body.specifications)
        ? body.specifications.filter((s) => s && (s.label || s.value)).map((s) => ({ label: String(s.label || "").trim(), value: String(s.value || "").trim() }))
        : [],
      seo: {
        metaTitle: (body.seo?.metaTitle || "").trim(),
        metaDescription: (body.seo?.metaDescription || "").trim(),
        metaKeywords: normalizeMetaKeywords(body.seo?.metaKeywords),
      },
      status: statusNext,
      featured: Boolean(body.featured),
      newArrival: Boolean(body.newArrival),
      codEnabled: body.codEnabled !== false,
      advancePercentRequired: (() => {
        const pct = Number(body.advancePercentRequired);
        return Number.isFinite(pct) ? Math.min(100, Math.max(0, Math.round(pct))) : 0;
      })(),
      productType: org.productType,
      vendor: org.vendor,
      collections: org.collections,
      tags: org.tags,
      vehicleCompatibility: fitPayload.vehicleCompatibility,
      isUniversal: fitPayload.isUniversal,
      compatibleCars: fitPayload.compatibleCars,
    });

    await syncStockAlertForProduct(doc);

    await logActivity({
      user: user.userId,
      userName: user.name,
      action: "Product created",
      resource: "Product",
      resourceId: doc._id.toString(),
      details: { name: doc.name, slug: doc.slug },
      type: "create",
      ip: requestIp(request),
    });

    const populated = await Product.findById(doc._id).populate("categories", "name slug").lean();
    return NextResponse.json({ success: true, data: withProductSaleComputed(populated) }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create product." },
      { status: 500 }
    );
  }
}
