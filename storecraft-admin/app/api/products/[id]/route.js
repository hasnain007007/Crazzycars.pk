/**
 * Single product: read, update (inventory triggers stock alerts), delete.
 */
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { logActivity } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import { denyUnlessCapability } from "@/lib/denyCapability";
import { hasCapability, stripProductCostFields } from "@/lib/permissions";
import { isBodyKitProduct } from "@/lib/codEligibility";
import { normalizeMetaKeywords } from "@/lib/seoKeywords";
import { slugify } from "@/lib/slugify";
import Product from "@/lib/models/Product.model";
import StockAlert from "@/lib/models/StockAlert.model";
// Ensure Vehicle is registered before populate("compatibleVehicles")
import "@/lib/models/Vehicle.model";
import {
  normalizeAddOns,
  normalizeRecommendedProductIds,
  normalizeCustomSizing,
  normalizeMediaVideos,
  normalizeVariations,
  normalizeProductCategoryIds,
  normalizeProductOrganisation,
} from "@/lib/productPayload";
import { sanitizeMediaImages, syncStockAlertForProduct } from "@/lib/productMutations";
import { withProductSaleComputed } from "@/lib/productSale";
import { buildVehicleCompatibilityPayload, vehicleCompatibilityFromProduct } from "@/lib/vehicleCompatibility";
import { resolveCompatibleVehicleIds } from "@/lib/syncCompatibleVehicles";
import { revalidateStorefront } from "@/lib/revalidateStorefront";

/** Homepage Best Sellers / Hot Deals are ISR-cached — purge after flag or catalog changes. */
const HOMEPAGE_REVALIDATE_PATHS = ["/", "/api/homepage", "/api/products", "/api/products/deals"];

function maybeStripProductCosts(user, product) {
  if (hasCapability(user, "canViewProductCosts")) return product;
  return stripProductCostFields(product);
}

async function uniqueProductSlugExcluding(base, excludeId) {
  const root = slugify(base || "product") || "product";
  let slug = root;
  for (let i = 0; i < 5000; i += 1) {
    const exists = await Product.findOne({ slug, _id: { $ne: excludeId } }).select("_id").lean();
    if (!exists) return slug;
    slug = `${root}-${i + 1}`;
  }
  throw new Error("Could not allocate unique slug.");
}

function requestIp(request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
}

export async function GET(request, context) {
  try {
    const user = getRequestUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid id." }, { status: 400 });
    }
    await dbConnect();
    const doc = await Product.findById(id)
      .populate("categories", "name slug")
      .populate("recommendedProducts", "name slug status media.images")
      .populate("compatibleVehicles", "make model yearFrom yearTo displayName generation")
      .lean();
    if (!doc) {
      return NextResponse.json({ success: false, error: "Not found." }, { status: 404 });
    }
    // Hydrate embedded fitment rows from Vehicle refs so the editor table is never empty
    // when compatibleVehicles are linked (CSV/seed imports often skip vehicleCompatibility.vehicles).
    const fit = vehicleCompatibilityFromProduct(doc);
    const data = maybeStripProductCosts(
      user,
      withProductSaleComputed({
        ...doc,
        isUniversal: fit.fitmentType === "universal",
        vehicleCompatibility: {
          fitmentType: fit.fitmentType,
          universalNote: fit.universalNote,
          vehicles: fit.vehicles.map(({ _rowId, ...rest }) => rest),
          categories: fit.categories || [],
        },
        compatibleCars:
          fit.fitmentType === "universal"
            ? []
            : fit.vehicles.map((v) => ({
                make: v.make,
                model: v.model,
                generation: v.notes || "",
                yearFrom: v.yearFrom,
                yearTo: v.yearTo,
              })),
      })
    );
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load product." },
      { status: 500 }
    );
  }
}

export async function PUT(request, context) {
  try {
    const user = getRequestUser(request);
    const denied = denyUnlessCapability(user, "canManageCatalog");
    if (denied) return denied;
    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid id." }, { status: 400 });
    }
    await dbConnect();
    const existing = await Product.findById(id);
    if (!existing) {
      return NextResponse.json({ success: false, error: "Not found." }, { status: 404 });
    }

    const body = await request.json();

    /** Single-flag toggles from products list (Featured / Hot Deal) */
    const keys = Object.keys(body || {});
    if (keys.length === 1 && (keys[0] === "featured" || keys[0] === "isDeal")) {
      if (keys[0] === "featured") {
        existing.featured = Boolean(body.featured);
        existing.isFeatured = existing.featured;
      } else {
        existing.isDeal = Boolean(body.isDeal);
      }
      await existing.save();
      await logActivity({
        user: user.userId,
        userName: user.name,
        action:
          keys[0] === "featured" ? "Product featured flag updated" : "Product hot deal flag updated",
        resource: "Product",
        resourceId: id,
        details:
          keys[0] === "featured"
            ? { featured: existing.featured }
            : { isDeal: existing.isDeal },
        type: "update",
        ip: requestIp(request),
      });
      const revalidated = await revalidateStorefront(HOMEPAGE_REVALIDATE_PATHS);
      const lean = await Product.findById(id)
        .populate("categories", "name slug")
        .populate("compatibleVehicles", "make model yearFrom yearTo displayName generation")
        .lean();
      return NextResponse.json({
        success: true,
        data: withProductSaleComputed(lean),
        revalidated,
      });
    }

    const name = (body.name ?? existing.name).trim();
    if (!name) {
      return NextResponse.json({ success: false, error: "Name is required." }, { status: 400 });
    }
    const regularPrice = Number(body.pricing?.regularPrice ?? existing.pricing?.regularPrice);
    if (!Number.isFinite(regularPrice) || regularPrice < 0) {
      return NextResponse.json({ success: false, error: "Valid regular price is required." }, { status: 400 });
    }

    let slug = existing.slug;
    if (body.slug !== undefined) {
      const want = slugify(body.slug || name) || slugify(name);
      slug = want === existing.slug ? existing.slug : await uniqueProductSlugExcluding(want, existing._id);
    }

    const categories =
      body.categories !== undefined
        ? normalizeProductCategoryIds(body.categories)
        : (existing.categories || []).map((c) => new mongoose.Types.ObjectId(String(c)));

    existing.name = name;
    existing.slug = slug;
    existing.articleNo = body.articleNo !== undefined ? String(body.articleNo || "").trim() : existing.articleNo;
    if (body.ean !== undefined) {
      existing.ean = body.ean || "";
    }
    existing.categories = categories;
    existing.shortDescription =
      body.shortDescription !== undefined ? String(body.shortDescription || "").trim().slice(0, 300) : existing.shortDescription;
    existing.longDescription =
      body.longDescription !== undefined ? String(body.longDescription || "") : existing.longDescription;

    const spIn = body.pricing?.salePrice;
    let saleNext = existing.pricing?.salePrice;
    if (body.pricing !== undefined) {
      if (spIn === null || spIn === "") saleNext = undefined;
      else if (spIn !== undefined && spIn !== null) saleNext = Number(spIn);
    }
    let costNext = Number(existing.pricing?.costPerItem) || 0;
    if (body.pricing !== undefined && body.pricing.costPerItem !== undefined) {
      if (hasCapability(user, "canViewProductCosts")) {
        const c = body.pricing.costPerItem;
        costNext = c === null || c === "" ? 0 : Math.max(0, Number(c) || 0);
      }
      // else: ignore cost writes from non-owners
    }
    const saleScheduleIn = body.pricing?.saleSchedule;
    let saleScheduleNext = existing.pricing?.saleSchedule
      ? {
          enabled: Boolean(existing.pricing.saleSchedule.enabled),
          startDate: existing.pricing.saleSchedule.startDate || undefined,
          endDate: existing.pricing.saleSchedule.endDate || undefined,
        }
      : { enabled: false, startDate: undefined, endDate: undefined };

    if (body.pricing !== undefined && saleScheduleIn !== undefined) {
      saleScheduleNext = {
        enabled: Boolean(saleScheduleIn.enabled),
        startDate: saleScheduleIn.startDate ? new Date(saleScheduleIn.startDate) : undefined,
        endDate: saleScheduleIn.endDate ? new Date(saleScheduleIn.endDate) : undefined,
      };
    }

    existing.pricing = {
      regularPrice,
      salePrice: saleNext,
      costPerItem: costNext,
      saleSchedule: saleScheduleNext,
    };

    const incomingQuantity = body.inventory?.quantity ?? body.inventory?.stock ?? body.inventory?.stockQuantity;
    const incomingTrackInventory = body.inventory?.trackInventory ?? body.inventory?.trackQuantity;
    existing.inventory = {
      quantity: Math.max(0, Number(incomingQuantity ?? existing.inventory?.quantity) || 0),
      weight:
        body.inventory?.weight != null && body.inventory.weight !== ""
          ? Number(body.inventory.weight)
          : existing.inventory?.weight,
      weightUnit: ["kg", "g", "lb", "oz"].includes(body.inventory?.weightUnit)
        ? body.inventory.weightUnit
        : existing.inventory?.weightUnit || "g",
      trackInventory:
        incomingTrackInventory !== undefined ? incomingTrackInventory !== false : existing.inventory?.trackInventory !== false,
      allowBackorder:
        body.inventory?.allowBackorder !== undefined
          ? body.inventory.allowBackorder === true
          : existing.inventory?.allowBackorder === true,
      lowStockThreshold: Math.max(
        0,
        Number(body.inventory?.lowStockThreshold ?? existing.inventory?.lowStockThreshold) || 5
      ),
      sku: body.inventory?.sku !== undefined ? String(body.inventory.sku || "").trim() : existing.inventory?.sku || "",
    };

    const mediaOwner = {
      name: existing.name,
      slug: existing.slug,
      isUniversal: Boolean(existing.isUniversal),
    };
    if (body.media !== undefined) {
      existing.media = {
        images: sanitizeMediaImages(body.media?.images, mediaOwner),
        videos: normalizeMediaVideos(body.media?.videos),
        videoUrl: String(body.media?.videoUrl || "").trim(),
        videoType: ["youtube", "mp4"].includes(body.media?.videoType) ? body.media.videoType : "",
      };
    } else {
      existing.media = {
        images: sanitizeMediaImages(existing.media?.images, mediaOwner),
        videos: normalizeMediaVideos(existing.media?.videos),
        videoUrl: String(existing.media?.videoUrl || "").trim(),
        videoType: ["youtube", "mp4"].includes(existing.media?.videoType)
          ? existing.media.videoType
          : "",
      };
    }
    if (body.variations !== undefined) {
      existing.variations = normalizeVariations(body.variations);
    }
    if (body.simpleVariations !== undefined) {
      existing.simpleVariations = Array.isArray(body.simpleVariations) ? body.simpleVariations : [];
    }
    if (body.variationCombinations !== undefined) {
      existing.variationCombinations = Array.isArray(body.variationCombinations) ? body.variationCombinations : [];
    }
    if (body.customSizing !== undefined) {
      existing.customSizing = normalizeCustomSizing(body.customSizing);
    }
    if (body.addOns !== undefined) {
      existing.addOns = normalizeAddOns(body.addOns);
    }
    if (body.recommendedProducts !== undefined) {
      existing.recommendedProducts = normalizeRecommendedProductIds(body.recommendedProducts, {
        excludeId: id,
      });
    }
    if (body.features !== undefined) {
      existing.features = Array.isArray(body.features)
        ? body.features.map((s) => String(s || "").trim()).filter(Boolean)
        : [];
    }
    if (body.specifications !== undefined) {
      existing.specifications = Array.isArray(body.specifications)
        ? body.specifications
            .filter((s) => s && (s.label || s.value))
            .map((s) => ({ label: String(s.label || "").trim(), value: String(s.value || "").trim() }))
        : [];
    }
    if (body.seo !== undefined) {
      existing.seo = {
        metaTitle: (body.seo.metaTitle || "").trim(),
        metaDescription: (body.seo.metaDescription || "").trim(),
        metaKeywords: normalizeMetaKeywords(body.seo.metaKeywords),
      };
    }
    if (body.status !== undefined && ["active", "inactive", "draft"].includes(body.status)) {
      existing.status = body.status;
    }
    if (body.featured !== undefined) {
      existing.featured = Boolean(body.featured);
      existing.isFeatured = existing.featured;
    }
    if (body.isDeal !== undefined) existing.isDeal = Boolean(body.isDeal);
    if (body.newArrival !== undefined) existing.newArrival = Boolean(body.newArrival);
    if (body.codEnabled !== undefined) existing.codEnabled = body.codEnabled !== false;
    if (isBodyKitProduct({ name: body.name ?? existing.name, slug: body.slug ?? existing.slug })) {
      existing.codEnabled = false;
    }
    if (body.advancePercentRequired !== undefined) {
      const pct = Number(body.advancePercentRequired);
      existing.advancePercentRequired = Number.isFinite(pct)
        ? Math.min(100, Math.max(0, Math.round(pct)))
        : 0;
    }

    if (body.productType !== undefined) {
      existing.productType = normalizeProductOrganisation({ productType: body.productType }).productType;
    }
    if (body.vendor !== undefined) {
      existing.vendor = normalizeProductOrganisation({ vendor: body.vendor }).vendor;
    }
    if (body.collections !== undefined) {
      existing.collections = normalizeProductOrganisation({ collections: body.collections }).collections;
      existing.markModified("collections");
    }
    if (body.tags !== undefined) {
      existing.tags = normalizeProductOrganisation({ tags: body.tags }).tags;
      existing.markModified("tags");
    }

    if (
      body.vehicleCompatibility !== undefined ||
      body.isUniversal !== undefined ||
      body.compatibleCars !== undefined
    ) {
      const fitPayload = buildVehicleCompatibilityPayload(
        body.vehicleCompatibility ?? {
          fitmentType: body.isUniversal ? "universal" : "specific",
          vehicles: body.compatibleCars,
        }
      );
      existing.vehicleCompatibility = fitPayload.vehicleCompatibility;
      existing.isUniversal = fitPayload.isUniversal;
      existing.compatibleCars = fitPayload.compatibleCars;
      existing.compatibleVehicles = fitPayload.isUniversal
        ? []
        : await resolveCompatibleVehicleIds(fitPayload.vehicleCompatibility.vehicles || []);
      existing.markModified("vehicleCompatibility");
      existing.markModified("compatibleCars");
      existing.markModified("compatibleVehicles");
    }

    existing.markModified("pricing");
    existing.markModified("inventory");
    existing.markModified("media");
    existing.markModified("variations");
    existing.markModified("simpleVariations");
    existing.markModified("variationCombinations");
    existing.markModified("customSizing");
    existing.markModified("addOns");
    existing.markModified("recommendedProducts");
    existing.markModified("specifications");
    existing.markModified("seo");

    if (existing.status === "active" && !String(existing.articleNo || "").trim()) {
      return NextResponse.json(
        { success: false, error: "Article number is required for Active products." },
        { status: 400 }
      );
    }

    await existing.save();
    await syncStockAlertForProduct(existing);

    await logActivity({
      user: user.userId,
      userName: user.name,
      action: "Product updated",
      resource: "Product",
      resourceId: id,
      details: { name: existing.name, slug: existing.slug },
      type: "update",
      ip: requestIp(request),
    });

    const revalidated = await revalidateStorefront(HOMEPAGE_REVALIDATE_PATHS);

    const populated = await Product.findById(id)
      .populate("categories", "name slug")
      .populate("recommendedProducts", "name slug status media.images")
      .populate("compatibleVehicles", "make model yearFrom yearTo displayName generation")
      .lean();
    return NextResponse.json({
      success: true,
      data: withProductSaleComputed(populated),
      revalidated,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update product." },
      { status: 500 }
    );
  }
}

export async function DELETE(request, context) {
  try {
    const user = getRequestUser(request);
    const denied = denyUnlessCapability(user, "canManageCatalog");
    if (denied) return denied;
    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid id." }, { status: 400 });
    }
    await dbConnect();
    const existing = await Product.findById(id).lean();
    if (!existing) {
      return NextResponse.json({ success: false, error: "Not found." }, { status: 404 });
    }

    await Promise.all([Product.deleteOne({ _id: id }), StockAlert.deleteMany({ product: id })]);

    await logActivity({
      user: user.userId,
      userName: user.name,
      action: "Product deleted",
      resource: "Product",
      resourceId: id,
      details: { name: existing.name },
      type: "delete",
      ip: requestIp(request),
    });

    const revalidated = await revalidateStorefront(HOMEPAGE_REVALIDATE_PATHS);

    return NextResponse.json({ success: true, data: { id }, revalidated });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete product." },
      { status: 500 }
    );
  }
}
