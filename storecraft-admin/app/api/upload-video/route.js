import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { getCloudinaryCloudName } from "@/lib/cloudinaryConfig";
import { getRequestUser } from "@/lib/getRequestUser";
import { denyUnlessAnyCapability } from "@/lib/denyCapability";
import { checkCloudinaryHealth, hasCloudinaryCredentials } from "@/lib/cloudinaryHealth";

function configure() {
  cloudinary.config({
    cloud_name: getCloudinaryCloudName(),
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

async function assertCloudinaryReady() {
  if (!hasCloudinaryCredentials()) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Cloudinary credentials missing. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.",
        code: "cloudinary_missing",
      },
      { status: 503 }
    );
  }
  const health = await checkCloudinaryHealth();
  if (!health.ok && (health.code === "disabled" || health.code === "auth")) {
    return NextResponse.json(
      {
        success: false,
        error: health.message,
        code: `cloudinary_${health.code}`,
        cloudName: health.cloudName,
      },
      { status: 503 }
    );
  }
  return null;
}

export async function GET(req) {
  try {
    const user = getRequestUser(req);
    const denied = denyUnlessAnyCapability(user, ["canManageCatalog", "canManageContent"]);
    if (denied) return denied;

    const blocked = await assertCloudinaryReady();
    if (blocked) return blocked;

    configure();
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "video";
    const timestamp = Math.round(Date.now() / 1000);
    const folder = "storecraft/products/videos";

    const paramsToSign = {
      folder,
      timestamp,
    };

    const signature = cloudinary.utils.api_sign_request(paramsToSign, process.env.CLOUDINARY_API_SECRET);

    return NextResponse.json({
      success: true,
      signature,
      timestamp,
      folder,
      cloudName: getCloudinaryCloudName(),
      apiKey: process.env.CLOUDINARY_API_KEY,
      resourceType: type,
    });
  } catch (e) {
    console.error("Signature error:", e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const user = getRequestUser(req);
    const denied = denyUnlessAnyCapability(user, ["canManageCatalog", "canManageContent", "canManageOrders"]);
    if (denied) return denied;

    const blocked = await assertCloudinaryReady();
    if (blocked) return blocked;

    configure();
    const body = await req.json();
    const { publicId } = body;
    if (!publicId) {
      return NextResponse.json({ success: false, error: "publicId required" }, { status: 400 });
    }
    const thumbnailUrl = cloudinary.url(publicId, {
      resource_type: "video",
      format: "jpg",
      transformation: [{ start_offset: "0" }, { width: 800, crop: "scale" }, { quality: "auto" }],
    });
    return NextResponse.json({
      success: true,
      thumbnail: thumbnailUrl,
    });
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const user = getRequestUser(req);
    const denied = denyUnlessAnyCapability(user, ["canManageCatalog", "canManageContent", "canManageOrders"]);
    if (denied) return denied;

    const blocked = await assertCloudinaryReady();
    if (blocked) return blocked;

    configure();
    const body = await req.json();
    const { publicId, resourceType } = body;
    if (!publicId) {
      return NextResponse.json({ success: false, error: "publicId required" }, { status: 400 });
    }
    await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType || "video",
    });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
