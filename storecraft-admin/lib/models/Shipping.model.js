import mongoose from "mongoose";

const WeightRangeSchema = new mongoose.Schema(
  {
    minWeight: { type: Number, required: true },
    maxWeight: { type: Number, required: true },
    price: { type: Number, required: true },
  },
  { _id: false }
);

const FreeShippingSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: false },
    threshold: { type: Number, default: 0 },
  },
  { _id: false }
);

const ShippingZoneSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    provinces: [{ type: String, trim: true }],
    isDefault: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    freeShipping: { type: FreeShippingSchema, default: undefined },
    freeShippingThreshold: { type: Number, default: 0 },
    weightRanges: { type: [WeightRangeSchema], default: [] },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

ShippingZoneSchema.index({ sortOrder: 1, name: 1 });
ShippingZoneSchema.index({ status: 1, sortOrder: 1 });

export default mongoose.models.ShippingZone || mongoose.model("ShippingZone", ShippingZoneSchema);
