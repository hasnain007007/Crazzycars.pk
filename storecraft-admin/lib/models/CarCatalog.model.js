import mongoose from "mongoose";

const BODY_STYLES = ["Sedan", "SUV", "Hatchback", "Pickup", "Van", "Crossover", "Coupe", "MPV"];

const carModelSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true },
    years: [{ type: Number }],
    yearFrom: { type: Number },
    yearTo: { type: Number },
    isActive: { type: Boolean, default: true },
    bodyStyle: {
      type: String,
      enum: BODY_STYLES,
      default: "Sedan",
    },
    image: { type: String, default: "" },
    description: { type: String, default: "" },
    popularAccessories: [{ type: String }],
    generation: { type: String, default: "" },
    nickname: { type: String, default: "" },
    isPopular: { type: Boolean, default: false },
    popularOrder: { type: Number, default: 0 },
    variants: [
      {
        name: { type: String, default: "" },
        yearFrom: { type: Number },
        yearTo: { type: Number },
        isActive: { type: Boolean, default: true },
      },
    ],
  },
  { _id: true }
);

const makeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    logo: { type: String, default: "" },
    country: { type: String, default: "Japan" },
    models: [carModelSchema],
  },
  { timestamps: true }
);

makeSchema.index({ order: 1, name: 1 });

export default mongoose.models.CarCatalog || mongoose.model("CarCatalog", makeSchema);
