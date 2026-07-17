import mongoose from "mongoose";

const couponSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    discountType: { type: String, enum: ["percentage", "fixed"], required: true },
    discountValue: { type: Number, required: true, min: 0 },
    minOrderAmount: { type: Number, default: 0, min: 0 },
    maxDiscount: { type: Number, default: 0, min: 0 },
    usageLimit: { type: Number, default: 0, min: 0 },
    usedCount: { type: Number, default: 0, min: 0 },
    expiryDate: { type: Date, default: null },
    status: { type: String, enum: ["active", "inactive"], default: "active", index: true },
    appliesTo: { type: String, enum: ["all", "categories"], default: "all" },
    categoryIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Category" }],
  },
  { timestamps: true }
);

couponSchema.index({ createdAt: -1 });

export default mongoose.models.Coupon || mongoose.model("Coupon", couponSchema);
