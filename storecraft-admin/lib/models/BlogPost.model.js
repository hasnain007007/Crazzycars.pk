import mongoose from "mongoose";

const BlogPostSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, unique: true },
    excerpt: { type: String, default: "" },
    content: { type: String, default: "" },
    featuredImage: {
      url: { type: String, default: "" },
      publicId: { type: String, default: "" },
      altText: { type: String, default: "" },
    },
    author: {
      name: { type: String, default: "" },
      avatar: { type: String, default: "" },
      bio: { type: String, default: "" },
    },
    categories: [{ type: String }],
    tags: [{ type: String }],
    status: {
      type: String,
      enum: ["published", "draft", "scheduled"],
      default: "draft",
    },
    publishedAt: { type: Date },
    scheduledAt: { type: Date },
    views: { type: Number, default: 0 },
    readTime: { type: Number, default: 0 },
    seo: {
      metaTitle: { type: String, default: "" },
      metaDescription: { type: String, default: "" },
      metaKeywords: [{ type: String }],
    },
    allowComments: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
    relatedProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
  },
  { timestamps: true }
);

BlogPostSchema.pre("save", async function beforeSave() {
  if (this.isModified("title") && !this.slug) {
    this.slug = this.title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  }
  if (this.isModified("content") && this.content) {
    const wordCount = String(this.content || "")
      .replace(/<[^>]*>/g, " ")
      .split(/\s+/)
      .filter(Boolean).length;
    this.readTime = Math.max(1, Math.ceil(wordCount / 200));
  }
  if (this.isModified("status") && this.status === "published" && !this.publishedAt) {
    this.publishedAt = new Date();
  }
});

export default mongoose.models.BlogPost || mongoose.model("BlogPost", BlogPostSchema);
