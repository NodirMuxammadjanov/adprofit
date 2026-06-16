import { and, eq, isNotNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { crmConnections, leads, syncRuns } from "@/lib/db/schema";
import {
  getCrmContextForProject,
  getProjectCrmConnection,
} from "@/lib/crm/connection";

/**
 * CRM sync worker job — loyiha lidlarini CRM bitimlari bilan moslashtiradi:
 * har bir lid uchun CRM bitimini olib, qualified/won holatini, sanalarni va
 * daromadni yangilaydi. sync_runs jadvalida ishni kuzatadi (running → success/error).
 */

export async function runCrmSync(
  projectId: string,
): Promise<{ updated: number }> {
  // 1) CRM ulanishini tekshirish
  const conn = await getProjectCrmConnection(projectId);
  if (!conn) {
    throw new Error("CRM ulanmagan");
  }

  // 2) sync_runs (running)
  const [run] = await db
    .insert(syncRuns)
    .values({
      projectId,
      source: "crm",
      status: "running",
      startedAt: new Date(),
    })
    .returning({ id: syncRuns.id });

  const runId = run.id;

  try {
    // 3) CRM kontekst (adapter + ctx)
    const crm = await getCrmContextForProject(projectId);
    if (!crm) {
      throw new Error("CRM ulanmagan");
    }

    // 4) crmEntityId mavjud bo'lgan lidlar
    const projectLeads = await db
      .select()
      .from(leads)
      .where(and(eq(leads.projectId, projectId), isNotNull(leads.crmEntityId)));

    // 5) har bir lidni CRM bitimi bilan moslashtirish
    let updated = 0;
    for (const lead of projectLeads) {
      if (!lead.crmEntityId) continue;

      const deal = await crm.adapter.getDeal(crm.ctx, lead.crmEntityId);
      if (!deal) continue;

      const now = new Date();
      const isWon = deal.stageId === conn.wonStageId;
      const isQualified = isWon || deal.stageId === conn.qualifiedStageId;

      const patch: Partial<typeof leads.$inferInsert> = {
        isQualified,
        isWon,
        lastSyncedAt: now,
      };

      if (isQualified && lead.qualifiedAt == null) {
        patch.qualifiedAt = now;
      }
      if (isWon && lead.wonAt == null) {
        patch.wonAt = now;
      }
      if (isWon && deal.amount != null) {
        patch.revenue = deal.amount.toFixed(2);
        patch.currency = deal.currency ?? lead.currency;
      }
      patch.status = isWon
        ? "won"
        : isQualified
          ? "qualified"
          : (lead.status ?? "new");

      await db.update(leads).set(patch).where(eq(leads.id, lead.id));
      updated += 1;
    }

    // 6) crm_connections.lastSyncedAt + sync_runs success
    const finishedAt = new Date();
    await db
      .update(crmConnections)
      .set({ lastSyncedAt: finishedAt })
      .where(eq(crmConnections.id, conn.id));

    await db
      .update(syncRuns)
      .set({
        status: "success",
        finishedAt,
        stats: { updated },
      })
      .where(eq(syncRuns.id, runId));

    return { updated };
  } catch (err) {
    // 7) xato → sync_runs error, qayta tashlash
    await db
      .update(syncRuns)
      .set({
        status: "error",
        error: String(err),
        finishedAt: new Date(),
      })
      .where(eq(syncRuns.id, runId));
    throw err;
  }
}

type CrmSyncJob = { data: { projectId: string } };

/** pg-boss handler — v10 bitta job yoki job massivini uzatishi mumkin. */
export async function crmSyncHandler(
  job: CrmSyncJob | CrmSyncJob[],
): Promise<void> {
  const data = Array.isArray(job) ? job[0]?.data : job?.data;
  const projectId = data?.projectId;
  if (!projectId) {
    throw new Error("crmSyncHandler: projectId topilmadi (job.data.projectId)");
  }
  await runCrmSync(projectId);
}
