/**
 * Mobile refresh tokens — opaque tokens, stored as sha256 hash.
 * TTL index on expiresAt (30 days). Reuse of a revoked/rotated token
 * triggers full revocation of all tokens for the customer.
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
  createdAt: { type: Date, default: Date.now },
});

/** MongoDB TTL — automatically removes expired documents. */
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
/** Lookup active tokens per customer. */
refreshTokenSchema.index({ customerId: 1, isRevoked: 1 });

export default mongoose.models.CustomerRefreshToken ||
  mongoose.model("CustomerRefreshToken", refreshTokenSchema);
