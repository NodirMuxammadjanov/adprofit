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
  // Demo izchilligi: dealId ichidagi status tokeni ("won"/"qual"/"new") bo'yicha
  // bosqich qaytariladi — seed crmEntityId'ga shu tokenni kodlaydi. Shunda crm-sync
  // seed hikoyasini (qaysi lid sotuvga aylangan) BUZMAYDI, balki TASDIQLAYDI, va
  // qaytarilgan bosqich ID'lari crm_connections sozlamasi bilan mos keladi.
  // Token bo'lmasa (real lead-transfer yaratgan `deal_mock_...`) — deterministik hash.
  const id = dealId.toLowerCase();
  let stageId: string;
  if (id.includes("_won")) stageId = "WON";
  else if (id.includes("_qual")) stageId = "QUALIFIED";
  else if (id.includes("_new")) stageId = "NEW";
  else {
    const bucket = hashString(dealId) % 4;
    stageId = bucket === 0 ? "NEW" : bucket === 3 ? "WON" : "QUALIFIED";
  }

  const won = stageId === "WON";
  return {
    id: dealId,
    stageId,
    pipelineId: "1",
    amount: won ? 150 + (hashString(dealId) % 10) * 25 : null,
    currency: won ? "USD" : null,
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
