#!/usr/bin/env node
/**
 * Seed crazzycars_local_verify (or similarly named local DB) with a realistic
 * catalog for mobile API verification.
 *
 * SAFETY: refuses unless Mongo host is localhost/127.0.0.1 AND the database
 * name contains "local" or "verify". Never touches production.
 *
 * Usage (from storecraft-store or repo root):
 *   MONGODB_URI='mongodb://127.0.0.1:27028/crazzycars_local_verify' \
 *     node scripts/seed-local-catalog.mjs
 */
import { fileURLToPath } from "url";
import path from "path";
import { createRequire } from "module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const storeRoot = path.resolve(__dirname, "../storecraft-store");
const require = createRequire(path.join(storeRoot, "package.json"));
const storeMongoose = require("mongoose");

const URI = process.env.MONGODB_URI || process.env.MONGO_URI || "";

function assertSafeUri(uri) {
  if (!uri || !String(uri).trim()) {
    throw new Error("MONGODB_URI is required.");
  }
  let parsed;
  try {
    parsed = new URL(uri.replace(/^mongodb\+srv:/, "https:").replace(/^mongodb:/, "http:"));
  } catch {
    throw new Error(`Invalid MONGODB_URI: ${uri}`);
  }
  const host = (parsed.hostname || "").toLowerCase();
  if (host !== "localhost" && host !== "127.0.0.1") {
    throw new Error(
      `Refusing to seed: host must be localhost or 127.0.0.1 (got "${host}").`,
    );
  }
  const dbName =
    (parsed.pathname || "").replace(/^\//, "").split("?")[0] ||
    uri.split("/").pop()?.split("?")[0] ||
    "";
  const lower = dbName.toLowerCase();
  if (!lower.includes("local") && !lower.includes("verify")) {
    throw new Error(
      `Refusing to seed: database name must contain "local" or "verify" (got "${dbName}").`,
    );
  }
  if (/sialkot|production|prod|crazzycars\.pk/i.test(uri)) {
    throw new Error("Refusing to seed: URI looks like production.");
  }
  return { host, dbName };
}

const PLACEHOLDER_IMG =
  "https://res.cloudinary.com/demo/image/upload/w_600,h_600,c_fill/sample.jpg";

function oid() {
  return new storeMongoose.Types.ObjectId();
}

function productDoc(partial) {
  const id = partial._id || oid();
  const slug = partial.slug;
  const name = partial.name;
  const regular = Number(partial.regularPrice ?? partial.price ?? 2999);
  const sale = partial.salePrice != null ? Number(partial.salePrice) : null;
  return {
    _id: id,
    name,
    slug,
    articleNo: partial.articleNo || `LV-${slug}`.slice(0, 40).toUpperCase(),
    shortDescription: partial.shortDescription || `${name} — local verify SKU`,
    longDescription: `<p>${name} seeded for local mobile API verification. Fake data only.</p>`,
    status: "active",
    categories: partial.categories || [],
    compatibleVehicles: partial.compatibleVehicles || [],
    isUniversal: Boolean(partial.isUniversal),
    featured: Boolean(partial.featured),
    isFeatured: Boolean(partial.featured),
    isDeal: Boolean(partial.isDeal),
    newArrival: Boolean(partial.newArrival),
    isBulky: Boolean(partial.isBulky),
    codEnabled: partial.codEnabled !== false,
    pricing: {
      regularPrice: regular,
      salePrice: sale && sale < regular ? sale : null,
      costPerItem: Math.round(regular * 0.4),
    },
    inventory: {
      trackInventory: true,
      quantity: partial.stock ?? 25,
      allowBackorder: false,
    },
    media: {
      images: [
        {
          url: PLACEHOLDER_IMG,
          altText: name,
          isMain: true,
          publicId: "",
        },
      ],
    },
    simpleVariations: partial.simpleVariations || [],
    variationCombinations: partial.variationCombinations || [],
    shippingBaseWeight: partial.shippingBaseWeight ?? 0.5,
    shippingBaseWeightUnit: "kg",
    vehicleCompatibility: partial.vehicleCompatibility || {
      fitmentType: partial.isUniversal ? "universal" : "specific",
      vehicles: [],
    },
  };
}

async function main() {
  const { host, dbName } = assertSafeUri(URI);
  console.log(`Seeding host=${host} db=${dbName}`);

  await storeMongoose.connect(URI, { serverSelectionTimeoutMS: 8000 });
  const db = storeMongoose.connection.db;

  // Wipe only this local/verify DB collections we own.
  const cols = [
    "products",
    "categories",
    "vehicles",
    "settings",
    "shippingzones",
    "banners",
    "coupons",
    "customers",
    "orders",
    "customerrefreshtokens",
    "mobiledevices",
    "idempotencykeys",
    "loginattempts",
  ];
  for (const c of cols) {
    try {
      await db.collection(c).deleteMany({});
    } catch {
      /* empty */
    }
  }

  const catDefs = [
    { name: "Lights", slug: "lights" },
    { name: "Exterior", slug: "exterior" },
    { name: "Interior", slug: "interior" },
    { name: "Body Kits & Extensions", slug: "body-kits-extensions" },
    { name: "Floor Mats", slug: "floor-mats" },
    { name: "Mirrors", slug: "mirrors" },
  ];
  const catIds = {};
  const catDocs = catDefs.map((c, i) => {
    const _id = oid();
    catIds[c.slug] = _id;
    return {
      _id,
      name: c.name,
      slug: c.slug,
      status: "active",
      sortOrder: i,
      showInNav: true,
      showOnHomepage: true,
      homepageOrder: i,
      level: 0,
      image: { url: PLACEHOLDER_IMG, altText: c.name },
    };
  });
  await db.collection("categories").insertMany(catDocs);

  const vehicles = [
    {
      _id: oid(),
      make: "Honda",
      model: "Civic",
      generation: "11th Gen",
      displayName: "Honda Civic 11th Gen (2022-2026)",
      yearFrom: 2022,
      yearTo: 2026,
      slug: "honda-civic-11th-2022-2026",
      catalogModelSlug: "civic-11th",
      isActive: true,
      sortOrder: 1,
    },
    {
      _id: oid(),
      make: "Toyota",
      model: "Corolla",
      generation: "E170",
      displayName: "Toyota Corolla 2014-2019",
      yearFrom: 2014,
      yearTo: 2019,
      slug: "toyota-corolla-2014-2019",
      catalogModelSlug: "corolla-e170",
      isActive: true,
      sortOrder: 2,
    },
    {
      _id: oid(),
      make: "Suzuki",
      model: "Swift",
      generation: "4th Gen",
      displayName: "Suzuki Swift 2022-2025",
      yearFrom: 2022,
      yearTo: 2025,
      slug: "suzuki-swift-2022-2025",
      catalogModelSlug: "swift-4th",
      isActive: true,
      sortOrder: 3,
    },
  ];
  await db.collection("vehicles").insertMany(vehicles);
  const [civic, corolla, swift] = vehicles;

  const leftId = oid();
  const rightId = oid();

  const products = [];
  let n = 0;
  const push = (p) => {
    products.push(productDoc(p));
    n += 1;
  };

  // Body kits (COD blocked by name/slug)
  push({
    name: "Honda Civic Body Kit D1",
    slug: "honda-civic-body-kit-d1",
    articleNo: "LV-BK-D1",
    categories: [catIds["body-kits-extensions"]],
    compatibleVehicles: [civic._id],
    isBulky: true,
    featured: true,
    regularPrice: 45000,
    salePrice: 39999,
    isDeal: true,
    stock: 8,
  });
  push({
    name: "Toyota Corolla Body Kit Sports",
    slug: "toyota-corolla-body-kit-sports",
    articleNo: "LV-BK-COR",
    categories: [catIds["body-kits-extensions"]],
    compatibleVehicles: [corolla._id],
    isBulky: true,
    regularPrice: 42000,
    stock: 5,
  });

  // Bulky non-body-kit
  push({
    name: "Trunk Lip Spoiler ABS",
    slug: "trunk-lip-spoiler-abs",
    articleNo: "LV-SP-1",
    categories: [catIds.exterior],
    compatibleVehicles: [civic._id, corolla._id],
    isBulky: true,
    regularPrice: 5500,
    salePrice: 4499,
    isDeal: true,
    stock: 12,
  });

  // Variant product (side L/R)
  push({
    name: "Side Mirror LED Cover",
    slug: "side-mirror-led-cover",
    articleNo: "LV-MIR-1",
    categories: [catIds.mirrors, catIds.exterior],
    compatibleVehicles: [civic._id],
    featured: true,
    regularPrice: 3499,
    salePrice: 2999,
    isDeal: true,
    stock: 40,
    simpleVariations: [{ name: "Side", enabled: true, tags: ["Left", "Right"] }],
    variationCombinations: [
      {
        _id: leftId,
        options: [{ name: "Side", value: "Left" }],
        price: 2999,
        compareAtPrice: 3499,
        stock: 20,
        sku: "MIR-L",
      },
      {
        _id: rightId,
        options: [{ name: "Side", value: "Right" }],
        price: 2999,
        compareAtPrice: 3499,
        stock: 20,
        sku: "MIR-R",
      },
    ],
  });

  // Universal-only (not on /cars unless linked)
  push({
    name: "Universal RGB Ambient Light Strip",
    slug: "universal-rgb-ambient-light-strip",
    articleNo: "LV-UNI-1",
    categories: [catIds.interior, catIds.lights],
    compatibleVehicles: [],
    isUniversal: true,
    regularPrice: 1899,
    stock: 50,
    vehicleCompatibility: { fitmentType: "universal", vehicles: [] },
  });

  // Low-stock for oversell test
  push({
    name: "Fog Lamp Cover Low Stock",
    slug: "fog-lamp-cover-low-stock",
    articleNo: "LV-LOW-1",
    categories: [catIds.lights],
    compatibleVehicles: [civic._id, swift._id],
    regularPrice: 1200,
    stock: 2,
  });

  // Fill to ~40 across categories
  const fillers = [
    ["LED Headlight Bulb H4", "led-headlight-bulb-h4", "lights", [civic._id, corolla._id], 2499, true],
    ["LED Tail Light Strip", "led-tail-light-strip", "lights", [corolla._id], 1999, false],
    ["DRL Fog Lamp Set", "drl-fog-lamp-set", "lights", [civic._id], 3200, true],
    ["Carbon Steering Cover", "carbon-steering-cover", "interior", [civic._id], 2800, true],
    ["Gear Knob Carbon Style", "gear-knob-carbon-style", "interior", [civic._id, swift._id], 999, false],
    ["Door Handle Cover Set", "door-handle-cover-set", "exterior", [swift._id], 1500, false],
    ["Front Grille Mesh", "front-grille-mesh", "exterior", [corolla._id], 4500, true],
    ["Floor Mat 5D Black", "floor-mat-5d-black", "floor-mats", [civic._id], 6500, false],
    ["Floor Mat Beige", "floor-mat-beige", "floor-mats", [corolla._id], 6200, false],
    ["Mirror Indicator LED", "mirror-indicator-led", "mirrors", [civic._id], 1100, false],
    ["Blind Spot Mirror Pair", "blind-spot-mirror-pair", "mirrors", [swift._id], 800, false],
    ["Seat Cover Premium", "seat-cover-premium", "interior", [corolla._id], 8900, true],
    ["AC Vent Ambient Kit", "ac-vent-ambient-kit", "interior", [civic._id], 2200, false],
    ["Canard Set Front", "canard-set-front", "exterior", [civic._id], 3800, false],
    ["Side Skirt Extension", "side-skirt-extension", "exterior", [corolla._id], 7200, true],
    ["Number Plate Frame", "number-plate-frame", "exterior", [swift._id], 600, false],
    ["Wheel Cap Set", "wheel-cap-set", "exterior", [civic._id, corolla._id], 1400, false],
    ["Boot Trunk Mat", "boot-trunk-mat", "floor-mats", [civic._id], 3100, false],
    ["Dashboard Cover", "dashboard-cover", "interior", [corolla._id], 2700, false],
    ["Sunshade Foldable", "sunshade-foldable", "interior", [swift._id], 900, false],
    ["Parking Sensor Kit", "parking-sensor-kit", "lights", [civic._id], 4100, false],
    ["Horn Relay Kit", "horn-relay-kit", "interior", [swift._id], 750, false],
    ["Antenna Shark Fin", "antenna-shark-fin", "exterior", [corolla._id], 1300, false],
    ["Mud Flap Set", "mud-flap-set", "exterior", [civic._id], 2100, false],
    ["Chrome Door Sill", "chrome-door-sill", "interior", [civic._id], 1800, false],
    ["Rear Bumper Reflector", "rear-bumper-reflector", "lights", [corolla._id], 950, false],
    ["Fog Light Cover Pair", "fog-light-cover-pair", "lights", [swift._id], 1600, false],
    ["Cabin Filter OEM Style", "cabin-filter-oem-style", "interior", [civic._id], 1100, false],
    ["Wiper Blade Pair", "wiper-blade-pair", "exterior", [corolla._id, swift._id], 1400, false],
    ["Phone Mount Magnetic", "phone-mount-magnetic", "interior", [], 700, false],
    ["Tire Valve Caps", "tire-valve-caps", "exterior", [], 350, false],
    ["Key Fob Shell Carbon", "key-fob-shell-carbon", "interior", [civic._id], 1200, true],
    ["USB Charging Hub", "usb-charging-hub", "interior", [], 1500, false],
  ];

  for (const [name, slug, cat, vehs, price, featured] of fillers) {
    const isDeal = price % 100 === 99 || featured;
    push({
      name,
      slug,
      categories: [catIds[cat]],
      compatibleVehicles: vehs,
      isUniversal: vehs.length === 0,
      featured,
      isDeal,
      regularPrice: price + (isDeal ? 500 : 0),
      salePrice: isDeal ? price : null,
      stock: 15 + (n % 10),
      isBulky: cat === "floor-mats",
    });
  }

  // Ensure ~40
  while (products.length < 40) {
    const i = products.length;
    push({
      name: `Verify Accessory ${i}`,
      slug: `verify-accessory-${i}`,
      categories: [catIds.exterior],
      compatibleVehicles: [civic._id],
      regularPrice: 1000 + i * 50,
      stock: 10,
    });
  }

  await db.collection("products").insertMany(products);
  console.log(`Inserted ${products.length} products, ${catDocs.length} categories, ${vehicles.length} vehicles`);

  const flashEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await db.collection("settings").insertOne({
    singletonKey: "default",
    storeName: "CrazzyCars Local Verify",
    storePayment: {
      codEnabled: true,
      minimumOrderAmount: 0,
      advancePaymentAmount: 250,
      advancePaymentMessageEnabled: true,
      advancePaymentDiscountEnabled: true,
      advancePaymentDiscountPercent: 3,
      advancePaymentMessage:
        "Pay delivery charges of {amount} and send screenshot on WhatsApp: {whatsapp}",
      advancePaymentMessageTitle: "Confirm Your Order",
    },
    pakistaniPaymentMethods: {
      cod: { enabled: true, label: "Cash on Delivery", icon: "cod" },
      jazzcash: {
        enabled: true,
        label: "JazzCash",
        accountNumber: "03000000000",
        accountName: "LOCAL VERIFY FAKE",
        icon: "jazzcash",
      },
      easypaisa: { enabled: false, label: "Easypaisa", icon: "easypaisa" },
      bankTransfer: {
        enabled: true,
        label: "Bank Transfer",
        bankName: "Fake Meezan Local",
        accountNumber: "00000000000000",
        accountTitle: "LOCAL VERIFY FAKE",
        iban: "PK00FAKE0000000000000000",
        icon: "bank",
      },
      hbl: { enabled: false },
      meezan: { enabled: false },
      ubl: { enabled: false },
    },
    contact: {
      phone: "03000000000",
      whatsapp: "03000000000",
      email: "local-verify@example.com",
      address: "Local verify only",
    },
    whatsapp: {
      enabled: true,
      number: "03000000000",
      display: "03000000000",
    },
    homepageSettings: {
      flashSaleEnabled: true,
      flashSaleTitle: "Local Flash Sale",
      flashSaleEndTime: flashEnd,
      brands: [
        { name: "Honda", slug: "honda", isActive: true, order: 0 },
        { name: "Toyota", slug: "toyota", isActive: true, order: 1 },
        { name: "Suzuki", slug: "suzuki", isActive: true, order: 2 },
      ],
      sectionTitles: {
        hotDeals: "Hot Deals",
        bestSellers: "Best Sellers",
        brands: "Trusted Brands",
        flashSale: "Flash Sale",
      },
      hotDeals: { title: "Hot Deals", subtitle: "Local verify deals" },
      bestSellers: { title: "Best Sellers" },
    },
    orderNumber: {
      prefix: "ORD",
      includeYear: true,
      startingNumber: 1,
      currentSequence: 0,
      padding: 5,
    },
    mobileApp: {
      minVersionIos: "1.0.0",
      minVersionAndroid: "1.0.0",
      maintenanceMode: false,
      maintenanceMessage: "",
    },
    // Scrub any SEO/CAPI tokens
    seo: {
      facebookPixelId: "",
      metaCapiAccessToken: "",
      metaCapiTestEventCode: "",
    },
  });

  await db.collection("shippingzones").insertOne({
    name: "Pakistan Default",
    provinces: ["Punjab", "Sindh", "Khyber Pakhtunkhwa", "Balochistan", "Islamabad Capital Territory"],
    isDefault: true,
    status: "active",
    freeShipping: { enabled: false, threshold: 0 },
    freeShippingThreshold: 0,
    weightRanges: [
      { minWeight: 0, maxWeight: 100000, price: 250 },
    ],
    sortOrder: 0,
  });

  await db.collection("banners").insertOne({
    title: "Local Verify Banner",
    subtitle: "Fake data only",
    image: { url: PLACEHOLDER_IMG },
    link: "/categories/lights",
    cta: "Shop",
    status: "active",
    sortOrder: 0,
  });

  await db.collection("coupons").insertOne({
    code: "SAVE100",
    discountType: "fixed",
    discountValue: 100,
    status: "active",
    minOrderAmount: 0,
    maxDiscount: 0,
    usageLimit: 1000,
    usedCount: 0,
    expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    appliesTo: "all",
    categoryIds: [],
  });
  const bodyKit = products.find((p) => p.slug === "honda-civic-body-kit-d1");
  const simple = products.find((p) => p.slug === "led-headlight-bulb-h4");
  const variant = products.find((p) => p.slug === "side-mirror-led-cover");
  const low = products.find((p) => p.slug === "fog-lamp-cover-low-stock");
  const bulky = products.find((p) => p.slug === "trunk-lip-spoiler-abs");
  const universal = products.find((p) => p.slug === "universal-rgb-ambient-light-strip");

  console.log(
    JSON.stringify(
      {
        ok: true,
        db: dbName,
        ids: {
          PRODUCT_ID: String(simple._id),
          PRODUCT_SLUG: simple.slug,
          VARIANT_PRODUCT_ID: String(variant._id),
          BODY_KIT_ID: String(bodyKit._id),
          LOW_STOCK_ID: String(low._id),
          BULKY_ID: String(bulky._id),
          UNIVERSAL_ID: String(universal._id),
          VEHICLE_SLUG: civic.slug,
          VARIANT_LEFT_ID: String(leftId),
        },
        flashSaleEndTime: flashEnd.toISOString(),
      },
      null,
      2,
    ),
  );

  await storeMongoose.disconnect();
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
