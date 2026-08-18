import mongoose from "mongoose";

const ViewsAutoIncreaseSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: false },
    everyMinutes: { type: Number, default: 60, min: 1 },
    minPerInterval: { type: Number, default: 1, min: 0 },
    maxPerInterval: { type: Number, default: 3, min: 0 },
    lastAppliedAt: { type: Date },
  },
  { _id: false }
);

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
    readTimeManual: { type: Boolean, default: false },
    viewsAutoIncrease: { type: ViewsAutoIncreaseSchema, default: () => ({}) },
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

if (mongoose.models.BlogPost) {
  delete mongoose.models.BlogPost;
}

export default mongoose.model("BlogPost", BlogPostSchema);
