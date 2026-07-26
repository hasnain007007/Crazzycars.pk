import mongoose from "mongoose";

const imageSchema = new mongoose.Schema(
  {
    url: { type: String, default: "" },
    publicId: { type: String, default: "" },
    originalSize: { type: Number },
    finalSize: { type: Number },
    isMain: { type: Boolean, default: false },
    altText: { type: String, default: "" },
    imageName: { type: String, default: "" },
    width: { type: Number },
    height: { type: Number },
    focalPoint: {
      x: { type: Number },
      y: { type: Number },
    },
  },
  { _id: false }
);

const videoSchema = new mongoose.Schema(
  {
    url: { type: String, default: "" },
    originalUrl: { type: String, default: "" },
    publicId: { type: String, default: "" },
    thumbnail: { type: String, default: "" },
    format: { type: String, default: "webm" },
    duration: { type: Number, default: 0 },
    size: { type: Number, default: 0 },
    width: { type: Number, default: 0 },
    height: { type: Number, default: 0 },
    title: { type: String, default: "" },
    isPrimary: { type: Boolean, default: false },
  },
  { _id: false }
);

const variationSchema = new mongoose.Schema(
  {
    type: { type: String, default: "custom" },
    name: { type: String, default: "" },
    options: { type: Array, default: [] },
    additionalPrice: { type: Number, default: 0, alias: "extraPrice" },
    quantity: { type: Number, default: 0, alias: "stock" },
  },
  { _id: true }
);

const simpleVariationSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, default: "" },
    enabled: { type: Boolean, default: false },
    tags: [{ type: String, trim: true }],
  },
  { _id: true }
);

const combinationOptionSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, default: "" },
    value: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const variationCombinationSchema = new mongoose.Schema(
  {
    options: { type: [combinationOptionSchema], default: [] },
    priceDelta: { type: Number, default: 0 },
    weightDelta: { type: Number, default: 0 },
    price: { type: Number, default: 0 },
    compareAtPrice: { type: Number, default: 0 },
    weight: { type: Number, default: 0 },
    stock: { type: Number, default: 0 },
    sku: { type: String, default: "" },
    image: { type: String, default: "" },
  },
  { _id: true }
);

const compatibleCarSchema = new mongoose.Schema(
  {
    make: { type: String, required: true, trim: true },
    model: { type: String, required: true, trim: true },
    generation: { type: String, default: "", trim: true },
    yearFrom: { type: Number, default: null },
    yearTo: { type: Number, default: null },
  },
  { _id: true }
);

const vehicleFitmentRowSchema = new mongoose.Schema(
  {
    make: { type: String, default: "" },
    model: { type: String, default: "" },
    yearFrom: { type: Number, default: null },
    yearTo: { type: Number, default: null },
    bodyStyle: {
      type: String,
      enum: ["All", "Sedan", "SUV", "Hatchback", "Pickup", "Van", "Crossover"],
      default: "All",
    },
    notes: { type: String, default: "" },
  },
  { _id: true }
);

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true },
    articleNo: { type: String, default: "" },
    /** European Article Number (barcode). */
    ean: { type: String, default: "" },
    partNumber: { type: String, default: "", trim: true },
    condition: {
      type: String,
      enum: ["new", "used", "refurbished"],
      default: "new",
    },
    categories: [{ type: mongoose.Schema.Types.ObjectId, ref: "Category" }],
    shortDescription: { type: String, default: "" },
    longDescription: { type: String, default: "" },
    pricing: {
      regularPrice: { type: Number, required: true },
      salePrice: { type: Number },
      /** Merchant cost (not shown on storefront) — used for margin in admin */
      costPerItem: { type: Number, default: 0, min: 0 },
      saleSchedule: {
        enabled: { type: Boolean, default: false },
        startDate: { type: Date },
        endDate: { type: Date },
      },
    },
    inventory: {
      quantity: { type: Number, default: 0 },
      weight: { type: Number },
      weightUnit: {
        type: String,
        enum: ["kg", "g", "lb", "oz"],
        default: "g",
      },
      trackInventory: { type: Boolean, default: true },
      lowStockThreshold: { type: Number, default: 5 },
      sku: { type: String, default: "" },
    },
    media: {
      images: { type: [imageSchema], default: [] },
      videos: { type: [videoSchema], default: [] },
      videoUrl: { type: String, default: "" },
      videoType: { type: String, enum: ["youtube", "mp4", ""], default: "" },
    },
    variations: { type: [variationSchema], default: [] },
    simpleVariations: { type: [simpleVariationSchema], default: [] },
    variationCombinations: { type: [variationCombinationSchema], default: [] },
    features: [{ type: String, trim: true }],
    specifications: [
      {
        label: { type: String, default: "" },
        value: { type: String, default: "" },
      },
    ],
    seo: {
      metaTitle: { type: String, default: "" },
      metaDescription: { type: String, default: "" },
      metaKeywords: [{ type: String, trim: true }],
    },
    isUniversal: { type: Boolean, default: false, index: true },
    compatibleVehicles: [{ type: mongoose.Schema.Types.ObjectId, ref: "Vehicle" }],
    compatibleCars: { type: [compatibleCarSchema], default: [] },
    metaTitle: { type: String, default: "" },
    metaDescription: { type: String, default: "" },
    vehicleCompatibility: {
      fitmentType: {
        type: String,
        enum: ["universal", "specific", "semi-universal"],
        default: "universal",
      },
      universalNote: {
        type: String,
        default: "Fits all car makes and models",
      },
      vehicles: { type: [vehicleFitmentRowSchema], default: [] },
      categories: [{ type: String }],
    },
    status: {
      type: String,
      enum: ["active", "inactive", "draft"],
      default: "draft",
      index: true,
    },
    featured: { type: Boolean, default: false, index: true },
    isFeatured: { type: Boolean, default: false, index: true },
    isDeal: { type: Boolean, default: false, index: true },
    newArrival: { type: Boolean, default: false },
    productType: { type: String, default: "", trim: true },
    vendor: { type: String, default: "", trim: true },
    collections: [{ type: String, trim: true }],
    tags: [{ type: String, trim: true }],
    rating: { type: Number, default: 0 },
    averageRating: { type: Number, default: 0 },
    ratingAverage: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
    numReviews: { type: Number, default: 0 },
    totalReviews: { type: Number, default: 0 },
    restockRequested: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

productSchema.index({ status: 1, createdAt: -1 });
productSchema.index({ categories: 1, status: 1 });
productSchema.index({ featured: 1, status: 1 });
productSchema.index({ isFeatured: 1, status: 1 });
productSchema.index({ isDeal: 1, status: 1 });
productSchema.index({ newArrival: 1, status: 1 });
productSchema.index({ isUniversal: 1, status: 1 });
productSchema.index({ compatibleVehicles: 1, status: 1 });
productSchema.index({ "inventory.quantity": 1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ "compatibleCars.make": 1, "compatibleCars.model": 1, status: 1 });
productSchema.index({ "vehicleCompatibility.fitmentType": 1, status: 1 });
productSchema.index({
  "vehicleCompatibility.vehicles.make": 1,
  "vehicleCompatibility.vehicles.model": 1,
  status: 1,
});

export default mongoose.models.Product || mongoose.model("Product", productSchema);
