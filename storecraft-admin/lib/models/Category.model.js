import mongoose from "mongoose";

const CategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, unique: true },
    description: { type: String, default: "" },
    image: {
      url: { type: String, default: "" },
      publicId: { type: String, default: "" },
      altText: { type: String, default: "" },
      title: { type: String, default: "" },
    },
    parentCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },
    level: { type: Number, default: 0 },
    ancestors: [{ type: mongoose.Schema.Types.ObjectId, ref: "Category" }],
    status: {
      type: String,
      enum: ["active", "draft"],
      default: "active",
    },
    isFeatured: { type: Boolean, default: false },
    featured: { type: Boolean, default: false },
    showInNav: { type: Boolean, default: false },
    showInFooter: { type: Boolean, default: false },
    showOnHomepage: { type: Boolean, default: false },
    homepageOrder: { type: Number, default: 0 },
    homepageIcon: { type: String, default: "" },
    sortOrder: { type: Number, default: 0 },
    seo: {
      metaTitle: { type: String, default: "" },
      metaDescription: { type: String, default: "" },
      metaKeywords: [{ type: String }],
    },
  },
  { timestamps: true }
);

/** Mongoose 8+: sync middleware — omit `next` (callback-style `next` breaks if arity/exec path mismatches). */
CategorySchema.pre("save", function saveSlug() {
  if (this.isModified("name") && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  }
});

export default mongoose.models.Category || mongoose.model("Category", CategorySchema);
