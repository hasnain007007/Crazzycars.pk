import mongoose from "mongoose";

const carModelSchema = new mongoose.Schema(
  {
    make: { type: String, required: true, trim: true, index: true },
    model: { type: String, required: true, trim: true },
    generation: { type: String, default: "", trim: true },
    yearFrom: { type: Number },
    yearTo: { type: Number },
    slug: { type: String, required: true, unique: true, trim: true, index: true },
    image: {
      url: { type: String, default: "" },
      publicId: { type: String, default: "" },
      altText: { type: String, default: "" },
    },
    isActive: { type: Boolean, default: true, index: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

carModelSchema.index({ make: 1, isActive: 1 });
carModelSchema.index({ slug: 1 });

export default mongoose.models.CarModel || mongoose.model("CarModel", carModelSchema);
