import { z } from "zod";
import { isMock } from "@/lib/env";
import {
  mockAdAccounts,
  mockAdEntities,
  mockInsights,
  mockLeadForms,
  mockPages,
} from "./mock";
import type {
  MetaAdAccount,
  MetaAdNode,
  MetaInsightRow,
  MetaLeadForm,
  MetaLevel,
  MetaPage,
} from "./types";

/**
 * Meta Graph API klienti. Har bir funksiya DESHIFRLANGAN token oladi.
 * isMock() bo'lsa fixturalarni qaytaradi; aks holda real Graph API'ga so'rov yuboradi.
 */

const GRAPH_BASE = "https://graph.facebook.com/v21.0";

/** Graph cursor-paginatsiya javobining umumiy shakli. */
const pagedSchema = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    data: z.array(item),
    paging: z
      .object({
        next: z.string().optional(),
        cursors: z.object({ after: z.string().optional() }).optional(),
      })
      .optional(),
  });

async function graphGet(url: string): Promise<unknown> {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Meta Graph API error ${res.status}: ${body}`);
  }
  return res.json();
}

/** Cursor-paginatsiya bo'yicha barcha sahifalarni yig'adi (oddiy `while(next)`). */
async function fetchAllPages<T>(
  firstUrl: string,
  item: z.ZodType<T>,
): Promise<T[]> {
  const schema = pagedSchema(item);
  const out: T[] = [];
  let next: string | undefined = firstUrl;
  while (next) {
    const json = await graphGet(next);
    const parsed = schema.parse(json);
    out.push(...parsed.data);
    next = parsed.paging?.next;
  }
  return out;
}

function withToken(path: string, token: string, params: Record<string, string>): string {
  const u = new URL(`${GRAPH_BASE}/${path}`);
  u.searchParams.set("access_token", token);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  return u.toString();
}

// ── Ad accounts ──────────────────────────────────────────────────
const rawAdAccountSchema = z.object({
  id: z.string(),
  account_id: z.string().optional(),
  name: z.string().optional(),
  currency: z.string().optional(),
});

export async function listAdAccounts(token: string): Promise<MetaAdAccount[]> {
  if (isMock()) return mockAdAccounts();
  const url = withToken("me/adaccounts", token, {
    fields: "id,account_id,name,currency",
    limit: "100",
  });
  const rows = await fetchAllPages(url, rawAdAccountSchema);
  return rows.map((r) => ({
    id: r.id.startsWith("act_") ? r.id : `act_${r.account_id ?? r.id}`,
    name: r.name ?? r.id,
    currency: r.currency ?? "USD",
  }));
}

// ── Pages ────────────────────────────────────────────────────────
const rawPageSchema = z.object({ id: z.string(), name: z.string().optional() });

export async function listPages(token: string): Promise<MetaPage[]> {
  if (isMock()) return mockPages();
  const url = withToken("me/accounts", token, { fields: "id,name", limit: "100" });
  const rows = await fetchAllPages(url, rawPageSchema);
  return rows.map((r) => ({ id: r.id, name: r.name ?? r.id }));
}

// ── Lead forms ───────────────────────────────────────────────────
const rawLeadFormSchema = z.object({ id: z.string(), name: z.string().optional() });

export async function listLeadForms(
  token: string,
  pageId: string,
): Promise<MetaLeadForm[]> {
  if (isMock()) return mockLeadForms(pageId);
  const url = withToken(`${pageId}/leadgen_forms`, token, {
    fields: "id,name",
    limit: "100",
  });
  const rows = await fetchAllPages(url, rawLeadFormSchema);
  return rows.map((r) => ({ id: r.id, name: r.name ?? r.id }));
}

// ── Ad entities (campaigns + adsets + ads, flatten) ──────────────
const rawCampaignSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  status: z.string().optional(),
  effective_status: z.string().optional(),
});
const rawAdsetSchema = rawCampaignSchema.extend({
  campaign_id: z.string().optional(),
});
const rawAdSchema = rawCampaignSchema.extend({
  adset_id: z.string().optional(),
});

function normalizeAccountId(adAccountId: string): string {
  return adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;
}

function toNode(
  r: { id: string; name?: string; status?: string; effective_status?: string },
  level: MetaLevel,
  parentMetaId: string | null,
): MetaAdNode {
  return {
    metaId: r.id,
    level,
    name: r.name ?? r.id,
    status: r.status ?? "UNKNOWN",
    effectiveStatus: r.effective_status ?? r.status ?? "UNKNOWN",
    parentMetaId,
  };
}

export async function listAdEntities(
  token: string,
  adAccountId: string,
): Promise<MetaAdNode[]> {
  if (isMock()) return mockAdEntities();
  const acct = normalizeAccountId(adAccountId);
  const fields = "id,name,status,effective_status";

  const [campaigns, adsets, ads] = await Promise.all([
    fetchAllPages(
      withToken(`${acct}/campaigns`, token, { fields, limit: "200" }),
      rawCampaignSchema,
    ),
    fetchAllPages(
      withToken(`${acct}/adsets`, token, {
        fields: `${fields},campaign_id`,
        limit: "200",
      }),
      rawAdsetSchema,
    ),
    fetchAllPages(
      withToken(`${acct}/ads`, token, {
        fields: `${fields},adset_id`,
        limit: "200",
      }),
      rawAdSchema,
    ),
  ]);

  return [
    ...campaigns.map((c) => toNode(c, "campaign", null)),
    ...adsets.map((a) => toNode(a, "adset", a.campaign_id ?? null)),
    ...ads.map((a) => toNode(a, "ad", a.adset_id ?? null)),
  ];
}

// ── Insights (daily, level=ad) ───────────────────────────────────
const rawInsightActionSchema = z.object({
  action_type: z.string(),
  value: z.union([z.string(), z.number()]).optional(),
});
const rawInsightSchema = z.object({
  ad_id: z.string().optional(),
  date_start: z.string().optional(),
  spend: z.union([z.string(), z.number()]).optional(),
  impressions: z.union([z.string(), z.number()]).optional(),
  clicks: z.union([z.string(), z.number()]).optional(),
  reach: z.union([z.string(), z.number()]).optional(),
  frequency: z.union([z.string(), z.number()]).optional(),
  actions: z.array(rawInsightActionSchema).optional(),
});

function num(v: string | number | undefined): number {
  if (v === undefined) return 0;
  const n = typeof v === "number" ? v : Number.parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

function extractLeads(actions: z.infer<typeof rawInsightActionSchema>[] | undefined): number {
  if (!actions) return 0;
  const lead = actions.find(
    (a) => a.action_type === "lead" || a.action_type === "leadgen_grouped",
  );
  return lead ? num(lead.value) : 0;
}

export async function getInsights(
  token: string,
  adAccountId: string,
  since: string,
  until: string,
): Promise<MetaInsightRow[]> {
  if (isMock()) return mockInsights(since, until);
  const acct = normalizeAccountId(adAccountId);
  const url = withToken(`${acct}/insights`, token, {
    level: "ad",
    time_increment: "1",
    time_range: JSON.stringify({ since, until }),
    fields: "ad_id,impressions,clicks,spend,reach,frequency,actions",
    limit: "500",
  });
  const rows = await fetchAllPages(url, rawInsightSchema);
  return rows.map((r) => ({
    adMetaId: r.ad_id ?? "",
    date: r.date_start ?? since,
    spend: num(r.spend),
    impressions: num(r.impressions),
    clicks: num(r.clicks),
    reach: num(r.reach),
    frequency: num(r.frequency),
    leads: extractLeads(r.actions),
  }));
}
