import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { getCloudinaryCloudName } from "@/lib/cloudinaryConfig";
import { getRequestUser } from "@/lib/getRequestUser";
import { denyUnlessAnyCapability } from "@/lib/denyCapability";
import { checkCloudinaryHealth, hasCloudinaryCredentials } from "@/lib/cloudinaryHealth";

const FOLDER_MAP = {
  blog: "storecraft/blog/images",
  logo: "storecraft/settings/logo",
  general: "storecraft/uploads",
};

export async function GET(req) {
  try {
    const user = getRequestUser(req);
    const denied = denyUnlessAnyCapability(user, ["canManageCatalog", "canManageContent"]);
    if (denied) return denied;

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

    cloudinary.config({
      cloud_name: getCloudinaryCloudName(),
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    const timestamp = Math.round(Date.now() / 1000);
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "blog";
    const folder = FOLDER_MAP[type] || FOLDER_MAP.general;

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
    });
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
