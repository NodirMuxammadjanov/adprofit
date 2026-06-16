/**
 * CRM adapter qatlami uchun umumiy tiplar.
 * CRM faqat `CrmAdapter` interfeysi orqali ishlatiladi (Bitrix24, keyin amoCRM).
 */

export type CrmProvider = "bitrix24" | "amocrm";

export type CrmTokenData = {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
  portalDomain: string | null;
};

export type CrmStage = { id: string; name: string };

export type CrmPipeline = { id: string; name: string; stages: CrmStage[] };

export type CrmDeal = {
  id: string;
  stageId: string;
  pipelineId: string | null;
  amount: number | null;
  currency: string | null;
  title: string | null;
};

export type CrmLeadInput = {
  fullName?: string | null;
  phone?: string | null;
  email?: string | null;
  pipelineId?: string | null;
  stageId?: string | null;
  fields?: Record<string, string>;
};

export type CrmCreatedEntity = { entityType: "lead" | "deal"; entityId: string };

export type CrmContext = { accessToken: string; portalDomain: string | null };
