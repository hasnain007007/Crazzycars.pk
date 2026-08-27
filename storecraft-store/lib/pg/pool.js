import pg from "pg";
import { isPostgresCatalog } from "./enabled";

let pool;

export function getDatabaseUrl() {
  return (
    String(process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || "").trim() ||
    "postgresql://postgres:postgres@127.0.0.1:55322/postgres"
  );
}

export function getPgPool() {
  if (!isPostgresCatalog()) {
    throw new Error("Postgres catalog is not enabled (set CATALOG_BACKEND=postgres and DATABASE_URL).");
  }
  if (!pool) {
    pool = new pg.Pool({
      connectionString: getDatabaseUrl(),
      max: 10,
      idleTimeoutMillis: 30_000,
    });
  }
  return pool;
}

export async function pgQuery(text, params = []) {
  return getPgPool().query(text, params);
}
