import { makeFormatters } from "@/lib/metrics/format";
import type { DashboardData, EntityRow } from "@/lib/metrics/types";
import type { RecReason, RecResult, RecSnapshot, ScoreMetric, Verdict } from "./types";

/**
 * Svetofor tavsiya engine (qoidaga asoslangan — 17-savol mantiqi).
 * Har daraja (campaign/adset/ad) ichida MUSTAQIL:
 *  - Data darvozasi: sarf < MIN_SPEND bo'lsa "data kam" → 🟡.
 *  - Konversiya signali yo'q (0 sifatli lid, 0 daromad) → 🟡 (CRM/data kerak).
 *  - ROAS-birinchi (daromad bo'lsa) / CPQL-fallback bo'yicha saralash.
 *  - Top ~3 (haqiqatan foydali bo'lsa) → 🟢; Bottom ~3 (ROAS<1 yoki 0 sifatli lid) → 🔴; qolgani 🟡.
 * Nisbiy reyting (top/bottom) absolyut darvoza (isGood/isKillable) bilan birga ishlaydi —
 * shu sabab "eng yaxshi"si ham zarar bo'lsa 🟢 bo'lmaydi.
 */

const MIN_SPEND = 20; // data darvozasi (USD ekvivalenti)
const TOP_N = 3;
const BOTTOM_N = 3;
const SCALE_ROAS = 1; // ROAS shu chegaradan baland → foydali

function snapshotOf(r: EntityRow): RecSnapshot {
  return {
    spend: r.spend,
    leads: r.leads,
    qualified: r.qualified,
    won: r.won,
    revenue: r.revenue,
    roas: r.roas,
    cpql: r.cpql,
    cac: r.cac,
  };
}

function mk(
  r: EntityRow,
  verdict: Verdict,
  rank: number,
  scoreMetric: ScoreMetric,
  scoreValue: number | null,
  reason: RecReason,
): RecResult {
  return {
    adEntityId: r.id,
    level: r.level,
    verdict,
    rank,
    scoreMetric,
    scoreValue,
    reason,
    snapshot: snapshotOf(r),
  };
}

/** CPQL reyting kaliti: past CPQL — yaxshi; sifatli lid yo'q — eng oxirida. */
function cpqlScore(r: EntityRow): number {
  return r.qualified > 0 && r.cpql != null ? r.cpql : Number.POSITIVE_INFINITY;
}

function computeLevel(rows: EntityRow[]): RecResult[] {
  if (rows.length === 0) return [];
  const f = makeFormatters(rows[0].currency);
  const out: RecResult[] = [];

  const gated = rows.filter((r) => r.spend >= MIN_SPEND);
  const ungated = rows.filter((r) => r.spend < MIN_SPEND);

  const levelRevenue = gated.reduce((s, r) => s + r.revenue, 0);
  const levelQualified = gated.reduce((s, r) => s + r.qualified, 0);

  if (gated.length > 0 && levelRevenue <= 0 && levelQualified <= 0) {
    // Hech qaysi reklama uchun konversiya signali yo'q — baholay olmaymiz.
    gated.forEach((r, i) =>
      out.push(
        mk(r, "watch", i + 1, "cpql", null, {
          code: "no_signal",
          text: "Sifatli lid yoki daromad yo'q — CRM'ni ulang yoki ko'proq data kuting.",
        }),
      ),
    );
  } else if (gated.length > 0) {
    const mode: ScoreMetric = levelRevenue > 0 ? "roas" : "cpql";
    const sorted = [...gated].sort((a, b) =>
      mode === "roas" ? (b.roas ?? 0) - (a.roas ?? 0) : cpqlScore(a) - cpqlScore(b),
    );

    const n = sorted.length;
    const topCount = Math.min(TOP_N, n);
    const bottomCount = Math.min(BOTTOM_N, n);

    sorted.forEach((r, i) => {
      const inTop = i < topCount;
      const inBottom = i >= n - bottomCount;
      const isGood = mode === "roas" ? (r.roas ?? 0) >= SCALE_ROAS : r.qualified > 0;
      const isKillable =
        mode === "roas" ? (r.roas ?? 0) < 1 || r.qualified === 0 : r.qualified === 0;

      let verdict: Verdict;
      let reason: RecReason;
      if (inTop && isGood) {
        verdict = "scale";
        reason =
          mode === "roas"
            ? {
                code: "top_roas",
                text: `ROAS ${f.ratio(r.roas)} — foydali. Byudjetni oshiring.`,
              }
            : {
                code: "low_cpql",
                text: `${f.moneyPrecise(r.cpql)} CPQL — eng samarali. Ko'paytiring.`,
              };
      } else if (inBottom && isKillable) {
        verdict = "kill";
        reason =
          r.revenue <= 0
            ? {
                code: "no_sales",
                text: `${f.money(r.spend)} sarf, 0 sotuv — zarar. O'chiring.`,
              }
            : {
                code: "low_roas",
                text: `ROAS ${f.ratio(r.roas)} (<1) — ${f.money(r.spend)} sarf, ${f.money(
                  r.revenue,
                )} daromad. O'chiring.`,
              };
      } else {
        verdict = "watch";
        reason =
          mode === "roas"
            ? { code: "mid_roas", text: `ROAS ${f.ratio(r.roas)} — kuzatib turing.` }
            : r.qualified > 0
              ? { code: "mid_cpql", text: `${f.moneyPrecise(r.cpql)} CPQL — kuzatib turing.` }
              : { code: "mid", text: "Kuzatib turing." };
      }

      const scoreValue = mode === "roas" ? r.roas : r.cpql;
      out.push(mk(r, verdict, i + 1, mode, scoreValue, reason));
    });
  }

  const mode: ScoreMetric = levelRevenue > 0 ? "roas" : "cpql";
  ungated.forEach((r, idx) =>
    out.push(
      mk(r, "watch", gated.length + idx + 1, mode, null, {
        code: "low_data",
        text: `Data kam (${f.money(r.spend)} sarf) — aniq tavsiya uchun ko'proq kerak.`,
      }),
    ),
  );

  return out;
}

/** Loyiha bo'yicha barcha darajalardagi tavsiyalarni hisoblaydi. */
export function computeRecommendations(data: DashboardData): RecResult[] {
  return [
    ...computeLevel(data.campaigns),
    ...computeLevel(data.adsets),
    ...computeLevel(data.ads),
  ];
}
