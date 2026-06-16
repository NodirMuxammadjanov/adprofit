import "dotenv/config";
import PgBoss from "pg-boss";
import { JOB } from "../lib/jobs/queue";
import { metaSyncHandler } from "./jobs/meta-sync";
import { crmSyncHandler } from "./jobs/crm-sync";
import { leadTransferHandler } from "./jobs/lead-transfer";
import { recommendationsComputeHandler } from "./jobs/recommendations-compute";

/**
 * Alohida worker jarayoni (Docker'da `worker` servisi).
 * pg-boss orqali fon ishlarini eshitadi: meta.sync, crm.sync, lead.transfer,
 * recommendations.compute. Phase 5+ da har bir job handler ulanadi.
 */

const connectionString =
  process.env.DATABASE_URL ?? "postgres://adprofit:adprofit@localhost:5432/adprofit";

async function main() {
  const boss = new PgBoss({ connectionString, schema: "pgboss" });
  boss.on("error", (err) => console.error("[worker:pg-boss]", err));

  await boss.start();
  console.log("[worker] pg-boss ishga tushdi, Postgres'ga ulandi.");

  // Navbatlarni e'lon qilamiz (mavjud bo'lmasa yaratiladi).
  for (const name of Object.values(JOB)) {
    await boss.createQueue(name);
  }

  // Phase 5+ : haqiqiy handler'lar shu yerga ulanadi.
  await boss.work(JOB.metaSync, metaSyncHandler);
  await boss.work(JOB.crmSync, crmSyncHandler);
  await boss.work(JOB.leadTransfer, leadTransferHandler);
  await boss.work(JOB.recommendationsCompute, recommendationsComputeHandler);

  console.log("[worker] Navbatlar tayyor:", Object.values(JOB).join(", "));

  const shutdown = async () => {
    console.log("[worker] To'xtatilmoqda...");
    await boss.stop({ graceful: true });
    process.exit(0);
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

main().catch((err) => {
  console.error("[worker] Ishga tushirishda xato:", err);
  process.exit(1);
});
