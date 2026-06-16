import PgBoss from "pg-boss";

/**
 * pg-boss navbat — Postgres'ga asoslangan (Redis kerak emas).
 * O'z jadvallarini alohida `pgboss` sxemasida yaratadi (domen jadvallaridan ajratilgan).
 */

export const JOB = {
  metaSync: "meta.sync",
  crmSync: "crm.sync",
  leadTransfer: "lead.transfer",
  recommendationsCompute: "recommendations.compute",
} as const;

export type JobName = (typeof JOB)[keyof typeof JOB];

const connectionString =
  process.env.DATABASE_URL ?? "postgres://adprofit:adprofit@localhost:5432/adprofit";

let bossSingleton: PgBoss | null = null;

/** API tomonidan ish navbatga qo'yish uchun ulangan (yengil) boss instance. */
export async function getBoss(): Promise<PgBoss> {
  if (bossSingleton) return bossSingleton;
  const boss = new PgBoss({ connectionString, schema: "pgboss" });
  boss.on("error", (err) => console.error("[pg-boss]", err));
  await boss.start();
  bossSingleton = boss;
  return boss;
}

/** Ishni navbatga qo'yish (API yoki webhook'dan). */
export async function enqueue<T extends object>(
  name: JobName,
  data: T,
  options?: PgBoss.SendOptions,
): Promise<string | null> {
  const boss = await getBoss();
  return boss.send(name, data, options ?? {});
}
