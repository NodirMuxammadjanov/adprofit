/** Attribution + dashboard tip'lari. Server'da hisoblanadi, client'ga prop sifatida o'tadi. */

export type EntityLevel = "campaign" | "adset" | "ad";

/** Yig'iladigan (additive) bazaviy metrikalar — ad'dan adset/campaign'gacha sum bo'ladi. */
export type BaseMetrics = {
  spend: number;
  impressions: number;
  clicks: number;
  reach: number;
  metaLeads: number;
  /** CRM'ga o'tkazilgan lidlar soni (leads jadvali). */
  leads: number;
  qualified: number;
  won: number;
  revenue: number;
};

/** Bazadan kelib chiqadigan (non-additive) ko'rsatkichlar — har darajada qayta hisoblanadi. */
export type DerivedMetrics = {
  profit: number;
  roas: number | null;
  cpl: number | null;
  cpql: number | null;
  cac: number | null;
  ctr: number | null;
  cpc: number | null;
  cpm: number | null;
  qualityRate: number | null;
};

export type EntityRow = BaseMetrics &
  DerivedMetrics & {
    id: string;
    metaId: string;
    level: EntityLevel;
    name: string;
    status: string | null;
    effectiveStatus: string | null;
    parentId: string | null;
    currency: string;
  };

export type DashboardTotals = BaseMetrics & DerivedMetrics & { currency: string };

export type DashboardData = {
  totals: DashboardTotals;
  campaigns: EntityRow[];
  adsets: EntityRow[];
  ads: EntityRow[];
  /** Reklamaga bog'lanmagan lidlar (adEntityId = null). */
  unattributedLeads: number;
  hasData: boolean;
};
