/**
 * CRAZZYCARS.PK — Real Car Catalog (replaces the generic pre-seeded one)
 * ---------------------------------------------------------------------
 * Shaped to match the admin panel structure visible in the Car Catalog UI:
 *   Make:  { name, slug, country, logo, isActive, sortOrder }
 *   Model: { name, generation, yearFrom, yearTo, bodyType, image, popular }
 *
 * Data source: LIVE Shopify collections from crazzycars.pk (17 car collections).
 * Makes NOT in your store (KIA, "Others") are removed — only real ones remain.
 */

const CDN = "https://cdn.shopify.com/s/files/1/0651/9560/6075/collections";

const carCatalog = [
  {
    make: {
      name: "Toyota",
      slug: "toyota",
      country: "Japan",
      logo: "", // upload in admin (Cloudinary) — auto-compressed to WebP
      isActive: true,
      sortOrder: 1,
    },
    models: [
      {
        name: "Corolla",
        generation: "E140",
        displayName: "Corolla E140 (2009–2014)",
        yearFrom: 2009,
        yearTo: 2014,
        bodyType: "Sedan",
        image: `${CDN}/e140.webp?v=1773855360`,
        slug: "toyota-corolla-e140-2009-2014",
        popular: true,
      },
      {
        name: "Corolla",
        generation: "E170–E210",
        displayName: "Corolla E170–E210 (2014–2026)",
        yearFrom: 2014,
        yearTo: null, // present
        bodyType: "Sedan",
        image: `${CDN}/1.8-white-scaled.jpg?v=1773852593`,
        slug: "toyota-corolla-e170-2014-2026",
        popular: true,
      },
      {
        name: "Yaris",
        generation: "",
        displayName: "Yaris (2020–Present)",
        yearFrom: 2020,
        yearTo: null,
        bodyType: "Sedan",
        image: `${CDN}/Totota_corolla_yaris.jpg?v=1780170187`,
        slug: "toyota-yaris-2020-present",
        popular: false,
      },
      {
        name: "Aqua",
        generation: "",
        displayName: "Aqua (2012–Present)",
        yearFrom: 2012,
        yearTo: null,
        bodyType: "Hatchback",
        image: `${CDN}/Toyota-Aqua_2012.jpg?v=1780170774`,
        slug: "toyota-aqua-2012-present",
        popular: false,
      },
      {
        name: "Vitz",
        generation: "",
        displayName: "Vitz (2012–Present)",
        yearFrom: 2012,
        yearTo: null,
        bodyType: "Hatchback",
        image: `${CDN}/Toyota_Vitz_420x_crop_center_faea2e4c-1412-49f7-beb0-e02b89195526.webp?v=1780170638`,
        slug: "toyota-vitz-2012-present",
        popular: false,
      },
    ],
  },

  {
    make: {
      name: "Honda",
      slug: "honda",
      country: "Japan",
      logo: "",
      isActive: true,
      sortOrder: 2,
    },
    models: [
      {
        name: "Civic",
        generation: "Reborn",
        displayName: "Civic Reborn (2006–2012)",
        yearFrom: 2006,
        yearTo: 2012,
        bodyType: "Sedan",
        image: `${CDN}/reborn.jpg?v=1771878076`,
        slug: "honda-civic-reborn-2006-2012",
        popular: true,
      },
      {
        name: "Civic",
        generation: "Rebirth",
        displayName: "Civic Rebirth (2012–2016)",
        yearFrom: 2012,
        yearTo: 2016,
        bodyType: "Sedan",
        image: `${CDN}/rebirth.jpg?v=1771878231`,
        slug: "honda-civic-rebirth-2012-2016",
        popular: true,
      },
      {
        name: "Civic",
        generation: "Civic X",
        displayName: "Civic X (2016–2021)",
        yearFrom: 2016,
        yearTo: 2021,
        bodyType: "Sedan",
        image: `${CDN}/2020-honda-civic-sport-manual-angular-front-exterior-view_100751892_l_9ea4bb02-a752-48b4-8be7-1e7dbbce139a.jpg?v=1773854472`,
        slug: "honda-civic-x-2016-2021",
        popular: true,
      },
      {
        name: "Civic",
        generation: "11th Gen",
        displayName: "Civic 11th Gen (2022–Present)",
        yearFrom: 2022,
        yearTo: null,
        bodyType: "Sedan",
        image: `${CDN}/civic-11th-cover.jpg?v=1773685986`,
        slug: "honda-civic-11th-gen-2022-present",
        popular: true,
      },
      {
        name: "City",
        generation: "Classic",
        displayName: "City Classic (2009–2020)",
        yearFrom: 2009,
        yearTo: 2020,
        bodyType: "Sedan",
        image: `${CDN}/City-old_ccc718e9-54ae-4f1b-b239-7bbb03fd9bbb.jpg?v=1773853476`,
        slug: "honda-city-classic-2009-2020",
        popular: false,
      },
      {
        name: "City",
        generation: "7th Gen",
        displayName: "City (2021–Present)",
        yearFrom: 2021,
        yearTo: null,
        bodyType: "Sedan",
        image: `${CDN}/honda_city.webp?v=1773853788`,
        slug: "honda-city-2021-present",
        popular: false,
      },
    ],
  },

  {
    make: {
      name: "Hyundai",
      slug: "hyundai",
      country: "South Korea",
      logo: "",
      isActive: true,
      sortOrder: 3,
    },
    models: [
      {
        name: "Elantra",
        generation: "CN7",
        displayName: "Elantra (2020–2024)",
        yearFrom: 2020,
        yearTo: 2024,
        bodyType: "Sedan",
        image: `${CDN}/Hyundai_Elantra_Limited.jpg?v=1775826465`,
        slug: "hyundai-elantra-2020-2024",
        popular: false,
      },
      {
        name: "Elantra Hybrid",
        generation: "CN7 Facelift",
        displayName: "Elantra Hybrid (2025–Present)",
        yearFrom: 2025,
        yearTo: null,
        bodyType: "Sedan",
        image: `${CDN}/Hyundai_Elantra_2026_50fcc4dd-9fe7-4a84-bb79-69acf6951825.jpg?v=1775849463`,
        slug: "hyundai-elantra-hybrid-2025-present",
        popular: false,
      },
      {
        name: "Sonata",
        generation: "DN8",
        displayName: "Sonata (2020–2024)",
        yearFrom: 2020,
        yearTo: 2024,
        bodyType: "Sedan",
        image: `${CDN}/Hyuandi_Conata.webp?v=1775849207`,
        slug: "hyundai-sonata-2020-2024",
        popular: false,
      },
    ],
  },

  {
    make: {
      name: "Suzuki",
      slug: "suzuki",
      country: "Japan",
      logo: "",
      isActive: true,
      sortOrder: 4,
    },
    models: [
      {
        name: "Alto",
        generation: "",
        displayName: "Alto (2020–Present)",
        yearFrom: 2020,
        yearTo: null,
        bodyType: "Hatchback",
        image: `${CDN}/Alto-Solid-White-720x466.webp?v=1773855226`,
        slug: "suzuki-alto-2020-present",
        popular: true,
      },
      {
        name: "Swift",
        generation: "4th Gen (Z Series)",
        displayName: "Swift (2025–Present)",
        yearFrom: 2025,
        yearTo: null,
        bodyType: "Hatchback",
        image: `${CDN}/Suzuki-Swift-new-shape.jpg?v=1775827594`,
        slug: "suzuki-swift-2025-present",
        popular: false,
      },
    ],
  },

  {
    make: {
      name: "Haval",
      slug: "haval",
      country: "China",
      logo: "",
      isActive: true,
      sortOrder: 5,
    },
    models: [
      {
        name: "H6",
        generation: "",
        displayName: "H6 (2021–Present)",
        yearFrom: 2021,
        yearTo: null,
        bodyType: "SUV",
        image: `${CDN}/haval-H6.png?v=1773854230`,
        slug: "haval-h6-2021-present",
        popular: false,
      },
    ],
  },
];

module.exports = { carCatalog };
