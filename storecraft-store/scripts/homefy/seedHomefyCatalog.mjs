/**
 * Seed Homefy.pk Kitchen + Beauty Bags + Ladies Bags catalog.
 * Uses the EXISTING Category / Product schema. Car-specific product fields are omitted.
 *
 * Usage (from storecraft-store):
 *   npm run seed:homefy
 */
import mongoose from "mongoose";
import Category from "../../lib/models/Category.model.js";
import Product from "../../lib/models/Product.model.js";
import Settings, { SETTINGS_SINGLETON_KEY } from "../../lib/models/Settings.model.js";

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
const PLACEHOLDER = "/images/placeholder-product.svg";

const TREE = [
  {
    name: "Kitchen Accessories",
    slug: "kitchen-accessories",
    description: "Cookware, storage, cutlery and dining pieces for Pakistani kitchens.",
    icon: "🍳",
    children: [
      { name: "Cookware", slug: "cookware" },
      { name: "Storage & Containers", slug: "storage-containers" },
      { name: "Cutlery & Gadgets", slug: "cutlery-gadgets" },
      { name: "Dining & Serveware", slug: "dining-serveware" },
    ],
  },
  {
    name: "Beauty Bags",
    slug: "beauty-bags",
    description: "Makeup pouches, travel toiletry bags and vanity organizers.",
    icon: "💄",
    children: [
      { name: "Makeup Pouches", slug: "makeup-pouches" },
      { name: "Travel Toiletry Bags", slug: "travel-toiletry-bags" },
      { name: "Vanity & Organizer Bags", slug: "vanity-organizer-bags" },
    ],
  },
  {
    name: "Ladies Bags",
    slug: "ladies-bags",
    description: "Handbags, totes, crossbody bags and clutches for everyday wear.",
    icon: "👜",
    children: [
      { name: "Mini Handbags", slug: "mini-handbags" },
      { name: "Tote Bags", slug: "tote-bags" },
      { name: "Crossbody Bags", slug: "crossbody-bags" },
      { name: "Clutches", slug: "clutches" },
    ],
  },
];

const PRODUCTS = {
  cookware: [
    ["Non-stick Frying Pan 24cm", 2490, true],
    ["Granite Casserole Pot with Lid", 3890, false],
    ["Stainless Steel Saucepan Set", 4590, false],
    ["Cast Iron Tawa", 1990, false],
    ["Ceramic Mixing Bowl Trio", 1650, false],
    ["Heat-resistant Silicone Spatula Set", 890, false],
  ],
  "storage-containers": [
    ["Airtight Glass Jar Set (4pc)", 2190, true],
    ["Stackable Plastic Food Containers", 1490, false],
    ["Spice Rack with 12 Jars", 1890, false],
    ["Cereal Dispenser Twin Pack", 1290, false],
    ["Lunch Box with Compartments", 990, false],
    ["Vacuum Seal Canister", 1750, false],
  ],
  "cutlery-gadgets": [
    ["Stainless Steel Knife Block Set", 3290, false],
    ["Garlic Press & Peeler Duo", 690, false],
    ["Vegetable Chopper", 1190, true],
    ["Measuring Cups & Spoons", 590, false],
    ["Kitchen Scissors Heavy Duty", 750, false],
    ["Whisk and Tongs Set", 640, false],
  ],
  "dining-serveware": [
    ["Ceramic Dinner Plate Set (6)", 3490, true],
    ["Glass Water Jug with Glasses", 1890, false],
    ["Wooden Serving Tray", 1290, false],
    ["Tea Set for 6", 2790, false],
    ["Salad Bowl with Servers", 1590, false],
    ["Napkin Holder & Coasters", 790, false],
  ],
  "makeup-pouches": [
    ["Quilted Makeup Pouch", 1290, true, true],
    ["Clear Window Cosmetics Bag", 990, false, true],
    ["Double-zip Makeup Case", 1490, false, true],
    ["Velvet Lipstick Pouch", 690, false, true],
    ["Printed Travel Makeup Bag", 1190, false, true],
    ["Compact Everyday Pouch", 850, false, true],
  ],
  "travel-toiletry-bags": [
    ["Hanging Toiletry Bag", 1890, true, true],
    ["Waterproof Wet/Dry Kit", 1590, false, true],
    ["Weekend Travel Wash Bag", 1390, false, true],
    ["Mesh Bottle Organizer", 790, false, true],
    ["Fold-flat Toiletry Tote", 1190, false, true],
    ["Zippered Travel Kit", 990, false, true],
  ],
  "vanity-organizer-bags": [
    ["Acrylic Makeup Organizer", 2490, false],
    ["Jewelry & Beauty Tray", 1690, true],
    ["Drawer Divider Vanity Case", 1990, false, true],
    ["Brush Roll Organizer", 890, false, true],
    ["Standing Cosmetics Caddy", 2190, false],
    ["Mirror Compact Organizer", 1290, false],
  ],
  "mini-handbags": [
    ["Mini Structured Handbag", 2890, true, true],
    ["Pearl-handle Mini Bag", 2590, false, true],
    ["Quilted Mini Shoulder Bag", 3190, false, true],
    ["Box Mini Bag", 2390, false, true],
    ["Chain Mini Bag", 2790, false, true],
    ["Everyday Mini Satchel", 2190, false, true],
  ],
  "tote-bags": [
    ["Canvas Shopper Tote", 1890, true, true],
    ["Leather-look Work Tote", 4290, false, true],
    ["Weekend Oversized Tote", 2590, false, true],
    ["Folding Market Tote", 990, false, true],
    ["Laptop Tote 15-inch", 3490, false, true],
    ["Striped Beach Tote", 1490, false, true],
  ],
  "crossbody-bags": [
    ["Everyday Crossbody Bag", 2290, true, true],
    ["Phone Sling Crossbody", 1290, false, true],
    ["Adjustable Strap Crossbody", 1990, false, true],
    ["Quilted Crossbody", 2690, false, true],
    ["Belt-bag Crossbody", 1590, false, true],
    ["Evening Crossbody", 2490, false, true],
  ],
  clutches: [
    ["Satin Evening Clutch", 1790, true, true],
    ["Beaded Party Clutch", 2190, false, true],
    ["Envelope Clutch", 1490, false, true],
    ["Fold-over Clutch", 1290, false, true],
    ["Box Clutch with Chain", 1990, false, true],
    ["Minimal Wristlet Clutch", 990, false, true],
  ],
};

const BAG_COLORS = ["Black", "Beige", "Blush Pink", "Brown"];

function slugify(name) {
  return String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function bagVariants() {
  return {
    simpleVariations: [{ name: "Color", enabled: true, tags: [...BAG_COLORS] }],
    variationCombinations: BAG_COLORS.map((color) => ({
      options: [{ name: "Color", value: color }],
      price: 0,
      stock: 20,
      sku: "",
      image: "",
    })),
  };
}

async function upsertCategory(fields) {
  return Category.findOneAndUpdate(
    { slug: fields.slug },
    { $set: fields },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
  );
}

async function run() {
  if (!MONGO_URI) {
    console.error("Set MONGODB_URI in .env.local first.");
    process.exit(1);
  }
  if (/yg8dcwr|sialkot_motorsports/i.test(MONGO_URI)) {
    console.error("Refusing to seed: MONGODB_URI looks like CrazzyCars production.");
    process.exit(1);
  }

  await mongoose.connect(MONGO_URI);
  const host = mongoose.connection.host;
  const dbName = mongoose.connection.name;
  console.log(`Connected ${host} db=${dbName}`);

  const childIdBySlug = {};
  let sort = 1;
  for (const parent of TREE) {
    const parentDoc = await upsertCategory({
      name: parent.name,
      slug: parent.slug,
      description: parent.description,
      parentCategory: null,
      parents: [],
      ancestors: [],
      level: 0,
      sortOrder: sort++,
      status: "active",
      isFeatured: true,
      featured: true,
      showInNav: true,
      showOnHomepage: true,
      homepageIcon: parent.icon,
      seo: {
        metaTitle: `${parent.name} | Homefy.pk`,
        metaDescription: parent.description,
      },
    });
    console.log(`Parent: ${parentDoc.name}`);

    let childSort = 1;
    for (const child of parent.children) {
      const childDoc = await upsertCategory({
        name: child.name,
        slug: child.slug,
        description: `${child.name} at Homefy.pk`,
        parentCategory: parentDoc._id,
        parents: [parentDoc._id],
        ancestors: [parentDoc._id],
        level: 1,
        sortOrder: childSort++,
        status: "active",
        isFeatured: true,
        featured: true,
        showInNav: true,
        showOnHomepage: true,
        seo: {
          metaTitle: `${child.name} | Homefy.pk`,
          metaDescription: `Shop ${child.name.toLowerCase()} online in Pakistan at Homefy.pk. Cash on Delivery nationwide.`,
        },
      });
      childIdBySlug[child.slug] = { id: childDoc._id, parentId: parentDoc._id, parentName: parent.name };
      console.log(`  Child: ${childDoc.name}`);
    }
  }

  let created = 0;
  for (const [subSlug, rows] of Object.entries(PRODUCTS)) {
    const cat = childIdBySlug[subSlug];
    if (!cat) throw new Error(`Unknown subcategory slug ${subSlug}`);
    for (const [name, price, featured, withColors] of rows) {
      const slug = slugify(name);
      const variants = withColors ? bagVariants() : { simpleVariations: [], variationCombinations: [] };
      const sku = `HF-${subSlug.slice(0, 3).toUpperCase()}-${slug.slice(0, 8).toUpperCase()}`;
      await Product.findOneAndUpdate(
        { slug },
        {
          $set: {
            name,
            slug,
            articleNo: sku,
            shortDescription: `${name} from Homefy.pk — quality for Pakistani homes.`,
            longDescription: `<p>${name} is part of our ${cat.parentName} collection. Nationwide Cash on Delivery.</p>`,
            categories: [cat.id, cat.parentId],
            pricing: { regularPrice: price, salePrice: featured ? Math.round(price * 0.9) : null },
            inventory: { quantity: 40, sku, trackInventory: true, allowBackorder: false, weight: 400, weightUnit: "g" },
            media: {
              images: [
                { url: PLACEHOLDER, altText: name, isMain: true, publicId: "" },
              ],
            },
            simpleVariations: variants.simpleVariations,
            variationCombinations: variants.variationCombinations,
            status: "active",
            featured: Boolean(featured),
            isFeatured: Boolean(featured),
            newArrival: Boolean(featured),
            isDeal: Boolean(featured),
            codEnabled: true,
            seo: {
              metaTitle: `${name} | Homefy.pk`,
              metaDescription: `Buy ${name} online in Pakistan at Homefy.pk. Cash on Delivery nationwide.`,
            },
          },
        },
        { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
      );
      created += 1;
    }
  }

  const categoryCount = await Category.countDocuments();
  const productCount = await Product.countDocuments();
  const featuredCount = await Product.countDocuments({ $or: [{ featured: true }, { isFeatured: true }] });

  await Settings.findOneAndUpdate(
    { singletonKey: SETTINGS_SINGLETON_KEY },
    {
      $set: {
        "general.storeName": "Homefy.pk",
        "general.phone": "",
        "general.email": "support@homefy.pk",
        "seo.metaTitle": "Homefy.pk | Kitchen, Beauty Bags & Ladies Bags",
        "seo.defaultMetaTitle": "Homefy.pk | Kitchen, Beauty Bags & Ladies Bags",
        "seo.metaDescription":
          "Shop kitchen accessories, girls' beauty bags and ladies handbags online in Pakistan. Cash on Delivery nationwide.",
        "seo.defaultMetaDescription":
          "Shop kitchen accessories, girls' beauty bags and ladies handbags online in Pakistan. Cash on Delivery nationwide.",
        "seo.metaKeywords": "kitchen accessories, beauty bags, ladies bags, Homefy.pk, Pakistan",
        "homepageSettings.heroHeadline": "Kitchen, beauty bags & ladies bags",
        "homepageSettings.heroSubtext":
          "Cookware, makeup pouches and handbags for Pakistani homes — Cash on Delivery nationwide.",
        "homepageSettings.sections.showShopByCar": false,
        "homepageSettings.sections.showFlashSale": false,
        "homepageSettings.sections.showBrands": false,
        "homepageSettings.brands": [],
        "brandStory.heading": "Built for Pakistani Homes",
        "brandStory.subheading": "Kitchen, beauty bags and ladies bags",
        "brandStory.description":
          "Homefy.pk brings cookware, makeup pouches and ladies handbags to homes across Pakistan — with COD nationwide.",
        "brandStory.buttonText": "Shop Homefy",
        "footer.tagline": "Kitchen, beauty bags and ladies bags for Pakistani homes",
        "footer.contactEmail": "support@homefy.pk",
        "footer.email": "support@homefy.pk",
        "footer.phone": "",
        "footer.shopLinks": [
          { label: "Home", href: "/", enabled: true },
          { label: "Kitchen Accessories", href: "/categories/kitchen-accessories", enabled: true },
          { label: "Beauty Bags", href: "/categories/beauty-bags", enabled: true },
          { label: "Ladies Bags", href: "/categories/ladies-bags", enabled: true },
          { label: "New Arrivals", href: "/shop?sort=newest", enabled: true },
          { label: "Sale", href: "/sale", enabled: true },
          { label: "Contact", href: "/contact", enabled: true },
        ],
        "whatsapp.message": "Hi! I have a question about Homefy.pk.",
        "aboutPage.hero.title": "Kitchen, beauty bags and ladies bags for Pakistani homes",
        "aboutPage.hero.subtitle":
          "At Homefy.pk, we bring kitchen accessories, girls' beauty bags and ladies handbags to homes across Pakistan — with Cash on Delivery nationwide.",
        "aboutPage.story.title": "Built for Pakistani Homes",
        "aboutPage.story.paragraph1":
          "Homefy.pk is a home and lifestyle store for kitchen accessories, beauty bags and ladies bags — quality pieces at fair prices.",
        "aboutPage.story.paragraph2":
          "From cookware and storage to makeup pouches, totes and clutches, every product is chosen for everyday use in Pakistani homes.",
      },
    },
    { upsert: true, setDefaultsOnInsert: true }
  );

  const settingsCount = await Settings.countDocuments();
  console.log("\nDocument counts:");
  console.log(`  categories: ${categoryCount}`);
  console.log(`  products:   ${productCount} (upserted this run: ${created})`);
  console.log(`  featured:   ${featuredCount}`);
  console.log(`  settings:   ${settingsCount}`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
