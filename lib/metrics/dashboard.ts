import { and, eq, gte, lt, lte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { adEntities, adMetricsDaily, leads } from "@/lib/db/schema";
import type { DateRange } from "./range";
import type {
  BaseMetrics,
  DashboardData,
  DerivedMetrics,
  EntityLevel,
  EntityRow,
} from "./types";

/**
 * Attribution + aggregation qatlami.
 * Sarf — ad_metrics_daily (metric sanasi bo'yicha); lid/sifatli/sotuv/daromad — leads
 * (created_at bo'yicha), ad_entity_id orqali reklamaga bog'langan. Leaf ad'dan adset va
 * campaign'gacha yig'iladi; ROAS/CPL/CPQL/CAC har darajada qayta hisoblanadi.
 */

function emptyBase(): BaseMetrics {
  return {
    spend: 0,
    impressions: 0,
    clicks: 0,
    reach: 0,
    metaLeads: 0,
    leads: 0,
    qualified: 0,
    won: 0,
    revenue: 0,
  };
}

function addInto(target: BaseMetrics, src: BaseMetrics): void {
  target.spend += src.spend;
  target.impressions += src.impressions;
  target.clicks += src.clicks;
  target.reach += src.reach;
  target.metaLeads += src.metaLeads;
  target.leads += src.leads;
  target.qualified += src.qualified;
  target.won += src.won;
  target.revenue += src.revenue;
}

function derive(m: BaseMetrics): DerivedMetrics {
  return {
    profit: m.revenue - m.spend,
    roas: m.spend > 0 ? m.revenue / m.spend : null,
    cpl: m.leads > 0 ? m.spend / m.leads : null,
    cpql: m.qualified > 0 ? m.spend / m.qualified : null,
    cac: m.won > 0 ? m.spend / m.won : null,
    ctr: m.impressions > 0 ? m.clicks / m.impressions : null,
    cpc: m.clicks > 0 ? m.spend / m.clicks : null,
    cpm: m.impressions > 0 ? (m.spend / m.impressions) * 1000 : null,
    qualityRate: m.leads > 0 ? m.qualified / m.leads : null,
  };
}

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export async function computeDashboard(
  projectId: string,
  range: DateRange,
  currency: string,
): Promise<DashboardData> {
  const [entities, metricRows, leadRows] = await Promise.all([
    db.select().from(adEntities).where(eq(adEntities.projectId, projectId)),
    db
      .select({
        adEntityId: adMetricsDaily.adEntityId,
        spend: sql<string>`coalesce(sum(${adMetricsDaily.spend}), 0)`,
        impressions: sql<string>`coalesce(sum(${adMetricsDaily.impressions}), 0)`,
        clicks: sql<string>`coalesce(sum(${adMetricsDaily.clicks}), 0)`,
        reach: sql<string>`coalesce(sum(${adMetricsDaily.reach}), 0)`,
        metaLeads: sql<string>`coalesce(sum(${adMetricsDaily.metaLeads}), 0)`,
      })
      .from(adMetricsDaily)
      .where(
        and(
          eq(adMetricsDaily.projectId, projectId),
          gte(adMetricsDaily.date, range.fromDate),
          lte(adMetricsDaily.date, range.toDate),
        ),
      )
      .groupBy(adMetricsDaily.adEntityId),
    db
      .select({
        adEntityId: leads.adEntityId,
        leads: sql<string>`count(*)`,
        qualified: sql<string>`coalesce(sum(case when ${leads.isQualified} then 1 else 0 end), 0)`,
        won: sql<string>`coalesce(sum(case when ${leads.isWon} then 1 else 0 end), 0)`,
        revenue: sql<string>`coalesce(sum(case when ${leads.isWon} then ${leads.revenue} else 0 end), 0)`,
      })
      .from(leads)
      .where(
        and(
          eq(leads.projectId, projectId),
          gte(leads.createdAt, range.fromTs),
          lt(leads.createdAt, range.toTsExclusive),
        ),
      )
      .groupBy(leads.adEntityId),
  ]);

  const byId = new Map(entities.map((e) => [e.id, e] as const));
  const metricByAd = new Map(metricRows.map((r) => [r.adEntityId, r] as const));
  const leadByAd = new Map<string | null, (typeof leadRows)[number]>(
    leadRows.map((r) => [r.adEntityId, r] as const),
  );

  // Har bir entity uchun yig'indi akkumulyatori.
  const acc = new Map<string, BaseMetrics>();
  for (const e of entities) acc.set(e.id, emptyBase());

  // Leaf ad'lar bo'yicha yurib, ad → adset → campaign'ga yig'amiz.
  for (const e of entities) {
    if (e.level !== "ad") continue;
    const base = emptyBase();
    const m = metricByAd.get(e.id);
    if (m) {
      base.spend = num(m.spend);
      base.impressions = num(m.impressions);
      base.clicks = num(m.clicks);
      base.reach = num(m.reach);
      base.metaLeads = num(m.metaLeads);
    }
    const l = leadByAd.get(e.id);
    if (l) {
      base.leads = num(l.leads);
      base.qualified = num(l.qualified);
      base.won = num(l.won);
      base.revenue = num(l.revenue);
    }

    addInto(acc.get(e.id)!, base);
    const adset = e.parentId ? byId.get(e.parentId) : undefined;
    if (adset) {
      addInto(acc.get(adset.id)!, base);
      const campaign = adset.parentId ? byId.get(adset.parentId) : undefined;
      if (campaign) addInto(acc.get(campaign.id)!, base);
    }
  }

  const toRow = (e: (typeof entities)[number]): EntityRow => {
    const base = acc.get(e.id)!;
    return {
      id: e.id,
      metaId: e.metaId,
      level: e.level as EntityLevel,
      name: e.name ?? "—",
      status: e.status,
      effectiveStatus: e.effectiveStatus,
      parentId: e.parentId,
      currency,
      ...base,
      ...derive(base),
    };
  };

  const bySpendDesc = (a: EntityRow, b: EntityRow) => b.spend - a.spend;
  const campaigns = entities.filter((e) => e.level === "campaign").map(toRow).sort(bySpendDesc);
  const adsets = entities.filter((e) => e.level === "adset").map(toRow).sort(bySpendDesc);
  const ads = entities.filter((e) => e.level === "ad").map(toRow).sort(bySpendDesc);

  // Loyiha bo'yicha umumiy (attributsiz lidlar ham kiradi).
  const totalsBase = emptyBase();
  for (const m of metricRows) {
    totalsBase.spend += num(m.spend);
    totalsBase.impressions += num(m.impressions);
    totalsBase.clicks += num(m.clicks);
    totalsBase.reach += num(m.reach);
    totalsBase.metaLeads += num(m.metaLeads);
  }
  for (const l of leadRows) {
    totalsBase.leads += num(l.leads);
    totalsBase.qualified += num(l.qualified);
    totalsBase.won += num(l.won);
    totalsBase.revenue += num(l.revenue);
  }

  const unattributedLeads = num(leadByAd.get(null)?.leads);

  return {
    totals: { currency, ...totalsBase, ...derive(totalsBase) },
    campaigns,
    adsets,
    ads,
    unattributedLeads,
    hasData: totalsBase.spend > 0 || totalsBase.leads > 0,
  };
}
