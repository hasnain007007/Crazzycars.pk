/**
 * Review CSV column contract (import + export + template).
 * Match products by productSlug, productId, or articleNo.
 * imageUrls: pipe "|" separated.
 */
export const REVIEW_CSV_HEADERS = [
  "productSlug",
  "productId",
  "articleNo",
  "reviewerName",
  "reviewerEmail",
  "reviewerLocation",
  "verified",
  "rating",
  "title",
  "body",
  "status",
  "featured",
  "imageUrls",
  "orderId",
  "createdAt",
];

export const REVIEW_CSV_SAMPLE_ROWS = [
  {
    productSlug: "toyota-corolla-2015-2024-carbon-fiber-gear-shifter-trim",
    productId: "",
    articleNo: "",
    reviewerName: "Ali Khan",
    reviewerEmail: "ali@example.com",
    reviewerLocation: "Lahore",
    verified: "true",
    rating: "5",
    title: "Perfect fit",
    body: "Looks OEM and stuck well. Fast delivery in Lahore.",
    status: "approved",
    featured: "false",
    imageUrls: "",
    orderId: "",
    createdAt: "2026-08-15",
  },
  {
    productSlug: "",
    productId: "",
    articleNo: "CC-COR-INT-001",
    reviewerName: "Sara Ahmed",
    reviewerEmail: "",
    reviewerLocation: "Karachi",
    verified: "false",
    rating: "4",
    title: "Good quality",
    body: "Nice carbon look. Took two days to arrive.",
    status: "approved",
    featured: "true",
    imageUrls: "https://res.cloudinary.com/example/image/upload/v1/review1.webp",
    orderId: "ORD-2026-00100",
    createdAt: "",
  },
];
