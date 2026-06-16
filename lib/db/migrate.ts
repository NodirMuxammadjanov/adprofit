import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

/** Migratsiyalarni qo'llash: `pnpm db:migrate`. */
async function main() {
  const connectionString =
    process.env.DATABASE_URL ?? "postgres://adprofit:adprofit@localhost:5432/adprofit";
  const pool = new Pool({ connectionString, max: 1 });
  const db = drizzle(pool);
  console.log("[migrate] Migratsiyalar qo'llanmoqda...");
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("[migrate] Tugadi.");
  await pool.end();
}

main().catch((err) => {
  console.error("[migrate] Xato:", err);
  process.exit(1);
});
