import type { EntityLevel } from "@/lib/metrics/types";

/** Svetofor xulosasi. */
export type Verdict = "scale" | "kill" | "watch";
export type ScoreMetric = "roas" | "cpql";

/** Qaysi qoida ishladi + odam o'qiy oladigan sabab. */
export type RecReason = { code: string; text: string };

/** Tavsiya ostidagi raqamlar (05-backend-schema: metrics_snapshot). */
export type RecSnapshot = {
  spend: number;
  leads: number;
  qualified: number;
  won: number;
  revenue: number;
  roas: number | null;
  cpql: number | null;
  cac: number | null;
};

/** Engine natijasi (DB'ga yozishdan oldin). */
export type RecResult = {
  adEntityId: string;
  level: EntityLevel;
  verdict: Verdict;
  rank: number;
  scoreMetric: ScoreMetric;
  scoreValue: number | null;
  reason: RecReason;
  snapshot: RecSnapshot;
};
