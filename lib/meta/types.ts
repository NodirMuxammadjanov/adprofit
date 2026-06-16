import { z } from "zod";

/**
 * Meta (Facebook) integratsiya qatlamining umumiy TS tiplari va mos zod sxemalari.
 * Boshqa agentlar shu nomlar/shaklarga qarab kod yozadi — nomlarni o'zgartirmang.
 */

// ── Token ────────────────────────────────────────────────────────
export const MetaTokenDataSchema = z.object({
  accessToken: z.string(),
  metaUserId: z.string(),
  expiresAt: z.date().nullable(),
  scopes: z.array(z.string()),
});
export type MetaTokenData = {
  accessToken: string;
  metaUserId: string;
  expiresAt: Date | null;
  scopes: string[];
};

// ── Ad account ───────────────────────────────────────────────────
export const MetaAdAccountSchema = z.object({
  id: z.string(), // "act_123"
  name: z.string(),
  currency: z.string(),
});
export type MetaAdAccount = { id: string; name: string; currency: string };

// ── Page ─────────────────────────────────────────────────────────
export const MetaPageSchema = z.object({
  id: z.string(),
  name: z.string(),
});
export type MetaPage = { id: string; name: string };

// ── Lead form ────────────────────────────────────────────────────
export const MetaLeadFormSchema = z.object({
  id: z.string(),
  name: z.string(),
});
export type MetaLeadForm = { id: string; name: string };

// ── Level / ad node ──────────────────────────────────────────────
export const MetaLevelSchema = z.enum(["campaign", "adset", "ad"]);
export type MetaLevel = "campaign" | "adset" | "ad";

export const MetaAdNodeSchema = z.object({
  metaId: z.string(),
  level: MetaLevelSchema,
  name: z.string(),
  status: z.string(),
  effectiveStatus: z.string(),
  parentMetaId: z.string().nullable(),
});
export type MetaAdNode = {
  metaId: string;
  level: MetaLevel;
  name: string;
  status: string;
  effectiveStatus: string;
  parentMetaId: string | null;
};

// ── Insight row ──────────────────────────────────────────────────
export const MetaInsightRowSchema = z.object({
  adMetaId: z.string(),
  date: z.string(),
  spend: z.number(),
  impressions: z.number(),
  clicks: z.number(),
  reach: z.number(),
  frequency: z.number(),
  leads: z.number(),
});
export type MetaInsightRow = {
  adMetaId: string;
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  reach: number;
  frequency: number;
  leads: number;
};
