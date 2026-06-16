import type {
  MetaAdAccount,
  MetaAdNode,
  MetaInsightRow,
  MetaLeadForm,
  MetaPage,
} from "./types";

/**
 * Deterministik mock fixturalar (Meta App Review kutilayotganda MOCK_INTEGRATIONS=true).
 * Math.random YO'Q, Date.now YO'Q. Sanalar faqat uzatilgan since/until'dan hisoblanadi.
 */

export function mockAdAccounts(): MetaAdAccount[] {
  return [
    { id: "act_1001", name: "AdProfit Demo Account A", currency: "USD" },
    { id: "act_1002", name: "AdProfit Demo Account B", currency: "USD" },
  ];
}

export function mockPages(): MetaPage[] {
  return [
    { id: "page_2001", name: "AdProfit Demo Page" },
    { id: "page_2002", name: "AdProfit Secondary Page" },
  ];
}

export function mockLeadForms(pageId: string): MetaLeadForm[] {
  return [
    { id: `form_${pageId}_1`, name: "Demo Lead Form 1" },
    { id: `form_${pageId}_2`, name: "Demo Lead Form 2" },
  ];
}

/**
 * 1 campaign → 2 adset → 3 ad (jami), flat array, parentMetaId orqali bog'langan.
 */
export function mockAdEntities(): MetaAdNode[] {
  return [
    {
      metaId: "m_camp_1",
      level: "campaign",
      name: "Demo Campaign 1",
      status: "ACTIVE",
      effectiveStatus: "ACTIVE",
      parentMetaId: null,
    },
    {
      metaId: "m_adset_1",
      level: "adset",
      name: "Demo Adset 1",
      status: "ACTIVE",
      effectiveStatus: "ACTIVE",
      parentMetaId: "m_camp_1",
    },
    {
      metaId: "m_adset_2",
      level: "adset",
      name: "Demo Adset 2",
      status: "ACTIVE",
      effectiveStatus: "ACTIVE",
      parentMetaId: "m_camp_1",
    },
    {
      metaId: "m_ad_1",
      level: "ad",
      name: "Demo Ad 1",
      status: "ACTIVE",
      effectiveStatus: "ACTIVE",
      parentMetaId: "m_adset_1",
    },
    {
      metaId: "m_ad_2",
      level: "ad",
      name: "Demo Ad 2",
      status: "ACTIVE",
      effectiveStatus: "ACTIVE",
      parentMetaId: "m_adset_1",
    },
    {
      metaId: "m_ad_3",
      level: "ad",
      name: "Demo Ad 3",
      status: "PAUSED",
      effectiveStatus: "PAUSED",
      parentMetaId: "m_adset_2",
    },
  ];
}

/** "YYYY-MM-DD" sanalar ro'yxati (inklyuziv), sof — global sanaga bog'liq emas. */
export function eachDayInclusive(since: string, until: string): string[] {
  const start = Date.parse(`${since}T00:00:00Z`);
  const end = Date.parse(`${until}T00:00:00Z`);
  if (Number.isNaN(start) || Number.isNaN(end) || start > end) return [];
  const days: string[] = [];
  const DAY_MS = 24 * 60 * 60 * 1000;
  for (let t = start; t <= end; t += DAY_MS) {
    days.push(new Date(t).toISOString().slice(0, 10));
  }
  return days;
}

/**
 * Har bir mock ad uchun [since, until] oralig'idagi har kun bo'yicha bitta qator.
 * Qiymatlar deterministik (ad indeksi + kun indeksidan hisoblanadi).
 */
export function mockInsights(since: string, until: string): MetaInsightRow[] {
  const days = eachDayInclusive(since, until);
  const ads = mockAdEntities().filter((n) => n.level === "ad");
  const rows: MetaInsightRow[] = [];

  ads.forEach((ad, adIdx) => {
    days.forEach((date, dayIdx) => {
      const seed = adIdx + 1;
      const impressions = 1000 * seed + dayIdx * 50;
      const clicks = 50 * seed + dayIdx * 3;
      const reach = Math.round(impressions * 0.8);
      const frequency = reach > 0 ? Math.round((impressions / reach) * 100) / 100 : 0;
      const spend = Math.round((10 * seed + dayIdx * 1.5) * 100) / 100;
      const leads = 5 * seed + (dayIdx % 4);
      rows.push({
        adMetaId: ad.metaId,
        date,
        spend,
        impressions,
        clicks,
        reach,
        frequency,
        leads,
      });
    });
  });

  return rows;
}
