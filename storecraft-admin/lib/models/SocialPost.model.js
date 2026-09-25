/**
 * Scheduled social posts (Facebook / Instagram / TikTok).
 * Images live on the shared MEDIA_ROOT volume under social/<postId>/.
 * Extended for week import + easy owner UI; keeps step-1/2 fields.
 */
import mongoose from "mongoose";

const socialImageSchema = new mongoose.Schema(
  {
    path: { type: String, default: "", trim: true },
    url: { type: String, default: "", trim: true },
    width: { type: Number, default: 0 },
    height: { type: Number, default: 0 },
    order: { type: Number, default: 0 },
    originalName: { type: String, default: "", trim: true },
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

const productSnapshotSchema = new mongoose.Schema(
  {
    name: { type: String, default: "" },
    image: { type: String, default: "" },
    price: { type: Number, default: null },
  },
  { _id: false }
);

const SOCIAL_STATUSES = [
  "draft",
  "scheduled",
  "publishing",
  "posting",
  "published",
  "posted",
  "partial",
  "failed",
  "cancelled",
];

const socialPostSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    /** Owner-facing headline (mirrors title when set). */
    headline: { type: String, default: "", trim: true, maxlength: 60 },
    postCode: { type: String, default: "", trim: true, uppercase: true, maxlength: 32 },
    weekStart: { type: Date, default: null, index: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", default: null },
    productUrl: { type: String, default: "", trim: true },
    productSnapshot: { type: productSnapshotSchema, default: () => ({}) },
    /** Stored UTC; UI displays Asia/Karachi. */
    scheduledAt: { type: Date, default: null, index: true },
    platforms: {
      facebook: { type: Boolean, default: true },
      instagram: { type: Boolean, default: true },
      tiktok: { type: Boolean, default: false },
    },
    postType: {
      type: String,
      enum: ["carousel", "single"],
      default: "carousel",
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
    /** Single caption body (new UI). Synced into captions.* for publishers. */
    caption: { type: String, default: "" },
    captionTiktok: { type: String, default: "", maxlength: 500 },
    captions: {
      facebook: { type: String, default: "" },
      instagram: { type: String, default: "" },
      tiktok: { type: String, default: "" },
    },
    /** Array of #tags (new UI). Also mirrored into hashtags.* strings. */
    hashtagList: { type: [String], default: [] },
    hashtags: {
      facebook: { type: String, default: "" },
      instagram: { type: String, default: "" },
      tiktok: { type: String, default: "" },
    },
    firstComment: { type: String, default: "", maxlength: 2000 },
    addFooter: { type: Boolean, default: true },
    status: {
      type: String,
      enum: SOCIAL_STATUSES,
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
    importBatchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ImportBatch",
      default: null,
      index: true,
    },
    notes: { type: String, default: "", maxlength: 2000 },
    /** Next retry after a platform failure (UTC). */
    nextRetryAt: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

socialPostSchema.index({ status: 1, scheduledAt: 1 });
socialPostSchema.index(
  { postCode: 1, weekStart: 1 },
  {
    unique: true,
    partialFilterExpression: {
      postCode: { $exists: true, $nin: [null, ""] },
      weekStart: { $exists: true, $ne: null },
    },
  }
);

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

function normalizeHashtag(tag) {
  let t = String(tag || "").trim();
  if (!t) return "";
  if (!t.startsWith("#")) t = `#${t}`;
  return t.replace(/\s+/g, "");
}

/** Keep title/caption/hashtag mirrors in sync before save. */
socialPostSchema.pre("save", function syncFields(next) {
  if (this.isModified("headline") && this.headline) {
    this.title = String(this.headline).slice(0, 200);
  } else if (this.isModified("title") && this.title && !this.headline) {
    this.headline = String(this.title).slice(0, 60);
  }

  if (this.isModified("caption") || this.isModified("captionTiktok")) {
    const body = String(this.caption || "").trim();
    const tt = String(this.captionTiktok || "").trim();
    this.captions = this.captions || {};
    if (body) {
      this.captions.instagram = body;
      this.captions.facebook = body;
    }
    this.captions.tiktok = tt || body;
    this.markModified("captions");
  }

  if (this.isModified("hashtagList") && Array.isArray(this.hashtagList)) {
    const joined = this.hashtagList.map(normalizeHashtag).filter(Boolean).join(" ");
    this.hashtags = this.hashtags || {};
    this.hashtags.instagram = joined;
    this.hashtags.facebook = joined;
    this.hashtags.tiktok = joined;
    this.markModified("hashtags");
  }

  if (this.status === "posting") this.status = "publishing";
  if (this.status === "posted") this.status = "published";

  next();
});

export { SOCIAL_STATUSES, normalizeHashtag };
export default mongoose.models.SocialPost || mongoose.model("SocialPost", socialPostSchema);
