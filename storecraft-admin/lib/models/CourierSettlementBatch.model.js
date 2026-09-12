/**
 * Courier remittance batch (e.g. PostEx Cash Payment Receipt).
 */
import mongoose from "mongoose";

const courierSettlementBatchSchema = new mongoose.Schema(
  {
    cprNumber: { type: String, required: true, trim: true, unique: true, index: true },
    cprDate: { type: Date, default: null, index: true },
    courier: { type: String, default: "PostEx", trim: true },
    filename: { type: String, default: "", trim: true },
    deliveredCount: { type: Number, default: 0 },
    returnedCount: { type: Number, default: 0 },
    codTotal: { type: Number, default: 0 },
    shippingCharges: { type: Number, default: 0 },
    gst: { type: Number, default: 0 },
    deduction4pct: { type: Number, default: 0 },
    netTotal: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["draft", "posted", "void"],
      default: "draft",
      index: true,
    },
    uploadedBy: { type: String, default: "", trim: true },
    postedAt: { type: Date, default: null },
    postedBy: { type: String, default: "", trim: true },
    lineCount: { type: Number, default: 0 },
    matchedCount: { type: Number, default: 0 },
    unmatchedCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

courierSettlementBatchSchema.index({ createdAt: -1 });
courierSettlementBatchSchema.index({ status: 1, cprDate: -1 });

export default mongoose.models.CourierSettlementBatch ||
  mongoose.model("CourierSettlementBatch", courierSettlementBatchSchema);
