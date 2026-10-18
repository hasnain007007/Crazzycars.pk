/**
 * Idempotency keys for mobile order placement.
 * TTL: 24 hours. Unique on (key, scope).
 */
import mongoose from "mongoose";

const idempotencyKeySchema = new mongoose.Schema({
  key: { type: String, required: true },
  scope: { type: String, required: true, default: "mobile-orders" },
  status: { type: String, default: "pending" }, // "pending" | "completed" | "failed"
  requestHash: { type: String, default: "" },
  responseBody: { type: mongoose.Schema.Types.Mixed, default: null },
  createdAt: { type: Date, default: Date.now },
});

idempotencyKeySchema.index({ key: 1, scope: 1 }, { unique: true });
/** 24-hour TTL */
idempotencyKeySchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });

export default mongoose.models.IdempotencyKey ||
  mongoose.model("IdempotencyKey", idempotencyKeySchema);
