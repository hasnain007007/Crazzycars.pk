/**
 * Low-stock alerts for admin dashboard / notifications.
 */
import mongoose from "mongoose";

const stockAlertSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    quantity: { type: Number, default: 0 },
    threshold: { type: Number, default: 0 },
    resolved: { type: Boolean, default: false, index: true },
    /** When inventory rises above threshold, resolved becomes true and status restocked */
    status: {
      type: String,
      enum: ["active", "restocked"],
      default: "active",
      index: true,
    },
  },
  { timestamps: true }
);

stockAlertSchema.index({ product: 1, resolved: 1 });

export default mongoose.models.StockAlert || mongoose.model("StockAlert", stockAlertSchema);
