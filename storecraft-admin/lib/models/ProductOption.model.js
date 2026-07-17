import mongoose from "mongoose";
import { dbConnect } from "../db";

const ProductOptionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    trackInventory: { type: Boolean, default: true },
    status: {
      type: String,
      enum: ["published", "draft", "active", "inactive"],
      default: "published",
    },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

void dbConnect;
export default mongoose.models.ProductOption || mongoose.model("ProductOption", ProductOptionSchema);
