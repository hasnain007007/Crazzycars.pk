const mongoose = require("mongoose");
const fs = require("fs");

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const P = mongoose.connection.db.collection("products");
  const articleNo = "CC-0283";
  const slug = "suzuki-swift-2022-2026-carbon-fiber-steering-trim";

  const before = await P.findOne({ articleNo }, { projection: { status: 1, pricing: 1, "media.images": 1 } });
  console.log("BEFORE", JSON.stringify(before));

  const files = fs
    .readdirSync("/app/media/products")
    .filter((f) => f.startsWith(slug + "-recon-") && f.endsWith(".webp") && !f.includes("-400."));
  files.sort();
  const img1 = files.find((f) => f.includes("01-product")) || files[0];
  const img2 = files.find((f) => f.includes("02-detail")) || files[1];
  if (!img1 || !img2) {
    console.log("MISSING_FILES", files);
    process.exit(2);
  }

  const mediaImages = [
    {
      url: `https://crazzycars.pk/media/products/${img1}`,
      publicId: "",
      isMain: true,
      altText:
        "Suzuki Swift 2022–2026 Carbon Fiber Steering Trim — reconstructed product visual with CrazzyCars.pk branding",
      label: "",
      imageName: "Suzuki Swift 2022-2026 Carbon Fiber Steering Trim",
    },
    {
      url: `https://crazzycars.pk/media/products/${img2}`,
      publicId: "",
      isMain: false,
      altText:
        "Suzuki Swift 2022–2026 Carbon Fiber Steering Trim — reconstructed fitted detail visual with CrazzyCars.pk branding",
      label: "",
      imageName: "Suzuki Swift 2022-2026 Carbon Fiber Steering Trim fitted",
    },
  ];

  const r = await P.updateOne(
    { articleNo },
    {
      $set: {
        status: "active",
        "pricing.regularPrice": 6000,
        "pricing.salePrice": 5199,
        "pricing.costPerItem": 0,
        "media.images": mediaImages,
        "seo.excludeFromMerchantFeed": false,
        shortDescription:
          "Suzuki Swift 2022-2026 Carbon Fiber Steering Trim. One-piece carbon-look ABS lower steering spoke trim. See the current carbon fiber accessories price in Pakistan on this page. Cash on Delivery across Pakistan.",
        longDescription:
          '<p data-cc-aeo="1">The Suzuki Swift 2022-2026 Carbon Fiber Steering Trim is sold by CrazzyCars.pk, a Gujranwala car accessories shop founded in 2023; its current price in Pakistan is on this page. One-piece carbon-fiber-style ABS trim for the lower steering spoke on Suzuki Swift New 2022–2026. Cash on Delivery across Pakistan. Confirm fitment on WhatsApp 03284010007.</p>\n',
        features: [
          "1-piece continuous carbon-look trim",
          "Listed fitment: Suzuki Swift New 2022–2026",
          "Lower steering spoke trim",
          "Peel-and-stick install",
        ],
        specifications: [
          { label: "Fitment", value: "Suzuki Swift New 2022–2026" },
          { label: "Finish", value: "Carbon fiber style" },
          { label: "Material", value: "Carbon-fiber-style ABS (not woven carbon)" },
          { label: "Pieces", value: "1-piece continuous trim" },
          { label: "Item code", value: "CC-0283" },
          { label: "Condition", value: "New" },
        ],
        updatedAt: new Date(),
      },
    }
  );
  console.log("UPDATE", JSON.stringify(r));
  const after = await P.findOne(
    { articleNo },
    {
      projection: {
        articleNo: 1,
        slug: 1,
        status: 1,
        pricing: 1,
        "seo.excludeFromMerchantFeed": 1,
        "media.images": 1,
      },
    }
  );
  console.log("AFTER", JSON.stringify(after, null, 2));
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
