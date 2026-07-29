/**
 * Failed credential attempts, keyed by action scope + email + client IP.
 * Backs the login rate limiter. Same collection as storecraft-store LoginAttempt.
 *
 * No `timestamps` option: counters are updated through an aggregation-pipeline
 * update, which Mongoose does not apply automatic timestamps to.
 */
import mongoose from "mongoose";

const loginAttemptSchema = new mongoose.Schema({
  scope: { type: String, required: true, trim: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  ip: { type: String, default: "unknown", trim: true },
  count: { type: Number, default: 0 },
  windowStartedAt: { type: Date, default: Date.now },
  lastAttemptAt: { type: Date, default: Date.now },
});

loginAttemptSchema.index({ scope: 1, email: 1, ip: 1 }, { unique: true });
loginAttemptSchema.index({ lastAttemptAt: 1 }, { expireAfterSeconds: 3600 });

export default mongoose.models.LoginAttempt || mongoose.model("LoginAttempt", loginAttemptSchema);
