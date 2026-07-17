import mongoose from "mongoose";

const PageSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    content: {
      type: String,
      default: "",
    },
    template: {
      type: String,
      enum: ["custom", "about", "contact", "faq", "policy"],
      default: "custom",
    },
    status: {
      type: String,
      enum: ["published", "draft"],
      default: "draft",
    },
    seo: {
      metaTitle: { type: String, default: "" },
      metaDescription: { type: String, default: "" },
      keywords: { type: String, default: "" },
      canonical: { type: String, default: "" },
    },
    showInNav: { type: Boolean, default: false },
    showInFooter: { type: Boolean, default: false },
    showInInfoBar: { type: Boolean, default: false },
    icon: { type: String, default: "" },
    featured: { type: Boolean, default: false },
    passwordProtected: { type: Boolean, default: false },
    password: { type: String, default: "" },
    openInNewTab: { type: Boolean, default: false },
    externalUrl: { type: String, default: "" },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.models.Page || mongoose.model("Page", PageSchema);
