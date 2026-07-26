import mongoose from "mongoose";

const bannerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    placement: {
      type: String,
      enum: ["hero_slider", "promo_strip", "promo_card", "category_banner", "product_banner", "sidebar_banner", "popup_banner"],
      default: "hero_slider",
      index: true,
    },
    size: {
      type: String,
      enum: ["full_width", "half_width", "third_width", "square", "portrait", "landscape", "strip"],
      default: "full_width",
    },
    background: {
      type: {
        type: String,
        enum: ["image", "color", "gradient"],
        default: "image",
      },
      image: {
        url: { type: String, default: "" },
        publicId: { type: String, default: "" },
      },
      mobileImage: {
        url: { type: String, default: "" },
        publicId: { type: String, default: "" },
      },
      mobileImagePosition: { type: String, default: "center center" },
      color: { type: String, default: "#111111" },
      gradientFrom: { type: String, default: "#009688" },
      gradientTo: { type: String, default: "#004d40" },
      gradientDirection: { type: String, default: "to right" },
    },
    imageDisplay: {
      objectFit: {
        type: String,
        enum: ["cover", "contain", "fill", "none", "scale-down"],
        default: "cover",
      },
      objectPosition: {
        type: String,
        enum: [
          "center",
          "top",
          "bottom",
          "left",
          "right",
          "top center",
          "bottom center",
          "top left",
          "top right",
          "bottom left",
          "bottom right",
        ],
        default: "center",
      },
      height: {
        type: String,
        enum: ["small", "medium", "large", "full", "auto"],
        default: "large",
      },
      overlay: {
        enabled: { type: Boolean, default: false },
        color: { type: String, default: "rgba(0,0,0,0.3)" },
        opacity: { type: Number, default: 30 },
      },
      hoverZoom: { type: Boolean, default: false },
    },
    content: {
      badge: {
        text: { type: String, default: "" },
        color: { type: String, default: "#ffffff" },
        bgColor: { type: String, default: "rgba(255,255,255,0.2)" },
      },
      heading: {
        text: { type: String, default: "" },
        size: { type: String, enum: ["sm", "md", "lg", "xl", "2xl"], default: "xl" },
        color: { type: String, default: "#ffffff" },
        fontWeight: { type: String, default: "bold" },
      },
      subheading: {
        text: { type: String, default: "" },
        color: { type: String, default: "#ffffff" },
      },
      subheadings: { type: [String], default: [] },
      description: {
        text: { type: String, default: "" },
        color: { type: String, default: "rgba(255,255,255,0.8)" },
      },
      buttons: [
        {
          text: { type: String, default: "" },
          url: { type: String, default: "" },
          style: { type: String, enum: ["primary", "secondary", "outline", "white", "dark"], default: "primary" },
          bgColor: { type: String, default: "" },
          textColor: { type: String, default: "" },
          color: { type: String, default: "" },
        },
      ],
      trustTextColor: { type: String, default: "" },
      contentPosition: {
        type: String,
        enum: ["left", "center", "right"],
        default: "left",
      },
      overlay: {
        enabled: { type: Boolean, default: true },
        color: { type: String, default: "rgba(0,0,0,0.4)" },
      },
    },
    sortOrder: { type: Number, default: 0 },
    status: { type: String, enum: ["active", "inactive"], default: "active", index: true },
    schedule: {
      enabled: { type: Boolean, default: false },
      startDate: { type: Date, default: null },
      endDate: { type: Date, default: null },
    },
    targetUrl: { type: String, default: "" },
    openInNewTab: { type: Boolean, default: false },
  },
  { timestamps: true }
);

bannerSchema.index({ sortOrder: 1, createdAt: -1 });
bannerSchema.index({ status: 1, placement: 1 });

export default mongoose.models.Banner || mongoose.model("Banner", bannerSchema);
