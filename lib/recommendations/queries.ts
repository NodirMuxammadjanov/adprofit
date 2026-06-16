import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { adEntities, recommendations } from "@/lib/db/schema";
import type { EntityLevel } from "@/lib/metrics/types";
import type { RecReason, RecSnapshot, Verdict } from "./types";

export type RecListItem = {
  id: string;
  adEntityId: string;
  adName: string;
  level: EntityLevel;
  verdict: Verdict;
  rank: number | null;
  scoreMetric: string | null;
  reason: RecReason | null;
  snapshot: RecSnapshot | null;
  status: string;
  currency: string;
};

/** adEntityId → verdict (dashboard jadval badge'i uchun). */
export async function getVerdictMap(projectId: string): Promise<Record<string, Verdict>> {
  const rows = await db
    .select({
      adEntityId: recommendations.adEntityId,
      verdict: recommendations.verdict,
    })
    .from(recommendations)
    .where(
      and(eq(recommendations.projectId, projectId), eq(recommendations.isCurrent, true)),
    );
  const map: Record<string, Verdict> = {};
  for (const r of rows) map[r.adEntityId] = r.verdict as Verdict;
  return map;
}

const VERDICT_ORDER: Record<Verdict, number> = { kill: 0, scale: 1, watch: 2 };

/** Joriy (is_current) tavsiyalar — harakatli (🔴/🟢) avval, sarf bo'yicha kamayuvchi. */
export async function getCurrentRecommendations(
  projectId: string,
  currency: string,
): Promise<RecListItem[]> {
  const rows = await db
    .select({
      id: recommendations.id,
      adEntityId: recommendations.adEntityId,
      adName: adEntities.name,
      level: recommendations.level,
      verdict: recommendations.verdict,
      rank: recommendations.rank,
      scoreMetric: recommendations.scoreMetric,
      reason: recommendations.reason,
      snapshot: recommendations.metricsSnapshot,
      status: recommendations.status,
    })
    .from(recommendations)
    .leftJoin(adEntities, eq(recommendations.adEntityId, adEntities.id))
    .where(
      and(eq(recommendations.projectId, projectId), eq(recommendations.isCurrent, true)),
    );

  return rows
    .map((r) => ({
      id: r.id,
      adEntityId: r.adEntityId,
      adName: r.adName ?? "—",
      level: r.level as EntityLevel,
      verdict: r.verdict as Verdict,
      rank: r.rank,
      scoreMetric: r.scoreMetric,
      reason: (r.reason as RecReason | null) ?? null,
      snapshot: (r.snapshot as RecSnapshot | null) ?? null,
      status: r.status,
      currency,
    }))
    .sort(
      (a, b) =>
        VERDICT_ORDER[a.verdict] - VERDICT_ORDER[b.verdict] ||
        (b.snapshot?.spend ?? 0) - (a.snapshot?.spend ?? 0),
    );
}
