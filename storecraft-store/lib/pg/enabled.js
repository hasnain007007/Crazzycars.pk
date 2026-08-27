/** Homefy catalog on Postgres / Supabase. CrazzyCars stays on Mongo unless this is set. */
export function isPostgresCatalog() {
  const backend = String(process.env.CATALOG_BACKEND || "").toLowerCase().trim();
  if (backend === "mongo" || backend === "mongodb") return false;
  if (backend === "postgres" || backend === "postgresql" || backend === "supabase") {
    return true;
  }
  return Boolean(String(process.env.DATABASE_URL || "").trim());
}
