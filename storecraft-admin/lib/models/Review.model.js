import mongoose from "mongoose";

const reviewImageSchema = new mongoose.Schema(
  {
    url: { type: String, default: "" },
    publicId: { type: String, default: "" },
  },
  { _id: false }
);

const reviewerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true, default: "" },
    location: { type: String, default: "" },
    avatar: { type: String, default: "" },
    verified: { type: Boolean, default: false },
  },
  { _id: false }
);

const adminReplySchema = new mongoose.Schema(
  {
    text: { type: String, default: "" },
    repliedAt: { type: Date },
  },
  { _id: false }
);

const reviewSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    productName: { type: String, default: "" },
    productSlug: { type: String, default: "" },
    reviewer: { type: reviewerSchema, required: true },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    title: { type: String, default: "", trim: true },
    body: { type: String, default: "", trim: true },
    images: { type: [reviewImageSchema], default: [] },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    featured: { type: Boolean, default: false },
    adminReply: { type: adminReplySchema, default: () => ({}) },
    source: {
      type: String,
      enum: ["manual", "import", "customer"],
      default: "manual",
    },
    helpfulVotes: { type: Number, default: 0 },
    orderId: { type: String, default: "" },
  },
  { timestamps: true }
);

reviewSchema.index({ product: 1, status: 1 });
reviewSchema.index({ status: 1, createdAt: -1 });
reviewSchema.index({ rating: 1 });
reviewSchema.index({ featured: 1 });

export default mongoose.models.Review || mongoose.model("Review", reviewSchema);
