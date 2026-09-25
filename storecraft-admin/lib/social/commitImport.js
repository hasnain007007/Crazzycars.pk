/**
 * Move temp import images through sharp into SocialPost media folders and create posts.
 */
import mongoose from "mongoose";
import { readFile } from "fs/promises";
import SocialPost from "@/lib/models/SocialPost.model";
import ImportBatch from "@/lib/models/ImportBatch.model";
import {
  loadImportPreview,
  resolveTmpFile,
} from "@/lib/social/importService";
import { saveProcessedSocialImage, deleteSocialPostMedia } from "@/lib/social/imageService";
import { platformsFromInput } from "@/lib/social/serializePost";
import { weekStartPkt } from "@/lib/social/pktTime";
import { normalizeHashtagList } from "@/lib/social/captions";

export async function commitImport(importId, { userId } = {}) {
  const preview = await loadImportPreview(importId);
  const rows = (preview.rows || []).filter((r) => !r.skip && r.include !== false);
  const errors = [];
  const createdPostIds = [];
  let weekStart = null;
  let firstScheduledAt = null;

  const sessionBatch = await ImportBatch.create({
    fileName: preview.sheetName || "",
    importId,
    rows: rows.length,
    createdPostIds: [],
    errors: [],
    createdBy: userId || null,
  });

  for (const row of rows) {
    if ((row.errors || []).length) {
      errors.push({
        rowNo: row.rowNo,
        postCode: row.data?.postCode,
        message: row.errors.join("; "),
      });
      continue;
    }
    try {
      const data = row.data;
      const scheduledAt = data.scheduledAt ? new Date(data.scheduledAt) : null;
      if (scheduledAt) {
        const ws = weekStartPkt(scheduledAt);
        if (!weekStart) weekStart = ws;
        if (!firstScheduledAt || scheduledAt < firstScheduledAt) firstScheduledAt = scheduledAt;
      }

      const platforms = platformsFromInput(data.platforms);
      const hashtagList = normalizeHashtagList(data.hashtags || []);
      const status = data.status === "draft" ? "draft" : "scheduled";
      const ws = weekStart || (scheduledAt ? weekStartPkt(scheduledAt) : null);

      let post =
        data.postCode && ws
          ? await SocialPost.findOne({ postCode: data.postCode, weekStart: ws })
          : null;
      if (post) {
        await deleteSocialPostMedia(post._id);
        post.images = [];
      } else {
        post = new SocialPost({
          title: data.headline || data.postCode || "Post",
        });
      }

      post.headline = data.headline;
      post.title = data.headline;
      post.postCode = data.postCode;
      post.weekStart = ws;
      post.scheduledAt = scheduledAt;
      post.platforms = platforms;
      post.postType =
        data.postType === "single" || (row.images || []).length <= 1 ? "single" : "carousel";
      post.caption = data.caption;
      post.captionTiktok = data.captionTiktok || "";
      post.hashtagList = hashtagList;
      post.firstComment = data.firstComment || "";
      post.addFooter = data.addFooter !== false;
      post.productUrl = data.productUrl || "";
      post.notes = data.notes || "";
      post.status = status;
      post.importBatchId = sessionBatch._id;
      post.weekPackId = String(sessionBatch._id);
      if (userId) post.createdBy = userId;

      await post.save();

      const images = [];
      let order = 1;
      for (const img of row.images || []) {
        const file = await resolveTmpFile(importId, img.tmpId);
        const buf = await readFile(file.abs);
        const saved = await saveProcessedSocialImage({
          postId: post._id,
          order,
          buffer: buf,
        });
        images.push({
          path: saved.path,
          url: saved.url,
          width: saved.width,
          height: saved.height,
          order: saved.order,
          originalName: file.name,
        });
        order += 1;
      }
      post.images = images;
      if (images.length <= 1) post.postType = "single";
      post.pushLog("info", `Imported from week sheet (${images.length} photos)`);
      await post.save();
      createdPostIds.push(post._id);
    } catch (e) {
      errors.push({
        rowNo: row.rowNo,
        postCode: row.data?.postCode,
        message: e.message || "Failed to create post",
      });
    }
  }

  sessionBatch.createdPostIds = createdPostIds;
  sessionBatch.errors = errors;
  sessionBatch.weekStart = weekStart;
  sessionBatch.rows = createdPostIds.length;
  await sessionBatch.save();

  return {
    batchId: String(sessionBatch._id),
    created: createdPostIds.length,
    createdPostIds: createdPostIds.map(String),
    errors,
    weekStart,
    firstScheduledAt,
  };
}

/** Undo: delete unposted posts from batch. */
export async function undoImportBatch(batchId) {
  if (!mongoose.Types.ObjectId.isValid(batchId)) {
    throw new Error("Invalid batch id");
  }
  const batch = await ImportBatch.findById(batchId);
  if (!batch) throw new Error("Import not found");
  if (batch.undoneAt) throw new Error("This import was already undone");

  const posts = await SocialPost.find({
    _id: { $in: batch.createdPostIds },
    status: { $in: ["draft", "scheduled", "failed"] },
  });

  let deleted = 0;
  for (const post of posts) {
    await deleteSocialPostMedia(post._id);
    await SocialPost.deleteOne({ _id: post._id });
    deleted += 1;
  }
  batch.undoneAt = new Date();
  await batch.save();
  return { deleted, kept: batch.createdPostIds.length - deleted };
}
