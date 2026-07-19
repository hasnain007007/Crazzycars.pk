/**
 * Vehicle model — Shop by Car generations (Make → Model → Year).
 * Products link via compatibleVehicles: [ObjectId] or isUniversal: true.
 */
import mongoose from "mongoose";

const vehicleSchema = new mongoose.Schema(
  {
    make: { type: String, required: true, trim: true },
    model: { type: String, required: true, trim: true },
    generation: { type: String, default: "" },
    displayName: { type: String, required: true },
    yearFrom: { type: Number, required: true },
    yearTo: { type: Number, default: null },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    image: { type: String, default: "" },
    metaTitle: { type: String, default: "" },
    metaDescription: { type: String, default: "" },
    shopifyHandle: { type: String, default: "" },
    shopifyId: { type: String, default: "" },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

vehicleSchema.index({ make: 1, model: 1, yearFrom: 1 });
vehicleSchema.index({ make: 1, isActive: 1, sortOrder: 1 });

vehicleSchema.methods.matchesYear = function matchesYear(year) {
  const to = this.yearTo || new Date().getFullYear() + 1;
  return year >= this.yearFrom && year <= to;
};

export default mongoose.models.Vehicle || mongoose.model("Vehicle", vehicleSchema);
