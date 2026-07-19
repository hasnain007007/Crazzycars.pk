const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },

    descriptionHtml: { type: String, default: "" },
    shortDescription: { type: String, default: "" },

    price: { type: Number, required: true },          // current selling price (PKR)
    compareAtPrice: { type: Number, default: null },  // "was" price for sale badge
    currency: { type: String, default: "PKR" },

    images: [{ url: String, alt: String }],

    // Optional variants (color/style). Empty = single-variant product.
    variants: [
      {
        optionName: String,   // e.g. "Color"
        optionValue: String,  // e.g. "Glossy Black"
        price: Number,
        compareAtPrice: Number,
        sku: String,
        image: String,
      },
    ],

    tags: [String],
    vendor: { type: String, default: "CrazzyCars.pk" },

    // Relationships (resolved by the seed from slugs -> ObjectIds)
    categories: [{ type: mongoose.Schema.Types.ObjectId, ref: "Category" }],
    compatibleVehicles: [{ type: mongoose.Schema.Types.ObjectId, ref: "Vehicle" }],
    isUniversal: { type: Boolean, default: false },   // fits any car

    isFeatured: { type: Boolean, default: false },    // homepage featured section
    isDeal: { type: Boolean, default: false },        // Hot Deals section

    metaTitle: { type: String, default: "" },
    metaDescription: { type: String, default: "" },

    isActive: { type: Boolean, default: true },
    status: { type: String, enum: ["active", "unlisted", "draft"], default: "active" },
  },
  { timestamps: true }
);

productSchema.index({ categories: 1, isActive: 1 });
productSchema.index({ compatibleVehicles: 1, isActive: 1 });
productSchema.index({ isUniversal: 1, isActive: 1 });
productSchema.index({ name: "text", tags: "text" });

module.exports = mongoose.models.Product || mongoose.model("Product", productSchema);
