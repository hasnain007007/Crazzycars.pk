/**
 * Scheduled social posts (Facebook / Instagram / TikTok).
 * Images live on the shared MEDIA_ROOT volume under social/<postId>/.
 */
import mongoose from "mongoose";

const socialImageSchema = new mongoose.Schema(
  {
    path: { type: String, default: "", trim: true },
    url: { type: String, default: "", trim: true },
    width: { type: Number, default: 0 },
    height: { type: Number, default: 0 },
    order: { type: Number, default: 0 },
  },
  { _id: false }
);

const platformResultSchema = new mongoose.Schema(
  {
    postId: { type: String, default: "" },
    mediaId: { type: String, default: "" },
    id: { type: String, default: "" },
    url: { type: String, default: "" },
    permalink: { type: String, default: "" },
    at: { type: Date, default: null },
    error: { type: String, default: "" },
  },
  { _id: false }
);

const logEntrySchema = new mongoose.Schema(
  {
    at: { type: Date, default: Date.now },
    level: { type: String, enum: ["info", "warn", "error"], default: "info" },
    msg: { type: String, default: "", trim: true },
  },
  { _id: false }
);

const socialPostSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", default: null },
    /** Stored UTC; UI displays Asia/Karachi. */
    scheduledAt: { type: Date, default: null, index: true },
    platforms: {
      facebook: { type: Boolean, default: true },
      instagram: { type: Boolean, default: true },
      tiktok: { type: Boolean, default: true },
    },
    images: {
      type: [socialImageSchema],
      default: [],
      validate: {
        validator(v) {
          return Array.isArray(v) && v.length <= 10;
        },
        message: "Max 10 images per post",
      },
    },
    captions: {
      facebook: { type: String, default: "" },
      instagram: { type: String, default: "" },
      tiktok: { type: String, default: "" },
    },
    hashtags: {
      facebook: { type: String, default: "" },
      instagram: { type: String, default: "" },
      tiktok: { type: String, default: "" },
    },
    firstComment: { type: String, default: "", maxlength: 2000 },
    status: {
      type: String,
      enum: ["draft", "scheduled", "publishing", "published", "partial", "failed", "cancelled"],
      default: "draft",
      index: true,
    },
    results: {
      facebook: { type: platformResultSchema, default: () => ({}) },
      instagram: { type: platformResultSchema, default: () => ({}) },
      tiktok: { type: platformResultSchema, default: () => ({}) },
    },
    attempts: { type: Number, default: 0 },
    lastError: { type: String, default: "" },
    logs: { type: [logEntrySchema], default: [] },
    weekPackId: { type: String, default: "", trim: true, index: true },
    /** Next retry after a platform failure (UTC). */
    nextRetryAt: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

socialPostSchema.index({ status: 1, scheduledAt: 1 });

/** Cap logs to last 50 entries. */
socialPostSchema.methods.pushLog = function pushLog(level, msg) {
  if (!Array.isArray(this.logs)) this.logs = [];
  this.logs.push({
    at: new Date(),
    level: ["info", "warn", "error"].includes(level) ? level : "info",
    msg: String(msg || "").slice(0, 500),
  });
  if (this.logs.length > 50) this.logs = this.logs.slice(-50);
  this.markModified("logs");
};

export default mongoose.models.SocialPost || mongoose.model("SocialPost", socialPostSchema);
