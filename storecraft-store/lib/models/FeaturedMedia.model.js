import mongoose from "mongoose";

const FeaturedMediaSchema = new mongoose.Schema(
  {
    title: { type: String, default: "" },
    type: {
      type: String,
      enum: ["image", "video"],
      default: "image",
    },
    mediaUrl: { type: String, default: "" },
    thumbnailUrl: { type: String, default: "" },
    link: { type: String, default: "" },
    linkType: {
      type: String,
      enum: ["product", "category", "page", "url", "none"],
      default: "none",
    },
    caption: { type: String, default: "" },
    enabled: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

FeaturedMediaSchema.index({ enabled: 1, sortOrder: 1, createdAt: -1 });

export default mongoose.models.FeaturedMedia || mongoose.model("FeaturedMedia", FeaturedMediaSchema);
