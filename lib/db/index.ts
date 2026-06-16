import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const connectionString =
  process.env.DATABASE_URL ?? "postgres://adprofit:adprofit@localhost:5432/adprofit";

// Bir process'da yagona pool (Next.js hot-reload uchun global keshlanadi).
const globalForDb = globalThis as unknown as { __adprofitPool?: Pool };

export const pool =
  globalForDb.__adprofitPool ?? new Pool({ connectionString, max: 10 });

if (process.env.NODE_ENV !== "production") globalForDb.__adprofitPool = pool;

export const db = drizzle(pool, { schema });

export type Database = typeof db;
export { schema };
