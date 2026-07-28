/**
 * CRAZZYCARS.PK — Vehicles (Shop by Car)
 * --------------------------------------
 * Built from LIVE Shopify data — all 17 car collections.
 * Clean names + SEO meta written for Pakistan car-accessory searches
 * (pattern: "[Car] Accessories in Pakistan | Body Kits, LED & More").
 *
 * NOTE on legacy collections (seen in your screenshots):
 *  - "Toyota Car Accessories" (16) and "Honda Civic Accessories" (11)
 *    are old brand-level collections. Their products get mapped to the
 *    right generation (or brand) during product migration — they are NOT
 *    separate vehicles here.
 *  - "* — Shop by Model" collections are brand landing pages → the MAKE level.
 */

const CDN = "https://cdn.shopify.com/s/files/1/0651/9560/6075/collections";

const vehicles = [
  /* ================= TOYOTA ================= */
  {
    make: "Toyota",
    model: "Corolla",
    generation: "E140",
    displayName: "Toyota Corolla E140 (2009–2014)",
    yearFrom: 2009,
    yearTo: 2014,
    slug: "toyota-corolla-e140-2009-2014",
    image: `${CDN}/e140.webp?v=1773855360`,
    metaTitle: "Toyota Corolla 2009–2014 Accessories & Body Kits in Pakistan | CrazzyCars.pk",
    metaDescription:
      "Shop Toyota Corolla E140 2009-2014 accessories in Pakistan — body kits, splitters, LED lights, carbon fiber trims & more. Cash on Delivery nationwide.",
    shopifyHandle: "toyota-corolla-2009-2014-accessories",
    shopifyId: "gid://shopify/Collection/307086852155",
    sortOrder: 1,
  },
  {
    make: "Toyota",
    model: "Corolla",
    generation: "E170–E210",
    displayName: "Toyota Corolla E170–E210 (2014–2026)",
    yearFrom: 2014,
    yearTo: null,
    slug: "toyota-corolla-e170-2014-2026",
    image: `${CDN}/1.8-white-scaled.jpg?v=1773852593`,
    metaTitle: "Toyota Corolla 2014–2026 Accessories & Body Kits in Pakistan | CrazzyCars.pk",
    metaDescription:
      "Premium Toyota Corolla E170/E210 2014-2026 accessories in Pakistan — Grande body kits, side mirror covers, window louvers, LED upgrades. COD available.",
    shopifyHandle: "toyota-corolla-e170-2014-2020-accessories",
    shopifyId: "gid://shopify/Collection/307088523323",
    sortOrder: 2,
  },
  {
    make: "Toyota",
    model: "Yaris",
    generation: "",
    displayName: "Toyota Yaris (2020–Present)",
    yearFrom: 2020,
    yearTo: null,
    slug: "toyota-yaris-2020-present",
    image: `${CDN}/Totota_corolla_yaris.jpg?v=1780170187`,
    metaTitle: "Toyota Yaris Accessories in Pakistan | Body Kits & LED | CrazzyCars.pk",
    metaDescription:
      "Shop Toyota Yaris accessories in Pakistan — splitters, spoilers, chrome trims, LED lights & interior upgrades. Cash on Delivery all over Pakistan.",
    shopifyHandle: "toyota-yaris-accessories-shop-online-crazzycars-pk",
    shopifyId: "gid://shopify/Collection/310666133563",
    sortOrder: 3,
  },
  {
    make: "Toyota",
    model: "Aqua",
    generation: "",
    displayName: "Toyota Aqua (2012–Present)",
    yearFrom: 2012,
    yearTo: null,
    slug: "toyota-aqua-2012-present",
    image: `${CDN}/Toyota-Aqua_2012.jpg?v=1780170774`,
    metaTitle: "Toyota Aqua Accessories in Pakistan | CrazzyCars.pk",
    metaDescription:
      "Upgrade your Toyota Aqua with premium accessories in Pakistan — body kits, LED lights, interior styling & carbon fiber trims. COD nationwide.",
    shopifyHandle: "toyota-aqua-accessories-shop-online-crazzycars-pk",
    shopifyId: "gid://shopify/Collection/310666199099",
    sortOrder: 4,
  },
  {
    make: "Toyota",
    model: "Vitz",
    generation: "",
    displayName: "Toyota Vitz (2012–Present)",
    yearFrom: 2012,
    yearTo: null,
    slug: "toyota-vitz-2012-present",
    image: `${CDN}/Toyota_Vitz_420x_crop_center_faea2e4c-1412-49f7-beb0-e02b89195526.webp?v=1780170638`,
    metaTitle: "Toyota Vitz Accessories in Pakistan | CrazzyCars.pk",
    metaDescription:
      "Shop Toyota Vitz accessories online in Pakistan — exterior styling, LED lights & interior upgrades with Cash on Delivery.",
    shopifyHandle: "toyota-vitz-accessories-shop-online-crazzycars-pk",
    shopifyId: "gid://shopify/Collection/310666231867",
    sortOrder: 5,
  },

  /* ================= HONDA ================= */
  {
    make: "Honda",
    model: "Civic",
    generation: "Reborn",
    displayName: "Honda Civic Reborn (2006–2012)",
    yearFrom: 2006,
    yearTo: 2012,
    slug: "honda-civic-reborn-2006-2012",
    image: `${CDN}/reborn.jpg?v=1771878076`,
    metaTitle: "Honda Civic Reborn 2006–2012 Accessories in Pakistan | CrazzyCars.pk",
    metaDescription:
      "Shop Honda Civic Reborn 2006-2012 accessories in Pakistan — body kits, spoilers, LED lights, interior trims & more. Cash on Delivery nationwide.",
    shopifyHandle: "honda-civic-reborn-2006-2012-accessories",
    shopifyId: "gid://shopify/Collection/307086295099",
    sortOrder: 10,
  },
  {
    make: "Honda",
    model: "Civic",
    generation: "Rebirth",
    displayName: "Honda Civic Rebirth (2012–2016)",
    yearFrom: 2012,
    yearTo: 2016,
    slug: "honda-civic-rebirth-2012-2016",
    image: `${CDN}/rebirth.jpg?v=1771878231`,
    metaTitle: "Honda Civic Rebirth 2012–2016 Accessories & Body Kits | CrazzyCars.pk",
    metaDescription:
      "Premium Honda Civic Rebirth 2012-2016 accessories in Pakistan — body kits, splitters, side skirts, LED upgrades. COD all over Pakistan.",
    shopifyHandle: "honda-civic-rebirth-2012-2016-accessories-body-kits",
    shopifyId: "gid://shopify/Collection/307086393403",
    sortOrder: 11,
  },
  {
    make: "Honda",
    model: "Civic",
    generation: "Civic X",
    displayName: "Honda Civic X (2016–2021)",
    yearFrom: 2016,
    yearTo: 2021,
    slug: "honda-civic-x-2016-2021",
    image: `${CDN}/2020-honda-civic-sport-manual-angular-front-exterior-view_100751892_l_9ea4bb02-a752-48b4-8be7-1e7dbbce139a.jpg?v=1773854472`,
    metaTitle: "Honda Civic X 2016–2021 Accessories & Body Kits in Pakistan | CrazzyCars.pk",
    metaDescription:
      "Shop Honda Civic X 2016-2021 accessories in Pakistan — body kits, splitters, spoilers, quarter window louvers & LED lights. Cash on Delivery.",
    shopifyHandle: "honda-civic-x-2016-2021-accessories-body-kits",
    shopifyId: "gid://shopify/Collection/307088326715",
    sortOrder: 12,
  },
  {
    make: "Honda",
    model: "Civic",
    generation: "11th Gen",
    displayName: "Honda Civic 11th Gen (2022–Present)",
    yearFrom: 2022,
    yearTo: null,
    slug: "honda-civic-11th-gen-2022-present",
    image: `${CDN}/civic-11th-cover.jpg?v=1773685986`,
    metaTitle: "Honda Civic 11th Gen 2022+ Accessories in Pakistan | CrazzyCars.pk",
    metaDescription:
      "Upgrade your Honda Civic 11th Gen 2022-Present — body kits, carbon fiber trims, LED upgrades & interior accessories. COD nationwide in Pakistan.",
    shopifyHandle: "honda-civic-11th-gen-2022-present-accessories",
    shopifyId: "gid://shopify/Collection/307088425019",
    sortOrder: 13,
  },
  {
    make: "Honda",
    model: "City",
    generation: "Classic",
    displayName: "Honda City Classic (2009–2020)",
    yearFrom: 2009,
    yearTo: 2020,
    slug: "honda-city-classic-2009-2020",
    image: `${CDN}/City-old_ccc718e9-54ae-4f1b-b239-7bbb03fd9bbb.jpg?v=1773853476`,
    metaTitle: "Honda City 2009–2020 Accessories & Body Kits in Pakistan | CrazzyCars.pk",
    metaDescription:
      "Shop Honda City Classic accessories in Pakistan — body kits, front splitters, side skirts, LED upgrades & chrome trims. Cash on Delivery.",
    shopifyHandle: "honda-city-2016-accessories-body-kits",
    shopifyId: "gid://shopify/Collection/307086590011",
    sortOrder: 14,
  },
  {
    make: "Honda",
    model: "City",
    generation: "7th Gen",
    displayName: "Honda City (2021–Present)",
    yearFrom: 2021,
    yearTo: null,
    slug: "honda-city-2021-present",
    image: `${CDN}/honda_city.webp?v=1773853788`,
    metaTitle: "Honda City 2021–Present Accessories in Pakistan | CrazzyCars.pk",
    metaDescription:
      "Premium Honda City 2021-Present accessories in Pakistan — interior, exterior & LED upgrades from CrazzyCars.pk. COD all over Pakistan.",
    shopifyHandle: "honda-city",
    shopifyId: "gid://shopify/Collection/305270816827",
    sortOrder: 15,
  },

  {
    make: "Honda",
    model: "Vezel",
    generation: "1st Gen",
    displayName: "Honda Vezel (2013–2018)",
    yearFrom: 2013,
    yearTo: 2018,
    slug: "honda-vezel-2013-2018",
    image: "",
    metaTitle: "Honda Vezel 2013–2018 Accessories in Pakistan | CrazzyCars.pk",
    metaDescription:
      "Shop Honda Vezel 2013-2018 accessories in Pakistan — body kits & styling upgrades. Cash on Delivery nationwide.",
    shopifyHandle: "",
    shopifyId: "",
    sortOrder: 16,
  },

  /* ================= HYUNDAI ================= */
  {
    make: "Hyundai",
    model: "Elantra",
    generation: "CN7",
    displayName: "Hyundai Elantra (2020–2024)",
    yearFrom: 2020,
    yearTo: 2024,
    slug: "hyundai-elantra-2020-2024",
    image: `${CDN}/Hyundai_Elantra_Limited.jpg?v=1775826465`,
    metaTitle: "Hyundai Elantra 2020–2024 Accessories in Pakistan | CrazzyCars.pk",
    metaDescription:
      "Shop Hyundai Elantra 2020-2024 accessories in Pakistan — carbon fiber interior trims & styling upgrades. Cash on Delivery nationwide.",
    shopifyHandle: "hyundai-elantra-2020-2024-accessories",
    shopifyId: "gid://shopify/Collection/308798193723",
    sortOrder: 20,
  },
  {
    make: "Hyundai",
    model: "Elantra Hybrid",
    generation: "CN7 Facelift",
    displayName: "Hyundai Elantra Hybrid (2025–Present)",
    yearFrom: 2025,
    yearTo: null,
    slug: "hyundai-elantra-hybrid-2025-present",
    image: `${CDN}/Hyundai_Elantra_2026_50fcc4dd-9fe7-4a84-bb79-69acf6951825.jpg?v=1775849463`,
    metaTitle: "Hyundai Elantra Hybrid 2025+ Accessories in Pakistan | CrazzyCars.pk",
    metaDescription:
      "Premium Hyundai Elantra Hybrid 2025-Present accessories in Pakistan — interior trims, exterior styling & more. COD available.",
    shopifyHandle: "hyundai-elantra-hybrid-2025-present-accessories",
    shopifyId: "gid://shopify/Collection/308798324795",
    sortOrder: 21,
  },
  {
    make: "Hyundai",
    model: "Sonata",
    generation: "DN8",
    displayName: "Hyundai Sonata (2020–2024)",
    yearFrom: 2020,
    yearTo: 2024,
    slug: "hyundai-sonata-2020-2024",
    image: `${CDN}/Hyuandi_Conata.webp?v=1775849207`,
    metaTitle: "Hyundai Sonata 2020–2024 Accessories in Pakistan | CrazzyCars.pk",
    metaDescription:
      "Shop Hyundai Sonata DN8 2020-2024 accessories in Pakistan — carbon fiber trims, styling & interior upgrades. Cash on Delivery.",
    shopifyHandle: "hyundai-sonata-2020-2024-accessories",
    shopifyId: "gid://shopify/Collection/308798750779",
    sortOrder: 22,
  },

  /* ================= HAVAL ================= */
  {
    make: "Haval",
    model: "H6",
    generation: "",
    displayName: "Haval H6 (2021–Present)",
    yearFrom: 2021,
    yearTo: null,
    slug: "haval-h6-2021-present",
    image: `${CDN}/haval-H6.png?v=1773854230`,
    metaTitle: "Haval H6 Accessories in Pakistan | CrazzyCars.pk",
    metaDescription:
      "Upgrade your Haval H6 with premium accessories in Pakistan — exterior styling, interior trims & LED upgrades. COD nationwide.",
    shopifyHandle: "haval-h6-accessories-crazzycars-pk",
    shopifyId: "gid://shopify/Collection/307087245371",
    sortOrder: 30,
  },

  /* ================= SUZUKI ================= */
  {
    make: "Suzuki",
    model: "Alto",
    generation: "",
    displayName: "Suzuki Alto (2020–Present)",
    yearFrom: 2020,
    yearTo: null,
    slug: "suzuki-alto-2020-present",
    image: `${CDN}/Alto-Solid-White-720x466.webp?v=1773855226`,
    metaTitle: "Suzuki Alto 2020+ Accessories in Pakistan | CrazzyCars.pk",
    metaDescription:
      "Shop Suzuki Alto 2020-Present accessories in Pakistan — Audi-style indicators, LED lights, interior & exterior upgrades. Cash on Delivery.",
    shopifyHandle: "suzuki-alto-2020-accessories",
    shopifyId: "gid://shopify/Collection/307925450811",
    sortOrder: 40,
  },
  {
    make: "Suzuki",
    model: "Swift",
    generation: "4th Gen (Z Series)",
    displayName: "Suzuki Swift (2025–Present)",
    yearFrom: 2025,
    yearTo: null,
    slug: "suzuki-swift-2025-present",
    image: `${CDN}/Suzuki-Swift-new-shape.jpg?v=1775827594`,
    metaTitle: "Suzuki Swift 2025+ Accessories in Pakistan | CrazzyCars.pk",
    metaDescription:
      "Premium Suzuki Swift 2025-Present (4th Gen) accessories in Pakistan — styling, LED & interior upgrades. COD all over Pakistan.",
    shopifyHandle: "suzuki-swift-2025-present-accessories",
    shopifyId: "gid://shopify/Collection/308798849083",
    sortOrder: 41,
  },
];

/**
 * Brand (Make) landing pages — used for the top level of the filter
 * and for /cars/toyota style landing pages. Images from the
 * "Shop by Model" Shopify collections.
 */
const makes = [
  {
    name: "Toyota",
    slug: "toyota",
    image: `${CDN}/corolla_d9ee3dcd-7b82-4f1b-88e3-9030b83fa12d.webp?v=1780039694`,
    metaTitle: "Toyota Car Accessories in Pakistan — Shop by Model | CrazzyCars.pk",
    shopifyHandle: "toyota-accessories-shop-by-model-crazzycars-pk",
    sortOrder: 1,
  },
  {
    name: "Honda",
    slug: "honda",
    image: `${CDN}/civic_b0c60c3e-60ac-426b-bb2c-ea3e5ee523d9.png?v=1780039702`,
    metaTitle: "Honda Car Accessories in Pakistan — Shop by Model | CrazzyCars.pk",
    shopifyHandle: "honda-accessories-shop-by-model-crazzycars-pk",
    sortOrder: 2,
  },
  {
    name: "Hyundai",
    slug: "hyundai",
    image: `${CDN}/Hyundai_Elantra_Limited_0fdaec77-23e6-422f-acb7-7eafc5b57786.jpg?v=1780039710`,
    metaTitle: "Hyundai Car Accessories in Pakistan — Shop by Model | CrazzyCars.pk",
    shopifyHandle: "hyundai-accessories-shop-by-model-crazzycars-pk",
    sortOrder: 3,
  },
  {
    name: "Suzuki",
    slug: "suzuki",
    image: `${CDN}/Alto-Solid-White-720x466_03c6dcd5-017e-4510-bd13-1f42819717e0.webp?v=1780039717`,
    metaTitle: "Suzuki Car Accessories in Pakistan — Shop by Model | CrazzyCars.pk",
    shopifyHandle: "suzuki-accessories-shop-by-model-crazzycars-pk",
    sortOrder: 4,
  },
  {
    name: "Haval",
    slug: "haval",
    image: `${CDN}/haval-H6.png?v=1773854230`,
    metaTitle: "Haval Car Accessories in Pakistan | CrazzyCars.pk",
    shopifyHandle: "",
    sortOrder: 5,
  },
];

/**
 * Legacy Shopify collections → mapping hints for product migration:
 *  - "toyota-car-accessories" (16 products)  → assign per-product to the right Toyota generation
 *  - "honda-civic-accessories" (11 products) → assign per-product to the right Civic generation
 */
const legacyCollectionMap = {
  "toyota-car-accessories": { make: "Toyota" },
  "honda-civic-accessories": { make: "Honda", model: "Civic" },
};

module.exports = { vehicles, makes, legacyCollectionMap };
