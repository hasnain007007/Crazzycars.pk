/**
 * Copy Homefy catalog from local Mongo (homefy_pk) into Supabase Postgres.
 * MOCK / DEMO DATA ONLY when sourced from seedHomefyCatalog.
 * To wipe products (keep categories): npm run clear:homefy:products
 *
 *   supabase start
 *   cd storecraft-store && npm run seed:homefy:postgres
 *
 * Refuses CrazzyCars Atlas URIs.
 */
import mongoose from "mongoose";
import pg from "pg";
import Category from "../../lib/models/Category.model.js";
import Product from "../../lib/models/Product.model.js";
import Settings, { SETTINGS_SINGLETON_KEY } from "../../lib/models/Settings.model.js";
import Page from "../../lib/models/Page.model.js";

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
const DATABASE_URL =
  process.env.DATABASE_URL ||
  process.env.SUPABASE_DB_URL ||
  "postgresql://postgres:postgres@127.0.0.1:55322/postgres";

function assertHomefyMongo(uri) {
  if (!uri) throw new Error("Set MONGODB_URI for the Homefy Mongo copy source.");
  if (/yg8dcwr|sialkot_motorsports|crazzycars/i.test(uri)) {
    throw new Error("Refusing CrazzyCars production Mongo.");
  }
}

function asText(v) {
  return v == null ? "" : String(v);
}

async function run() {
  assertHomefyMongo(MONGO_URI);
  await mongoose.connect(MONGO_URI);
  console.log(`Mongo ${mongoose.connection.host} db=${mongoose.connection.name}`);

  const pool = new pg.Pool({ connectionString: DATABASE_URL });
  const client = await pool.connect();
  console.log("Postgres connected");

  try {
    await client.query("begin");
    await client.query(`
      truncate table
        public.order_items,
        public.orders,
        public.customer_addresses,
        public.customers,
        public.newsletter_subscribers,
        public.product_variants,
        public.product_option_axes,
        public.product_images,
        public.product_categories,
        public.products,
        public.pages,
        public.store_settings,
        public.categories
      cascade
    `);

    const categories = await Category.find({}).lean();
    const byMongoId = new Map();

    const sorted = [...categories].sort((a, b) => (a.level || 0) - (b.level || 0));
    for (const cat of sorted) {
      const parentMongo = cat.parentCategory ? String(cat.parentCategory) : null;
      const parentId = parentMongo ? byMongoId.get(parentMongo) || null : null;
      const { rows } = await client.query(
        `insert into public.categories
          (name, slug, description, image_url, image_alt, homepage_icon, level, sort_order, status, featured, show_in_nav, show_on_homepage, seo)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb)
         returning id`,
        [
          cat.name,
          cat.slug,
          asText(cat.description),
          asText(cat.image?.url),
          asText(cat.image?.altText || cat.name),
          asText(cat.homepageIcon),
          Number(cat.level) || 0,
          Number(cat.sortOrder) || 0,
          cat.status || "active",
          Boolean(cat.featured || cat.isFeatured),
          cat.showInNav !== false,
          Boolean(cat.showOnHomepage),
          JSON.stringify(cat.seo || {}),
        ]
      );
      byMongoId.set(String(cat._id), rows[0].id);
      if (parentId) {
        await client.query(`update public.categories set parent_id = $1 where id = $2`, [
          parentId,
          rows[0].id,
        ]);
      }
    }
    console.log(`categories: ${sorted.length}`);

    const products = await Product.find({}).lean();
    for (const p of products) {
      const { rows } = await client.query(
        `insert into public.products
          (name, slug, article_no, sku, short_description, long_description, regular_price, sale_price,
           quantity, track_inventory, allow_backorder, weight, weight_unit, vendor, product_type,
           collections, tags, features, specifications, status, featured, new_arrival, is_deal, cod_enabled, seo)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19::jsonb,$20,$21,$22,$23,$24,$25::jsonb)
         returning id`,
        [
          p.name,
          p.slug,
          asText(p.articleNo),
          asText(p.inventory?.sku || p.articleNo),
          asText(p.shortDescription),
          asText(p.longDescription),
          Number(p.pricing?.regularPrice) || 0,
          p.pricing?.salePrice ? Number(p.pricing.salePrice) : null,
          Number(p.inventory?.quantity) || 0,
          p.inventory?.trackInventory !== false,
          p.inventory?.allowBackorder === true,
          Number(p.inventory?.weight) || 0,
          p.inventory?.weightUnit || "g",
          asText(p.vendor || "Homefy"),
          asText(p.productType),
          Array.isArray(p.collections) ? p.collections : [],
          Array.isArray(p.tags) ? p.tags : [],
          Array.isArray(p.features) ? p.features : [],
          JSON.stringify(p.specifications || []),
          p.status || "active",
          Boolean(p.featured || p.isFeatured),
          Boolean(p.newArrival),
          Boolean(p.isDeal),
          p.codEnabled !== false,
          JSON.stringify(p.seo || {}),
        ]
      );
      const productId = rows[0].id;

      const catIds = (p.categories || [])
        .map((c) => byMongoId.get(String(c._id || c)))
        .filter(Boolean);
      for (const categoryId of [...new Set(catIds)]) {
        await client.query(
          `insert into public.product_categories (product_id, category_id) values ($1,$2) on conflict do nothing`,
          [productId, categoryId]
        );
      }

      const images = p.media?.images || [];
      for (let i = 0; i < images.length; i += 1) {
        const img = images[i];
        if (!img?.url) continue;
        await client.query(
          `insert into public.product_images (product_id, url, alt_text, is_main, sort_order)
           values ($1,$2,$3,$4,$5)`,
          [productId, img.url, asText(img.altText || p.name), Boolean(img.isMain) || i === 0, i]
        );
      }

      for (const axis of p.simpleVariations || []) {
        if (!axis?.name) continue;
        await client.query(
          `insert into public.product_option_axes (product_id, name, enabled, values)
           values ($1,$2,$3,$4)`,
          [productId, axis.name, axis.enabled !== false, axis.tags || []]
        );
      }

      for (const combo of p.variationCombinations || []) {
        await client.query(
          `insert into public.product_variants (product_id, sku, options, price, stock, image_url)
           values ($1,$2,$3::jsonb,$4,$5,$6)`,
          [
            productId,
            asText(combo.sku),
            JSON.stringify(combo.options || []),
            Number(combo.price) || 0,
            Number(combo.stock) || 0,
            asText(typeof combo.image === "string" ? combo.image : combo.image?.url),
          ]
        );
      }
    }
    console.log(`products: ${products.length}`);

    const pages = await Page.find({}).lean();
    for (const page of pages) {
      await client.query(
        `insert into public.pages (title, slug, content, template, status, show_in_footer, seo, sort_order)
         values ($1,$2,$3,$4,$5,$6,$7::jsonb,$8)`,
        [
          page.title,
          page.slug,
          asText(page.content),
          page.template || "custom",
          page.status || "draft",
          Boolean(page.showInFooter),
          JSON.stringify(page.seo || {}),
          Number(page.sortOrder) || 0,
        ]
      );
    }
    console.log(`pages: ${pages.length}`);

    const settings = await Settings.findOne({ singletonKey: SETTINGS_SINGLETON_KEY }).lean();
    if (settings) {
      const { _id, __v, ...data } = settings;
      await client.query(
        `insert into public.store_settings (singleton_key, data) values ($1,$2::jsonb)`,
        [SETTINGS_SINGLETON_KEY, JSON.stringify(data)]
      );
      console.log("settings: 1");
    }

    await client.query("commit");
    console.log("Homefy Postgres catalog ready.");
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
    await pool.end();
    await mongoose.disconnect();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
