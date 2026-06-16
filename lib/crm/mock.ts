import type {
  CrmCreatedEntity,
  CrmDeal,
  CrmLeadInput,
  CrmPipeline,
  CrmTokenData,
} from "./types";

/**
 * Mock CRM ma'lumotlari — deterministik (MOCK_INTEGRATIONS=true holatida).
 * Module darajasida Math.random / Date.now ISHLATILMAYDI — testlar barqaror bo'lishi uchun.
 */

export function mockPipelines(): CrmPipeline[] {
  return [
    {
      id: "1",
      name: "Asosiy",
      stages: [
        { id: "NEW", name: "Yangi" },
        { id: "QUALIFIED", name: "Sifatli" },
        { id: "WON", name: "Yutuq" },
        { id: "LOST", name: "Yo'qotilgan" },
      ],
    },
  ];
}

/** dealId string'idan oddiy belgilar yig'indisi bo'yicha hash. */
function hashString(s: string): number {
  let sum = 0;
  for (let i = 0; i < s.length; i++) {
    sum += s.charCodeAt(i);
  }
  return sum;
}

export function mockGetDeal(dealId: string): CrmDeal {
  const hash = hashString(dealId);
  const bucket = hash % 4;

  let stageId: string;
  let amount: number | null;
  let currency: string | null;

  if (bucket === 0) {
    stageId = "NEW";
    amount = null;
    currency = null;
  } else if (bucket === 1 || bucket === 2) {
    stageId = "QUALIFIED";
    amount = null;
    currency = null;
  } else {
    stageId = "WON";
    amount = 150 + (hash % 10) * 25;
    currency = "USD";
  }

  return {
    id: dealId,
    stageId,
    pipelineId: "1",
    amount,
    currency,
    title: `Deal ${dealId}`,
  };
}

export function mockExchangeCode(): CrmTokenData {
  return {
    accessToken: "MOCK_CRM_TOKEN",
    refreshToken: "MOCK_CRM_REFRESH",
    expiresAt: null,
    portalDomain: "demo.bitrix24.ru",
  };
}

export function mockCreateLead(input: CrmLeadInput): CrmCreatedEntity {
  const key = (input.phone || input.fullName || "x").replace(/\W/g, "");
  return { entityType: "deal", entityId: `deal_mock_${key}` };
}
