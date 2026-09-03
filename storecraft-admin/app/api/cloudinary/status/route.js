import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import { denyUnlessAnyCapability } from "@/lib/denyCapability";
import { checkMediaHealth, clearMediaHealthCache, cloudNameFromUrl } from "@/lib/mediaHealth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store, no-cache, must-revalidate" };

function hostKeyFromUrl(url) {
  const u = String(url || "");
  if (/\/media\//i.test(u) || u.startsWith("/media/")) return "media";
  const cld = cloudNameFromUrl(u);
  if (cld) return cld;
  try {
    return new URL(u).hostname || "other";
  } catch {
    return "other";
  }
}

async function sampleProductImageUrl() {
  try {
    await dbConnect();
    const doc = await mongoose.connection.db.collection("products").findOne(
      { "media.images.0.url": { $exists: true } },
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
        const c = hostKeyFromUrl(u);
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
  if (refresh) clearMediaHealthCache();

  const sampleUrl = await sampleProductImageUrl();
  const catalog = await catalogCloudCounts();
  const health = await checkMediaHealth({ sampleUrl, bypassCache: refresh, catalog });

  return NextResponse.json(
    {
      success: true,
      data: health,
    },
    { status: 200, headers: NO_STORE }
  );
}
