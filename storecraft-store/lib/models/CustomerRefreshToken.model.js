/**
 * Mobile refresh tokens — opaque tokens, stored as sha256 hash.
 * TTL index on expiresAt (30 days).
 * Rotation stores replacedByTokenHash + graceExpiresAt for lost-response retries.
 * Outside the grace window (or after child use / retry cap), reuse revokes all sessions.
 */
import mongoose from "mongoose";

const refreshTokenSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Customer",
    required: true,
    index: true,
  },
  /** sha256(opaqueToken) — never store the raw token. */
  tokenHash: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true },
  isRevoked: { type: Boolean, default: false },
  revokedAt: { type: Date, default: null },
  /** sha256 of the child refresh issued when this token was rotated. */
  replacedByTokenHash: { type: String, default: "", index: true },
  /** End of grace window for retrying this rotated (parent) token. */
  graceExpiresAt: { type: Date, default: null },
  /** How many grace re-issues have been granted for this parent token. */
  graceRetryCount: { type: Number, default: 0, min: 0 },
  createdAt: { type: Date, default: Date.now },
});

/** MongoDB TTL — automatically removes expired documents. */
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
/** Lookup active tokens per customer. */
refreshTokenSchema.index({ customerId: 1, isRevoked: 1 });

export default mongoose.models.CustomerRefreshToken ||
  mongoose.model("CustomerRefreshToken", refreshTokenSchema);
