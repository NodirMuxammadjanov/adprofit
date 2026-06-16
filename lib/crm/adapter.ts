import type {
  CrmContext,
  CrmCreatedEntity,
  CrmDeal,
  CrmLeadInput,
  CrmPipeline,
  CrmProvider,
  CrmTokenData,
} from "./types";

/**
 * CRM provayderlari uchun yagona shartnoma. Boshqa qatlamlar (worker, API)
 * faqat shu interfeys orqali CRM bilan ishlaydi.
 */
export interface CrmAdapter {
  provider: CrmProvider;
  getAuthUrl(state: string): string;
  exchangeCode(code: string): Promise<CrmTokenData>;
  refreshAccessToken(refreshToken: string): Promise<CrmTokenData>;
  listPipelines(ctx: CrmContext): Promise<CrmPipeline[]>;
  getDeal(ctx: CrmContext, dealId: string): Promise<CrmDeal | null>;
  createLead(ctx: CrmContext, input: CrmLeadInput): Promise<CrmCreatedEntity>;
}
