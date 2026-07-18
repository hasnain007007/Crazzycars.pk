import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { getCloudinaryCloudName } from "@/lib/cloudinaryConfig";

cloudinary.config({
  cloud_name: getCloudinaryCloudName(),
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const FOLDER_MAP = {
  blog: "storecraft/blog/images",
  logo: "storecraft/settings/logo",
  general: "storecraft/uploads",
};

export async function GET(req) {
  try {
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
