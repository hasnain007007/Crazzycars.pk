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
import Page from "../../lib/models/Page.model.js";

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

const TREE = [
  {
    name: "Kitchen Accessories",
    slug: "kitchen-accessories",
    description: "Cookware, storage, cutlery and dining pieces for Pakistani kitchens.",
    icon: "🍳",
    children: [
      { name: "Cookware", slug: "cookware", description: "Pans, pots, tawa and mixing bowls for everyday Pakistani cooking." },
      { name: "Storage & Containers", slug: "storage-containers", description: "Airtight jars, lunch boxes and pantry organisers." },
      { name: "Cutlery & Gadgets", slug: "cutlery-gadgets", description: "Knives, choppers, scissors and prep tools." },
      { name: "Dining & Serveware", slug: "dining-serveware", description: "Plates, tea sets, trays and table pieces for guests." },
    ],
  },
  {
    name: "Beauty Bags",
    slug: "beauty-bags",
    description: "Makeup pouches, travel toiletry bags and vanity organizers.",
    icon: "💄",
    children: [
      { name: "Makeup Pouches", slug: "makeup-pouches", description: "Everyday cosmetics bags in quilted, velvet and clear styles." },
      { name: "Travel Toiletry Bags", slug: "travel-toiletry-bags", description: "Hanging kits and waterproof wash bags for travel." },
      { name: "Vanity & Organizer Bags", slug: "vanity-organizer-bags", description: "Jewellery rolls, brush holders and drawer organisers." },
    ],
  },
  {
    name: "Ladies Bags",
    slug: "ladies-bags",
    description: "Handbags, totes, crossbody bags and clutches for everyday wear.",
    icon: "👜",
    children: [
      { name: "Mini Handbags", slug: "mini-handbags", description: "Compact handbags for evenings and daily errands." },
      { name: "Tote Bags", slug: "tote-bags", description: "Shopper and work totes with enough room for a day out." },
      { name: "Crossbody Bags", slug: "crossbody-bags", description: "Hands-free bags with adjustable straps." },
      { name: "Clutches", slug: "clutches", description: "Evening clutches and wristlets for events." },
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

const SUB_META = {
  cookware: {
    productType: "Cookware",
    collection: "Kitchen Accessories",
    material: "Aluminium / stainless steel / cast iron (see title)",
    dimensions: "See product title for size",
    care: "Hand wash recommended. Avoid metal utensils on non-stick coatings. Dry fully before storing.",
    weight: 900,
    blurb: "Built for daily Pakistani cooking on gas stoves — from tadka to roti.",
    features: [
      "Everyday kitchen use on gas stoves",
      "Homefy quality check before dispatch",
      "Nationwide Cash on Delivery",
    ],
  },
  "storage-containers": {
    productType: "Kitchen Storage",
    collection: "Kitchen Accessories",
    material: "Food-grade glass or BPA-conscious plastic (see title)",
    dimensions: "Stackable — see set contents in the title",
    care: "Wash before first use. Glass jars are dishwasher-safe; lids may be hand-wash only.",
    weight: 700,
    blurb: "Keep masala, daal and leftovers fresh with airtight pantry storage.",
    features: [
      "Airtight seals for masala and leftovers",
      "Stackable for small Pakistani kitchens",
      "Homefy quality check before dispatch",
    ],
  },
  "cutlery-gadgets": {
    productType: "Kitchen Tools",
    collection: "Kitchen Accessories",
    material: "Stainless steel and food-safe plastics",
    dimensions: "See product title",
    care: "Hand wash blades. Dry immediately to prevent spotting.",
    weight: 450,
    blurb: "Prep tools that speed up chopping, measuring and serving.",
    features: [
      "Sharp, practical tools for daily prep",
      "Comfortable grip for home cooks",
      "Homefy quality check before dispatch",
    ],
  },
  "dining-serveware": {
    productType: "Dining & Serveware",
    collection: "Kitchen Accessories",
    material: "Ceramic, glass or wood (see title)",
    dimensions: "Set contents listed in the product title",
    care: "Ceramic and glass: dishwasher-safe unless noted. Wooden trays: wipe clean, do not soak.",
    weight: 1800,
    blurb: "Table pieces for guests, chai and family dinners.",
    features: [
      "Ready for hosting and everyday meals",
      "Finish chosen for Pakistani dining tables",
      "Homefy quality check before dispatch",
    ],
  },
  "makeup-pouches": {
    productType: "Makeup Pouch",
    collection: "Beauty Bags",
    material: "PU leather, velvet or quilted fabric (see title)",
    dimensions: "Compact — fits in a handbag",
    care: "Wipe with a damp cloth. Do not machine wash. Keep away from sharp objects.",
    weight: 180,
    blurb: "Keep lipstick, compact and brushes together without bulk.",
    features: [
      "Fits everyday makeup without bulk",
      "Available in Black, Beige, Blush Pink and Brown",
      "Smooth zip and wipe-clean lining",
    ],
  },
  "travel-toiletry-bags": {
    productType: "Toiletry Bag",
    collection: "Beauty Bags",
    material: "Water-resistant fabric with wipe-clean lining",
    dimensions: "Travel size — hang or fold flat (see title)",
    care: "Wipe lining after wet items. Air dry open. Do not machine wash.",
    weight: 280,
    blurb: "Separate wet and dry toiletries for weekends and flights.",
    features: [
      "Water-resistant lining for bottles",
      "Available in Black, Beige, Blush Pink and Brown",
      "Hangs or packs flat for travel",
    ],
  },
  "vanity-organizer-bags": {
    productType: "Vanity Organizer",
    collection: "Beauty Bags",
    material: "Acrylic, fabric or PU (see title)",
    dimensions: "Desktop / drawer size — see title",
    care: "Wipe clean. Keep jewellery trays dry. Do not overload hanging rolls.",
    weight: 400,
    blurb: "Organise brushes, jewellery and cosmetics on the dressing table.",
    features: [
      "Keeps brushes and jewellery sorted",
      "Desktop or drawer-friendly footprint",
      "Homefy quality check before dispatch",
    ],
  },
  "mini-handbags": {
    productType: "Mini Handbag",
    collection: "Ladies Bags",
    material: "PU leather with fabric lining",
    dimensions: "Mini — phone, wallet and keys",
    care: "Wipe with a soft cloth. Stuff with tissue when storing to keep shape.",
    weight: 350,
    blurb: "A structured mini for evenings and errands — phone, wallet, keys.",
    features: [
      "Holds phone, wallet and keys",
      "Available in Black, Beige, Blush Pink and Brown",
      "Detachable or short handle (see title)",
    ],
  },
  "tote-bags": {
    productType: "Tote Bag",
    collection: "Ladies Bags",
    material: "Canvas or PU leather (see title)",
    dimensions: "Day tote — laptop sizes listed in title where relevant",
    care: "Spot clean canvas. Wipe PU leather. Do not machine wash structured totes.",
    weight: 550,
    blurb: "Room for a day out — market, office or weekend.",
    features: [
      "Open top or zip (see title) with inner pocket",
      "Available in Black, Beige, Blush Pink and Brown",
      "Comfortable shoulder straps",
    ],
  },
  "crossbody-bags": {
    productType: "Crossbody Bag",
    collection: "Ladies Bags",
    material: "PU leather with adjustable strap",
    dimensions: "Hands-free — phone and essentials",
    care: "Wipe clean. Adjust strap hardware gently. Store stuffed to keep shape.",
    weight: 320,
    blurb: "Hands-free everyday bag with an adjustable strap.",
    features: [
      "Adjustable strap for crossbody wear",
      "Available in Black, Beige, Blush Pink and Brown",
      "Secure zip or flap closure",
    ],
  },
  clutches: {
    productType: "Clutch",
    collection: "Ladies Bags",
    material: "Satin, PU or beaded overlay (see title)",
    dimensions: "Evening size — phone and compact",
    care: "Keep beading dry. Wipe satin gently. Store in a dust bag or pouch.",
    weight: 220,
    blurb: "Evening clutches and wristlets for events and dinners.",
    features: [
      "Fits phone and a compact",
      "Available in Black, Beige, Blush Pink and Brown",
      "Optional chain or wristlet (see title)",
    ],
  },
};

const CMS_PAGES = [
  {
    title: "Bag Size Guide",
    slug: "size-guide",
    template: "custom",
    showInFooter: true,
    seo: {
      metaTitle: "Bag Size Guide | Homefy.pk",
      metaDescription: "How Homefy.pk mini handbags, totes, crossbody bags and clutches typically fit everyday essentials.",
    },
    content: `
<h2>Bag size guide</h2>
<p>Use this as a starting point. Exact measurements are listed on each product page.</p>
<h3>Mini handbags</h3>
<p>Phone, compact wallet and keys. Best for evenings and short outings.</p>
<h3>Crossbody bags</h3>
<p>Hands-free everyday carry — phone, small wallet, lipstick, cards.</p>
<h3>Tote bags</h3>
<p>Day bags with room for a water bottle, dupatta or a 13–15 inch laptop where the title says so.</p>
<h3>Clutches</h3>
<p>Phone and a compact. Add a chain or wristlet when the style includes one.</p>
<h3>Beauty bags</h3>
<p>Makeup pouches sit inside a handbag. Travel toiletry bags are sized for weekend bottles; hang or fold as described on the product.</p>
`.trim(),
  },
  {
    title: "Care Guide",
    slug: "care-guide",
    template: "custom",
    showInFooter: true,
    seo: {
      metaTitle: "Care Guide | Homefy.pk",
      metaDescription: "How to care for Homefy.pk cookware, storage, beauty bags and ladies bags.",
    },
    content: `
<h2>Care guide</h2>
<p>A little care keeps Homefy pieces looking new. Always follow the notes on the product page if they differ.</p>
<h3>Cookware</h3>
<p>Hand wash non-stick pans. Avoid metal spatulas on coated surfaces. Dry fully before stacking.</p>
<h3>Storage &amp; dining</h3>
<p>Wash before first use. Glass and ceramic are usually dishwasher-safe; wooden trays should be wiped, not soaked.</p>
<h3>Beauty bags &amp; ladies bags</h3>
<p>Wipe PU leather and linings with a damp cloth. Do not machine wash structured bags. Stuff handbags with tissue when storing so they keep their shape.</p>
`.trim(),
  },
];

function catalogImg(slug) {
  return `/images/catalog/${slug}.svg`;
}

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

function productCopy(name, parentName, meta) {
  const short = `${name} from Homefy.pk — ${meta.blurb}`;
  const long = [
    `<p>${name} is part of our ${parentName} collection at Homefy.pk. ${meta.blurb}</p>`,
    `<p>Materials, care and typical size are listed in the specifications below. Every piece is checked before dispatch.</p>`,
    `<ul>${meta.features.map((f) => `<li>${f}</li>`).join("")}</ul>`,
    `<p>Cash on Delivery nationwide. Easy returns on eligible unused items.</p>`,
  ].join("");
  return { short, long };
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
      image: {
        url: catalogImg(parent.slug),
        publicId: "",
        altText: parent.name,
        title: parent.name,
      },
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
        description: child.description || `${child.name} at Homefy.pk`,
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
        image: {
          url: catalogImg(child.slug),
          publicId: "",
          altText: child.name,
          title: child.name,
        },
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
      const meta = SUB_META[subSlug];
      if (!meta) throw new Error(`Missing SUB_META for ${subSlug}`);
      const variants = withColors ? bagVariants() : { simpleVariations: [], variationCombinations: [] };
      const sku = `HF-${subSlug.slice(0, 3).toUpperCase()}-${slug.slice(0, 8).toUpperCase()}`;
      const copy = productCopy(name, cat.parentName, meta);
      const tags = [
        "Homefy",
        meta.collection,
        meta.productType,
        cat.parentName,
        ...(withColors ? BAG_COLORS : []),
      ];
      await Product.findOneAndUpdate(
        { slug },
        {
          $set: {
            name,
            slug,
            articleNo: sku,
            shortDescription: copy.short,
            longDescription: copy.long,
            categories: [cat.id, cat.parentId],
            pricing: { regularPrice: price, salePrice: featured ? Math.round(price * 0.9) : null },
            inventory: {
              quantity: 40,
              sku,
              trackInventory: true,
              allowBackorder: false,
              weight: meta.weight,
              weightUnit: "g",
            },
            media: {
              images: [
                { url: catalogImg(subSlug), altText: name, isMain: true, publicId: "" },
                { url: catalogImg(subSlug), altText: `${name} detail`, isMain: false, publicId: "" },
              ],
            },
            simpleVariations: variants.simpleVariations,
            variationCombinations: variants.variationCombinations,
            features: meta.features,
            specifications: [
              { label: "Brand", value: "Homefy" },
              { label: "Collection", value: meta.collection },
              { label: "Material", value: meta.material },
              { label: "Dimensions", value: meta.dimensions },
              { label: "Care", value: meta.care },
              { label: "Cash on Delivery", value: "Available nationwide" },
            ],
            vendor: "Homefy",
            productType: meta.productType,
            collections: [meta.collection],
            tags,
            isUniversal: false,
            compatibleVehicles: [],
            compatibleCars: [],
            vehicleCompatibility: {
              fitmentType: "universal",
              universalNote: "Not a vehicle part.",
              vehicles: [],
              categories: [],
            },
            status: "active",
            featured: Boolean(featured),
            isFeatured: Boolean(featured),
            newArrival: Boolean(featured),
            isDeal: Boolean(featured),
            codEnabled: true,
            seo: {
              metaTitle: `${name} | Homefy.pk`,
              metaDescription: `Buy ${name} online in Pakistan at Homefy.pk. ${meta.blurb} Cash on Delivery nationwide.`,
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

  for (const page of CMS_PAGES) {
    await Page.findOneAndUpdate(
      { slug: page.slug },
      {
        $set: {
          ...page,
          status: "published",
          showInNav: false,
          showInInfoBar: false,
          sortOrder: 50,
        },
      },
      { upsert: true, setDefaultsOnInsert: true }
    );
    console.log(`Page: ${page.slug}`);
  }

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
        "homepageSettings.flashSaleEnabled": false,
        "homepageSettings.sections.showShopByCar": false,
        "homepageSettings.sections.showFlashSale": false,
        "homepageSettings.sections.showBrands": false,
        "homepageSettings.brands": [],
        "homepageSettings.bestSellers.title": "Best Sellers",
        "homepageSettings.bestSellers.enabled": true,
        "homepageSettings.bestSellers.tabs": [
          { label: "All", categorySlug: "all", enabled: true, order: 1 },
          { label: "Kitchen", categorySlug: "kitchen-accessories", enabled: true, order: 2 },
          { label: "Beauty", categorySlug: "beauty-bags", enabled: true, order: 3 },
          { label: "Ladies", categorySlug: "ladies-bags", enabled: true, order: 4 },
        ],
        "homepageSettings.hotDeals.enabled": true,
        "homepageSettings.hotDeals.title": "On Sale",
        "homepageSettings.hotDeals.subtitle": "Seasonal prices on kitchen, beauty bags and ladies bags",
        "brandStory.heading": "Built for Pakistani Homes",
        "brandStory.subheading": "Kitchen, beauty bags and ladies bags",
        "brandStory.description":
          "Homefy.pk brings cookware, makeup pouches and ladies handbags to homes across Pakistan — with COD nationwide.",
        "brandStory.buttonText": "Shop Homefy",
        "footer.tagline": "Kitchen, beauty bags and ladies bags for Pakistani homes",
        "footer.contactEmail": "support@homefy.pk",
        "footer.email": "support@homefy.pk",
        "footer.phone": "",
        "footer.registeredAddress": "",
        "footer.shopLinks": [
          { label: "Home", href: "/", enabled: true },
          { label: "Kitchen Accessories", href: "/categories/kitchen-accessories", enabled: true },
          { label: "Beauty Bags", href: "/categories/beauty-bags", enabled: true },
          { label: "Ladies Bags", href: "/categories/ladies-bags", enabled: true },
          { label: "New Arrivals", href: "/shop?sort=newest", enabled: true },
          { label: "Sale", href: "/sale", enabled: true },
          { label: "Size Guide", href: "/size-guide", enabled: true },
          { label: "Care Guide", href: "/care-guide", enabled: true },
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
