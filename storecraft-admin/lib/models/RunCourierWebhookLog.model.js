/**
 * Temporary review log for Run Courier status webhooks.
 */
import mongoose from "mongoose";

const runCourierWebhookLogSchema = new mongoose.Schema(
  {
    receivedAt: { type: Date, default: Date.now, index: true },
    ok: { type: Boolean, default: false },
    httpStatus: { type: Number, default: 200 },
    outcome: { type: String, default: "", trim: true },
    trackingNumber: { type: String, default: "", trim: true, index: true },
    orderReferenceNumber: { type: String, default: "", trim: true },
    runCourierStatus: { type: String, default: "", trim: true },
    orderId: { type: String, default: "", trim: true, index: true },
    orderNumber: { type: String, default: "", trim: true },
    mappedOrderStatus: { type: String, default: "", trim: true },
    codMarkedPaid: { type: Boolean, default: false },
    rawPayload: { type: mongoose.Schema.Types.Mixed, default: null },
    error: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.models.RunCourierWebhookLog ||
  mongoose.model("RunCourierWebhookLog", runCourierWebhookLogSchema);
