import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import { denyUnlessAnyCapability } from "@/lib/denyCapability";
import { checkCloudinaryHealth, clearCloudinaryHealthCache } from "@/lib/cloudinaryHealth";
import { cloudNameFromUrl } from "@/lib/cloudinaryConfig";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store, no-cache, must-revalidate" };

async function sampleProductImageUrl() {
  try {
    await dbConnect();
    const doc = await mongoose.connection.db.collection("products").findOne(
      { "media.images.0.url": { $regex: /res\.cloudinary\.com/i } },
      { projection: { "media.images.url": 1 } }
    );
    const url = doc?.media?.images?.[0]?.url;
    return typeof url === "string" ? url : "";
  } catch {
    return "";
  }
}

async function catalogCloudCounts() {
  try {
    await dbConnect();
    const products = await mongoose.connection.db
      .collection("products")
      .find({}, { projection: { "media.images.url": 1 } })
      .toArray();
    const clouds = {};
    let withImages = 0;
    let empty = 0;
    for (const p of products) {
      const imgs = Array.isArray(p.media?.images) ? p.media.images : [];
      const urls = imgs.map((i) => (typeof i === "string" ? i : i?.url)).filter(Boolean);
      if (!urls.length) {
        empty += 1;
        continue;
      }
      withImages += 1;
      for (const u of urls) {
        const c = cloudNameFromUrl(u) || "other";
        clouds[c] = (clouds[c] || 0) + 1;
      }
    }
    return { productCount: products.length, withImages, empty, urlClouds: clouds };
  } catch {
    return null;
  }
}

export async function GET(request) {
  const user = getRequestUser(request);
  const denied = denyUnlessAnyCapability(user, [
    "canViewOrders",
    "canManageCatalog",
    "canManageContent",
    "canManageSettings",
  ]);
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const refresh = searchParams.get("refresh") === "1";
  if (refresh) clearCloudinaryHealthCache();

  const sampleUrl = await sampleProductImageUrl();
  const health = await checkCloudinaryHealth({ sampleUrl, bypassCache: refresh });
  const catalog = await catalogCloudCounts();

  return NextResponse.json(
    {
      success: true,
      data: {
        ...health,
        catalog,
      },
    },
    { status: 200, headers: NO_STORE }
  );
}
