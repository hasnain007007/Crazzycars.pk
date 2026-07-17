/**
 * URL redirects for storefront routing (301/302).
 */
import mongoose from "mongoose";

const redirectSchema = new mongoose.Schema(
  {
    fromPath: { type: String, required: true, unique: true, trim: true, index: true },
    toPath: { type: String, required: true, trim: true },
    type: { type: Number, enum: [301, 302], default: 301 },
  },
  { timestamps: true }
);

export default mongoose.models.Redirect || mongoose.model("Redirect", redirectSchema);
