import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  adEntities,
  adMetricsDaily,
  metaConnections,
  projectMeta,
  syncRuns,
} from "@/lib/db/schema";
import { decrypt } from "@/lib/crypto";
import { getInsights, listAdEntities } from "@/lib/meta/client";
import type { MetaLevel } from "@/lib/meta/types";

/**
 * Meta sync worker job — loyiha uchun ad entity'lar (campaign/adset/ad) va
 * oxirgi 14 kunlik kunlik metrikalarni Meta'dan tortib DB'ga yozadi.
 * sync_runs jadvalida ishni kuzatadi (running → success/error).
 */

/** N kun oldingi sanani UTC YYYY-MM-DD formatida qaytaradi (runtime, `new Date()` ruxsat). */
function daysAgoUTC(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

// Upsert tartibi: avval ota, keyin bola — parentId hal qilinishi uchun.
const LEVEL_ORDER: MetaLevel[] = ["campaign", "adset", "ad"];

export async function runMetaSync(
  projectId: string,
): Promise<{ entities: number; metrics: number }> {
  // 1) project_meta yuklash
  const [pm] = await db
    .select()
    .from(projectMeta)
    .where(eq(projectMeta.projectId, projectId))
    .limit(1);

  if (!pm) {
    throw new Error("Meta ulanmagan");
  }

  // 2) sync_runs (running)
  const [run] = await db
    .insert(syncRuns)
    .values({
      projectId,
      source: "meta",
      status: "running",
      startedAt: new Date(),
    })
    .returning({ id: syncRuns.id });

  const runId = run.id;

  try {
    // 3) meta_connection → token decrypt
    const [conn] = await db
      .select()
      .from(metaConnections)
      .where(eq(metaConnections.id, pm.metaConnectionId))
      .limit(1);

    if (!conn) {
      throw new Error("Meta ulanmagan");
    }

    const token = decrypt(conn.accessToken);

    // 4) entity'lar
    const nodes = await listAdEntities(token, pm.adAccountId);

    // 5) upsert ad_entities — level bo'yicha tartib bilan, parentId hal qilib.
    const now = new Date();
    const metaIdToRowId = new Map<string, string>();
    let entityCount = 0;

    for (const level of LEVEL_ORDER) {
      for (const node of nodes) {
        if (node.level !== level) continue;

        const parentId =
          node.parentMetaId != null
            ? (metaIdToRowId.get(node.parentMetaId) ?? null)
            : null;

        const [row] = await db
          .insert(adEntities)
          .values({
            projectId,
            level: node.level,
            metaId: node.metaId,
            parentId,
            name: node.name,
            status: node.status,
            effectiveStatus: node.effectiveStatus,
            lastSyncedAt: now,
          })
          .onConflictDoUpdate({
            target: [adEntities.projectId, adEntities.metaId],
            set: {
              level: node.level,
              parentId,
              name: node.name,
              status: node.status,
              effectiveStatus: node.effectiveStatus,
              lastSyncedAt: now,
            },
          })
          .returning({ id: adEntities.id });

        metaIdToRowId.set(node.metaId, row.id);
        entityCount += 1;
      }
    }

    // 6) Insights oynasi: oxirgi 14 kun.
    const since = daysAgoUTC(13);
    const until = daysAgoUTC(0);
    const rows = await getInsights(token, pm.adAccountId, since, until);

    const currency = pm.adAccountCurrency ?? "USD";

    // 7) upsert ad_metrics_daily — faqat 'ad' darajadagi entity uchun.
    let metricCount = 0;
    for (const r of rows) {
      const adEntityId = metaIdToRowId.get(r.adMetaId);
      if (!adEntityId) continue; // mos ad topilmasa o'tkazib yuboramiz

      await db
        .insert(adMetricsDaily)
        .values({
          adEntityId,
          projectId,
          date: r.date,
          spend: r.spend.toFixed(2),
          impressions: r.impressions,
          clicks: r.clicks,
          reach: r.reach,
          frequency: r.frequency.toFixed(2),
          metaLeads: r.leads,
          currency,
        })
        .onConflictDoUpdate({
          target: [adMetricsDaily.adEntityId, adMetricsDaily.date],
          set: {
            spend: r.spend.toFixed(2),
            impressions: r.impressions,
            clicks: r.clicks,
            reach: r.reach,
            frequency: r.frequency.toFixed(2),
            metaLeads: r.leads,
            currency,
          },
        });

      metricCount += 1;
    }

    // 8) project_meta.lastSyncedAt + sync_runs success
    const finishedAt = new Date();
    await db
      .update(projectMeta)
      .set({ lastSyncedAt: finishedAt })
      .where(eq(projectMeta.id, pm.id));

    await db
      .update(syncRuns)
      .set({
        status: "success",
        finishedAt,
        stats: { entities: entityCount, metrics: metricCount },
      })
      .where(eq(syncRuns.id, runId));

    return { entities: entityCount, metrics: metricCount };
  } catch (err) {
    // 9) xato → sync_runs error, qayta tashlash
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

type MetaSyncJob = { data: { projectId: string } };

/** pg-boss handler — v10 bitta job yoki job massivini uzatishi mumkin. */
export async function metaSyncHandler(
  job: MetaSyncJob | MetaSyncJob[],
): Promise<void> {
  const data = Array.isArray(job) ? job[0]?.data : job?.data;
  const projectId = data?.projectId;
  if (!projectId) {
    throw new Error("metaSyncHandler: projectId topilmadi (job.data.projectId)");
  }
  await runMetaSync(projectId);
}
