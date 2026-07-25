/**
 * Authenticated upload:
 * - Cloudinary whenever credentials are configured
 * - Local disk fallback only in non-production environments
 */
import { randomBytes } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { v2 as cloudinary } from "cloudinary";
import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/getRequestUser";
import { denyUnlessMinRole } from "@/lib/requireRole";
import { getCloudinaryCloudName } from "@/lib/cloudinaryConfig";

function sanitizeFolder(raw) {
  const s = String(raw || "categories")
    .toLowerCase()
    .replace(/[^a-z0-9/_-]/gi, "")
    .replace(/^\/+|\/+$/g, "")
    .replace(/\/{2,}/g, "/");
  return s || "categories";
}

function hasCloudinary() {
  return Boolean(
    getCloudinaryCloudName() &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );
}

function configureCloudinary() {
  cloudinary.config({
    cloud_name: getCloudinaryCloudName(),
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

export async function POST(request) {
  try {
    const user = getRequestUser(request);
    const denied = denyUnlessMinRole(user, "editor");
    if (denied) return denied;

    const formData = await request.formData();
    const file = formData.get("file");
    if (!file || typeof file === "string") {
      return NextResponse.json({ success: false, error: "Missing file field." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (!buffer.length) {
      return NextResponse.json({ success: false, error: "Empty file." }, { status: 400 });
    }

    const folder = sanitizeFolder(formData.get("folder"));
    const originalSize = Number(formData.get("originalSize"));
    const finalSize = Number(formData.get("finalSize"));
    const reportedOriginal = Number.isFinite(originalSize) && originalSize > 0 ? originalSize : buffer.length;
    const reportedFinal = Number.isFinite(finalSize) && finalSize > 0 ? finalSize : buffer.length;

    const mime = typeof file.type === "string" && file.type ? file.type : "image/webp";

    const isProduction = process.env.NODE_ENV === "production";
    const cloudinaryReady = hasCloudinary();

    if (isProduction && !cloudinaryReady) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Cloudinary credentials required in production. Please add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET to environment variables.",
        },
        { status: 500 }
      );
    }

    if (cloudinaryReady) {
      configureCloudinary();
      const dataUri = `data:${mime};base64,${buffer.toString("base64")}`;
      const rawItemName = String(formData.get("itemName") || "").trim();
      const rawImageName = String(formData.get("imageName") || "").trim();
      const imageIndex = String(formData.get("imageIndex") || "1").trim();
      const baseName = rawItemName || rawImageName;
      const cleanName = baseName
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 60);
      const uploadOpts = {
        folder: `storecraft/${folder}`,
        resource_type: "image",
      };
      if (cleanName) {
        uploadOpts.public_id = `${cleanName}-${imageIndex}`;
        uploadOpts.unique_filename = false;
        uploadOpts.overwrite = true;
      }
      const result = await cloudinary.uploader.upload(dataUri, uploadOpts);
      return NextResponse.json({
        success: true,
        data: {
          url: result.secure_url,
          publicId: result.public_id,
          originalSize: reportedOriginal,
          finalSize: reportedFinal,
        },
      });
    }

    // Vercel production is read-only; local fallback is development-only.
    if (isProduction) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Cloudinary credentials required in production. Please add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET to environment variables.",
        },
        { status: 500 }
      );
    }

    const original = file.name || "upload.webp";
    const ext = path.extname(original).slice(0, 8) || ".webp";
    const safeExt = /^\.[a-z0-9]+$/i.test(ext) ? ext.toLowerCase() : ".webp";
    const filename = `${Date.now()}-${randomBytes(6).toString("hex")}${safeExt}`;
    const relativeDir = path.join("public", "uploads", folder);
    const absoluteDir = path.join(process.cwd(), relativeDir);
    await mkdir(absoluteDir, { recursive: true });
    await writeFile(path.join(absoluteDir, filename), buffer);

    const publicUrl = `/uploads/${folder}/${filename}`;
    return NextResponse.json({
      success: true,
      data: {
        url: publicUrl,
        publicId: `local:${folder}/${filename}`,
        originalSize: reportedOriginal,
        finalSize: reportedFinal,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Upload failed." },
      { status: 500 }
    );
  }
}
