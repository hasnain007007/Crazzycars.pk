/**
 * Apply Homefy commerce schema to local Postgres (vanilla or Supabase).
 *
 *   docker compose -f docker-compose.homefy.yml up -d postgres
 *   cd storecraft-store && npm run db:homefy:schema
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const DATABASE_URL =
  process.env.DATABASE_URL ||
  process.env.SUPABASE_DB_URL ||
  "postgresql://postgres:postgres@127.0.0.1:55322/postgres";

const here = path.dirname(fileURLToPath(import.meta.url));
const sqlPath = path.resolve(here, "../../../supabase/migrations/20260826100000_homefy_commerce.sql");

async function run() {
  const sql = fs.readFileSync(sqlPath, "utf8");
  const client = new pg.Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    const { rows } = await client.query(`select to_regclass('public.products') as t`);
    if (rows[0]?.t) {
      console.log("Homefy Postgres schema already present.");
      return;
    }
    await client.query(sql);
    console.log("Homefy Postgres schema applied.");
  } finally {
    await client.end();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
