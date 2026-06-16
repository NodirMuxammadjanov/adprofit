import { env, isMock } from "@/lib/env";
import type { CrmAdapter } from "./adapter";
import {
  mockCreateLead,
  mockExchangeCode,
  mockGetDeal,
  mockPipelines,
} from "./mock";
import type {
  CrmContext,
  CrmCreatedEntity,
  CrmDeal,
  CrmLeadInput,
  CrmPipeline,
  CrmStage,
  CrmTokenData,
} from "./types";

/**
 * Bitrix24 adapteri. Har bir metod: MOCK rejimda mock.ts funksiyalarini ishlatadi,
 * aks holda real Bitrix24 REST chaqiriqlari (faqat mock o'chiq bo'lganda).
 */

const OAUTH_AUTHORIZE = "https://oauth.bitrix.info/oauth/authorize/";
const OAUTH_TOKEN = "https://oauth.bitrix.info/oauth/token/";

/** Real REST chaqirig'i: https://<portalDomain>/rest/<method>?auth=<token>. */
async function bitrixRest<T>(
  ctx: CrmContext,
  method: string,
  params: Record<string, unknown> = {},
): Promise<T> {
  if (!ctx.portalDomain) {
    throw new Error("Bitrix24: portalDomain o'rnatilmagan");
  }
  const url = `https://${ctx.portalDomain}/rest/${method}?auth=${encodeURIComponent(
    ctx.accessToken,
  )}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Bitrix24 REST ${method} xatosi: ${res.status} ${text}`);
  }
  const json = (await res.json()) as { result?: T; error?: string; error_description?: string };
  if (json.error) {
    throw new Error(
      `Bitrix24 REST ${method} xatosi: ${json.error} ${json.error_description ?? ""}`,
    );
  }
  return json.result as T;
}

/** OAuth token javobini CrmTokenData'ga map qilish. */
function mapTokenResponse(json: {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  client_endpoint?: string;
  domain?: string;
  server_endpoint?: string;
}): CrmTokenData {
  let portalDomain: string | null = json.domain ?? null;
  if (!portalDomain && json.client_endpoint) {
    // client_endpoint: https://portal.bitrix24.ru/rest/
    try {
      portalDomain = new URL(json.client_endpoint).host;
    } catch {
      portalDomain = null;
    }
  }
  const expiresAt =
    typeof json.expires_in === "number"
      ? new Date(Date.now() + json.expires_in * 1000)
      : null;
  return {
    accessToken: json.access_token ?? "",
    refreshToken: json.refresh_token ?? null,
    expiresAt,
    portalDomain,
  };
}

async function requestToken(body: Record<string, string>): Promise<CrmTokenData> {
  const url = `${OAUTH_TOKEN}?${new URLSearchParams(body).toString()}`;
  const res = await fetch(url, { method: "GET" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Bitrix24 OAuth token xatosi: ${res.status} ${text}`);
  }
  const json = (await res.json()) as Parameters<typeof mapTokenResponse>[0] & {
    error?: string;
    error_description?: string;
  };
  if (json.error) {
    throw new Error(
      `Bitrix24 OAuth token xatosi: ${json.error} ${json.error_description ?? ""}`,
    );
  }
  return mapTokenResponse(json);
}

export const bitrix24Adapter: CrmAdapter = {
  provider: "bitrix24",

  getAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: env.BITRIX_CLIENT_ID,
      response_type: "code",
      redirect_uri: env.BITRIX_OAUTH_REDIRECT_URI,
      state,
    });
    return `${OAUTH_AUTHORIZE}?${params.toString()}`;
  },

  async exchangeCode(code: string): Promise<CrmTokenData> {
    if (isMock()) return mockExchangeCode();
    return requestToken({
      grant_type: "authorization_code",
      client_id: env.BITRIX_CLIENT_ID,
      client_secret: env.BITRIX_CLIENT_SECRET,
      redirect_uri: env.BITRIX_OAUTH_REDIRECT_URI,
      code,
    });
  },

  async refreshAccessToken(refreshToken: string): Promise<CrmTokenData> {
    if (isMock()) return mockExchangeCode();
    return requestToken({
      grant_type: "refresh_token",
      client_id: env.BITRIX_CLIENT_ID,
      client_secret: env.BITRIX_CLIENT_SECRET,
      refresh_token: refreshToken,
    });
  },

  async listPipelines(ctx: CrmContext): Promise<CrmPipeline[]> {
    if (isMock()) return mockPipelines();

    // Kategoriyalar (voronkalar) + ularning bosqichlari.
    type Category = { ID?: string | number; id?: string | number; NAME?: string; name?: string };
    const categories = await bitrixRest<Category[]>(ctx, "crm.category.list", {
      entityTypeId: 2, // deal
    }).catch(() => [] as Category[]);

    const catList: Category[] = Array.isArray(categories) ? categories : [];
    // Ba'zi portal'larda default kategoriya (ID 0) ham bo'ladi.
    if (catList.length === 0) {
      catList.push({ ID: 0, NAME: "Asosiy" });
    }

    const pipelines: CrmPipeline[] = [];
    for (const cat of catList) {
      const catId = String(cat.ID ?? cat.id ?? "0");
      const catName = String(cat.NAME ?? cat.name ?? `Voronka ${catId}`);

      type Status = { STATUS_ID?: string; NAME?: string };
      const statuses = await bitrixRest<Status[]>(ctx, "crm.status.list", {
        filter: { ENTITY_ID: catId === "0" ? "DEAL_STAGE" : `DEAL_STAGE_${catId}` },
      }).catch(() => [] as Status[]);

      const stages: CrmStage[] = (Array.isArray(statuses) ? statuses : []).map((s) => ({
        id: String(s.STATUS_ID ?? ""),
        name: String(s.NAME ?? s.STATUS_ID ?? ""),
      }));

      pipelines.push({ id: catId, name: catName, stages });
    }

    return pipelines;
  },

  async getDeal(ctx: CrmContext, dealId: string): Promise<CrmDeal | null> {
    if (isMock()) return mockGetDeal(dealId);

    type Deal = {
      ID?: string | number;
      STAGE_ID?: string;
      CATEGORY_ID?: string | number;
      OPPORTUNITY?: string | number;
      CURRENCY_ID?: string;
      TITLE?: string;
    };
    const deal = await bitrixRest<Deal | null>(ctx, "crm.deal.get", { id: dealId });
    if (!deal || (deal.ID === undefined && deal.STAGE_ID === undefined)) {
      return null;
    }

    const rawAmount = deal.OPPORTUNITY;
    const amount =
      rawAmount === undefined || rawAmount === null || rawAmount === ""
        ? null
        : Number(rawAmount);

    return {
      id: String(deal.ID ?? dealId),
      stageId: String(deal.STAGE_ID ?? ""),
      pipelineId:
        deal.CATEGORY_ID === undefined || deal.CATEGORY_ID === null
          ? null
          : String(deal.CATEGORY_ID),
      amount: amount === null || Number.isNaN(amount) ? null : amount,
      currency: deal.CURRENCY_ID ?? null,
      title: deal.TITLE ?? null,
    };
  },

  async createLead(ctx: CrmContext, input: CrmLeadInput): Promise<CrmCreatedEntity> {
    if (isMock()) return mockCreateLead(input);

    const fields: Record<string, unknown> = {
      TITLE: input.fullName ?? input.email ?? input.phone ?? "Lead",
      ...(input.pipelineId ? { CATEGORY_ID: input.pipelineId } : {}),
      ...(input.stageId ? { STAGE_ID: input.stageId } : {}),
      ...(input.phone ? { PHONE: [{ VALUE: input.phone, VALUE_TYPE: "WORK" }] } : {}),
      ...(input.email ? { EMAIL: [{ VALUE: input.email, VALUE_TYPE: "WORK" }] } : {}),
      ...(input.fields ?? {}),
    };

    const id = await bitrixRest<string | number>(ctx, "crm.deal.add", { fields });
    return { entityType: "deal", entityId: String(id) };
  },
};
