/**
 * POST /api/social/posts/[id]/images — upload 1–10 images (multipart), process with sharp.
 * DELETE — remove all media for post (or body.order for one file).
 */
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import { denyUnlessAnyCapability } from "@/lib/denyCapability";
import SocialPost from "@/lib/models/SocialPost.model";
import { mediaRootWritable } from "@/lib/mediaStorage";
import {
  MAX_SOCIAL_IMAGES,
  isAllowedSocialImageMime,
  saveProcessedSocialImage,
  deleteSocialPostMedia,
  deleteSocialImageFile,
  probePublicImageUrl,
} from "@/lib/social/imageService";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function loadPost(id) {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;
  return SocialPost.findById(id);
}

export async function POST(request, context) {
  try {
    const user = getRequestUser(request);
    const denied = denyUnlessAnyCapability(user, ["canManageContent", "canManageSettings"]);
    if (denied) return denied;

    const writable = await mediaRootWritable();
    if (!writable.ok) {
      return NextResponse.json(
        {
          success: false,
          error: `Media storage not writable (${writable.root}). Mount MEDIA_ROOT volume.`,
          code: "media_not_writable",
        },
        { status: 503 }
      );
    }

    const { id } = await context.params;
    await dbConnect();
    const post = await loadPost(id);
    if (!post) {
      return NextResponse.json({ success: false, error: "Post not found" }, { status: 404 });
    }

    const formData = await request.formData();
    const files = formData.getAll("files").filter((f) => f && typeof f !== "string");
    const single = formData.get("file");
    if (single && typeof single !== "string") files.push(single);

    if (!files.length) {
      return NextResponse.json(
        { success: false, error: "Upload at least one file (field: files or file)" },
        { status: 400 }
      );
    }

    const existing = Array.isArray(post.images) ? [...post.images] : [];
    if (existing.length + files.length > MAX_SOCIAL_IMAGES) {
      return NextResponse.json(
        {
          success: false,
          error: `Max ${MAX_SOCIAL_IMAGES} images. Already have ${existing.length}.`,
        },
        { status: 400 }
      );
    }

    const replace = String(formData.get("replace") || "") === "1";
    let startOrder = existing.length
      ? Math.max(...existing.map((i) => Number(i.order) || 0)) + 1
      : 1;
    if (replace) {
      await deleteSocialPostMedia(post._id);
      post.images = [];
      startOrder = 1;
    }

    const saved = [];
    let order = startOrder;
    for (const file of files) {
      if (order > MAX_SOCIAL_IMAGES) break;
      const name = file.name || "image.jpg";
      const mime = file.type || "";
      if (!isAllowedSocialImageMime(mime, name)) {
        return NextResponse.json(
          { success: false, error: `Unsupported type for ${name}. Use JPG/PNG/WEBP.` },
          { status: 400 }
        );
      }
      const buffer = Buffer.from(await file.arrayBuffer());
      const img = await saveProcessedSocialImage({
        postId: post._id,
        order,
        buffer,
      });
      saved.push({
        path: img.path,
        url: img.url,
        width: img.width,
        height: img.height,
        order: img.order,
      });
      order += 1;
    }

    post.images = replace ? saved : [...(post.images || []), ...saved];
    post.pushLog("info", `Uploaded ${saved.length} image(s)`);
    await post.save();

    // Probe first URL so admin knows Meta can fetch it
    const probes = [];
    for (const img of saved.slice(0, 3)) {
      probes.push({ url: img.url, ...(await probePublicImageUrl(img.url)) });
    }

    return NextResponse.json({
      success: true,
      images: post.images,
      uploaded: saved,
      probes,
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e.message || "Upload failed" },
      { status: 500 }
    );
  }
}

export async function DELETE(request, context) {
  try {
    const user = getRequestUser(request);
    const denied = denyUnlessAnyCapability(user, ["canManageContent", "canManageSettings"]);
    if (denied) return denied;

    const { id } = await context.params;
    await dbConnect();
    const post = await loadPost(id);
    if (!post) {
      return NextResponse.json({ success: false, error: "Post not found" }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const order = body.order != null ? Number(body.order) : null;

    if (order != null && Number.isFinite(order)) {
      const hit = (post.images || []).find((i) => Number(i.order) === order);
      if (hit?.path) await deleteSocialImageFile(hit.path);
      post.images = (post.images || []).filter((i) => Number(i.order) !== order);
      post.pushLog("info", `Removed image order ${order}`);
    } else {
      await deleteSocialPostMedia(post._id);
      post.images = [];
      post.pushLog("info", "Removed all post images");
    }
    await post.save();
    return NextResponse.json({ success: true, images: post.images });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e.message || "Delete failed" },
      { status: 500 }
    );
  }
}
