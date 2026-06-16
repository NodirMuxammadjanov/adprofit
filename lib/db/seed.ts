import "dotenv/config";
import { sql } from "drizzle-orm";
import { db, pool } from "./index";
import {
  adEntities,
  adMetricsDaily,
  crmConnections,
  leadForms,
  leads,
  metaConnections,
  projectMeta,
  projects,
  users,
  type NewAdEntity,
  type NewAdMetricDaily,
  type NewLead,
} from "./schema";
import { encrypt } from "../crypto";

/**
 * Seed — UI/oqimni real Meta/CRM ulanishsiz ko'rish uchun (Meta App Review kutilayotganda).
 * Hikoya: 1 targetolog, 1 loyiha ("Mars reklama"), 2 kampaniya —
 *   - "Qishki aksiya" → yuqori ROAS (sotuvlar bor)  → 🟢 scale
 *   - "Keng auditoriya" → katta sarf, 0 sotuv        → 🔴 kill
 * Idempotent: avval shu seed user'ning loyihalari tozalanadi.
 */

const SEED_CLERK_ID = "user_seed_demo";
const DAYS = 14;

function isoDate(daysAgo: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

async function main() {
  console.log("[seed] Boshlanmoqda...");
  if (!process.env.ENCRYPTION_KEY) {
    process.env.ENCRYPTION_KEY = "0".repeat(64); // seed-only fallback
  }

  // ── User (upsert) ──
  const [user] = await db
    .insert(users)
    .values({
      clerkUserId: SEED_CLERK_ID,
      email: "demo@adprofit.uz",
      name: "Demo Targetolog",
      locale: "uz",
    })
    .onConflictDoUpdate({
      target: users.clerkUserId,
      set: { name: "Demo Targetolog", updatedAt: new Date() },
    })
    .returning();
  console.log("[seed] user:", user.id);

  // Eski seed loyihalarini tozalash (cascade hamma bog'liqni o'chiradi)
  await db.delete(projects).where(sql`${projects.userId} = ${user.id}`);

  // ── Project ──
  const [project] = await db
    .insert(projects)
    .values({ userId: user.id, name: "Mars reklama", currency: "USD" })
    .returning();
  console.log("[seed] project:", project.id);

  // ── Meta connection + project_meta (mock, shifrlangan token) ──
  const [metaConn] = await db
    .insert(metaConnections)
    .values({
      userId: user.id,
      metaUserId: "mock_meta_user",
      accessToken: encrypt("MOCK_META_TOKEN"),
      scopes: ["ads_read", "leads_retrieval", "pages_manage_metadata"],
      tokenExpiresAt: new Date(Date.now() + 60 * 24 * 3600 * 1000),
    })
    .returning();
  await db.insert(projectMeta).values({
    projectId: project.id,
    metaConnectionId: metaConn.id,
    adAccountId: "act_1234567890",
    pageId: "page_999",
    adAccountCurrency: "USD",
    lastSyncedAt: new Date(),
  });

  // ── CRM connection (Bitrix24 mock) ──
  await db.insert(crmConnections).values({
    projectId: project.id,
    provider: "bitrix24",
    portalDomain: "mars.bitrix24.ru",
    accessToken: encrypt("MOCK_BITRIX_TOKEN"),
    refreshToken: encrypt("MOCK_BITRIX_REFRESH"),
    tokenExpiresAt: new Date(Date.now() + 3600 * 1000),
    pipelineId: "1",
    qualifiedStageId: "C1:PREPARATION",
    wonStageId: "C1:WON",
    revenueField: "OPPORTUNITY",
    lastSyncedAt: new Date(),
  });

  // ── Lead form ──
  await db.insert(leadForms).values({
    projectId: project.id,
    metaFormId: "form_111",
    formName: "Qishki aksiya — ariza",
    isActive: true,
    fieldMapping: { full_name: "TITLE", phone: "PHONE", email: "EMAIL" },
    targetPipelineId: "1",
    targetStageId: "C1:NEW",
  });

  // ── Ad hierarchy: 2 campaign × 2 adset × 1 ad = 4 leaf ads ──
  type AdSpec = {
    campaign: string;
    adset: string;
    ad: string;
    metaId: string;
    /** kunlik sarf (USD) */
    dailySpend: number;
    /** kunlik meta leads */
    dailyLeads: number;
    /** sotuvga aylanish ulushi (won) */
    winRate: number;
    /** o'rtacha bitim summasi */
    avgDeal: number;
  };

  const specs: AdSpec[] = [
    {
      campaign: "Qishki aksiya",
      adset: "Toshkent 25-40",
      ad: "Video — chegirma",
      metaId: "ad_1001",
      dailySpend: 12,
      dailyLeads: 4,
      winRate: 0.4,
      avgDeal: 220,
    },
    {
      campaign: "Qishki aksiya",
      adset: "Retarget",
      ad: "Karusel — mahsulot",
      metaId: "ad_1002",
      dailySpend: 8,
      dailyLeads: 3,
      winRate: 0.5,
      avgDeal: 260,
    },
    {
      campaign: "Keng auditoriya",
      adset: "Butun O'zbekiston",
      ad: "Statik — arzon",
      metaId: "ad_2001",
      dailySpend: 18,
      dailyLeads: 6,
      winRate: 0.0, // 0 sotuv → kill
      avgDeal: 0,
    },
    {
      campaign: "Keng auditoriya",
      adset: "18-24 test",
      ad: "Story — yangi",
      metaId: "ad_2002",
      dailySpend: 6,
      dailyLeads: 1,
      winRate: 0.0,
      avgDeal: 0,
    },
  ];

  // Campaign va adset entitylarini yagona qilib yaratamiz
  const campaignIds = new Map<string, string>();
  const adsetIds = new Map<string, string>();
  let campaignSeq = 0;
  let adsetSeq = 0;

  const allLeads: NewLead[] = [];

  for (const s of specs) {
    // Campaign
    if (!campaignIds.has(s.campaign)) {
      const [c] = await db
        .insert(adEntities)
        .values({
          projectId: project.id,
          level: "campaign",
          metaId: `camp_${++campaignSeq}`,
          name: s.campaign,
          status: "ACTIVE",
          effectiveStatus: "ACTIVE",
          lastSyncedAt: new Date(),
        } satisfies NewAdEntity)
        .returning();
      campaignIds.set(s.campaign, c.id);
    }
    const campaignId = campaignIds.get(s.campaign)!;

    // Adset
    const adsetKey = `${s.campaign}//${s.adset}`;
    if (!adsetIds.has(adsetKey)) {
      const [a] = await db
        .insert(adEntities)
        .values({
          projectId: project.id,
          level: "adset",
          metaId: `adset_${++adsetSeq}`,
          parentId: campaignId,
          name: s.adset,
          status: "ACTIVE",
          effectiveStatus: "ACTIVE",
          lastSyncedAt: new Date(),
        } satisfies NewAdEntity)
        .returning();
      adsetIds.set(adsetKey, a.id);
    }
    const adsetId = adsetIds.get(adsetKey)!;

    // Ad (leaf)
    const [ad] = await db
      .insert(adEntities)
      .values({
        projectId: project.id,
        level: "ad",
        metaId: s.metaId,
        parentId: adsetId,
        name: s.ad,
        status: "ACTIVE",
        effectiveStatus: "ACTIVE",
        lastSyncedAt: new Date(),
      } satisfies NewAdEntity)
      .returning();

    // Kunlik metrikalar + lidlar
    const metrics: NewAdMetricDaily[] = [];
    let leadSeq = 0;
    for (let d = DAYS - 1; d >= 0; d--) {
      const date = isoDate(d);
      const dayTs = new Date(`${date}T12:00:00.000Z`); // lid o'sha kunda kelgan
      const impressions = s.dailySpend * 100;
      const clicks = Math.round(impressions * 0.03);
      metrics.push({
        adEntityId: ad.id,
        projectId: project.id,
        date,
        spend: s.dailySpend.toFixed(2),
        impressions,
        clicks,
        reach: Math.round(impressions * 0.8),
        frequency: "1.25",
        metaLeads: s.dailyLeads,
        currency: "USD",
      });

      // Lidlar (har kuni dailyLeads ta)
      for (let l = 0; l < s.dailyLeads; l++) {
        leadSeq++;
        const isWon = Math.random() < s.winRate;
        const isQualified = isWon || Math.random() < 0.5;
        allLeads.push({
          projectId: project.id,
          metaLeadId: `lead_${s.metaId}_${date}_${l}`,
          formId: "form_111",
          adEntityId: ad.id,
          campaignMetaId: `camp_${campaignSeq}`,
          adsetMetaId: `adset_${adsetSeq}`,
          adMetaId: s.metaId,
          fullName: `Mijoz ${s.metaId}-${leadSeq}`,
          phone: `+99890${String(1000000 + leadSeq).slice(0, 7)}`,
          email: null,
          rawFields: { source: "lead_ads" },
          crmEntityType: "deal",
          crmEntityId: `deal_${s.metaId}_${leadSeq}`,
          status: isWon ? "won" : isQualified ? "qualified" : "new",
          isQualified,
          qualifiedAt: isQualified ? dayTs : null,
          isWon,
          wonAt: isWon ? dayTs : null,
          revenue: isWon ? s.avgDeal.toFixed(2) : null,
          currency: "USD",
          transferStatus: "transferred",
          createdAt: dayTs,
          transferredAt: dayTs,
        });
      }
    }
    await db.insert(adMetricsDaily).values(metrics);
  }

  if (allLeads.length) await db.insert(leads).values(allLeads);

  console.log(
    `[seed] Tugadi: 1 user, 1 loyiha, 2 kampaniya, 4 ad, ${DAYS} kun metrika, ${allLeads.length} lid.`,
  );
  await pool.end();
}

main().catch(async (err) => {
  console.error("[seed] Xato:", err);
  await pool.end();
  process.exit(1);
});
