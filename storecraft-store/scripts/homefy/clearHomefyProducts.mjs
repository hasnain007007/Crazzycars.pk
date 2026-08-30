/**
 * Delete Homefy mock / seed catalog products.
 * Keeps categories, pages, and store settings.
 *
 *   cd storecraft-store && npm run clear:homefy:products
 *
 * Refuses CrazzyCars production Mongo.
 */
import mongoose from "mongoose";
import pg from "pg";

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
const DATABASE_URL =
  process.env.DATABASE_URL ||
  process.env.SUPABASE_DB_URL ||
  "postgresql://postgres:postgres@127.0.0.1:55322/postgres";

function assertHomefyMongo(uri) {
  if (!uri) return;
  if (/yg8dcwr|sialkot_motorsports|crazzycars/i.test(uri)) {
    throw new Error("Refusing CrazzyCars production Mongo.");
  }
}

async function clearPostgres() {
  const pool = new pg.Pool({ connectionString: DATABASE_URL });
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query(`
      truncate table
        public.product_variants,
        public.product_option_axes,
        public.product_images,
        public.product_categories,
        public.products
      restart identity cascade
    `);
    await client.query("commit");
    const { rows } = await client.query(`
      select
        (select count(*)::int from public.products) as products,
        (select count(*)::int from public.categories) as categories
    `);
    console.log(`Postgres: products=${rows[0].products} (categories kept=${rows[0].categories})`);
  } catch (e) {
    await client.query("rollback").catch(() => {});
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

async function clearMongo() {
  if (!MONGO_URI) {
    console.log("Mongo: skipped (no MONGODB_URI)");
    return;
  }
  assertHomefyMongo(MONGO_URI);
  await mongoose.connect(MONGO_URI);
  const col = mongoose.connection.db.collection("products");
  const before = await col.countDocuments();
  const result = await col.deleteMany({});
  console.log(`Mongo db=${mongoose.connection.name}: deleted ${result.deletedCount} (was ${before})`);
  await mongoose.disconnect();
}

async function run() {
  console.log("Clearing Homefy mock products (categories kept)…");
  await clearPostgres();
  await clearMongo();
  console.log("Done. Add real products in Admin → Products.");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
