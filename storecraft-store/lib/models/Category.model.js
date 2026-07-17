/**
 * Category model for catalog hierarchy, SEO, and merchandising flags.
 */
import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    parentCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },
    /** Mirrors admin catalog — used for breadcrumbs when synced from same DB */
    ancestors: [{ type: mongoose.Schema.Types.ObjectId, ref: "Category" }],
    level: { type: Number, default: 0 },
    sortOrder: { type: Number, default: 0 },
    description: { type: String, default: "", trim: true },
    shortDescription: { type: String, default: "", trim: true },
    image: {
      url: { type: String, default: "" },
      publicId: { type: String, default: "" },
    },
    status: {
      type: String,
      enum: ["active", "inactive", "draft"],
      default: "active",
      index: true,
    },
    isTopCategory: { type: Boolean, default: false },
    featured: { type: Boolean, default: false },
    /** Legacy/admin alias — same DB may use either field */
    isFeatured: { type: Boolean, default: false },
    showInNav: { type: Boolean, default: false },
    showInFooter: { type: Boolean, default: false },
    showOnHomepage: { type: Boolean, default: false },
    homepageOrder: { type: Number, default: 0 },
    homepageIcon: { type: String, default: "" },
    seo: {
      metaTitle: { type: String, default: "" },
      metaDescription: { type: String, default: "" },
      metaKeywords: { type: [String], default: [] },
    },
  },
  { timestamps: true }
);

categorySchema.index({ createdAt: -1 });
categorySchema.index({ name: 1 });
categorySchema.index({ slug: 1 });
categorySchema.index({ status: 1 });
categorySchema.index({ parentCategory: 1 });

export default mongoose.models.Category ||
  mongoose.model("Category", categorySchema);
