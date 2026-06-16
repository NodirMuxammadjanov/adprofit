import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { projects, recommendations } from "@/lib/db/schema";
import { computeDashboard } from "@/lib/metrics/dashboard";
import { resolveRange } from "@/lib/metrics/range";
import { computeRecommendations } from "./engine";

/**
 * recommendations.compute yadrosi — worker job va API (inline) shu funksiyani chaqiradi.
 * Oxirgi 30 kun oynasi bo'yicha metrikalarni oladi, engine'ni ishlatadi, DB'ga yozadi:
 * eski current'larni arxivlaydi (is_current=false), yangilarini qo'shadi.
 * Foydalanuvchining seen/done holatini (adEntityId+verdict bo'yicha) saqlab qoladi.
 */

export type ComputeSummary = { total: number; scale: number; kill: number; watch: number };

const REC_RANGE = "30d" as const;

export async function runRecommendationsCompute(projectId: string): Promise<ComputeSummary> {
  const [project] = await db
    .select({ currency: projects.currency })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);
  const currency = project?.currency ?? "USD";

  const range = resolveRange(REC_RANGE);
  const data = await computeDashboard(projectId, range, currency);
  const results = computeRecommendations(data);

  await db.transaction(async (tx) => {
    const existing = await tx
      .select({
        adEntityId: recommendations.adEntityId,
        verdict: recommendations.verdict,
        status: recommendations.status,
      })
      .from(recommendations)
      .where(
        and(eq(recommendations.projectId, projectId), eq(recommendations.isCurrent, true)),
      );
    const statusByKey = new Map(
      existing.map((r) => [`${r.adEntityId}:${r.verdict}`, r.status]),
    );

    await tx
      .update(recommendations)
      .set({ isCurrent: false, updatedAt: new Date() })
      .where(
        and(eq(recommendations.projectId, projectId), eq(recommendations.isCurrent, true)),
      );

    if (results.length > 0) {
      await tx.insert(recommendations).values(
        results.map((r) => ({
          projectId,
          adEntityId: r.adEntityId,
          level: r.level,
          verdict: r.verdict,
          rank: r.rank,
          scoreMetric: r.scoreMetric,
          scoreValue: r.scoreValue == null ? null : String(r.scoreValue),
          reason: r.reason,
          metricsSnapshot: r.snapshot,
          windowStart: range.fromDate,
          windowEnd: range.toDate,
          status: statusByKey.get(`${r.adEntityId}:${r.verdict}`) ?? "new",
          isCurrent: true,
        })),
      );
    }
  });

  const summary: ComputeSummary = { total: results.length, scale: 0, kill: 0, watch: 0 };
  for (const r of results) summary[r.verdict] += 1;
  return summary;
}
