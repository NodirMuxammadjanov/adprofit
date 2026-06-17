import { describe, it, expect } from "vitest";
import { mockGetDeal, mockPipelines } from "@/lib/crm/mock";

/**
 * Asl bug: mockGetDeal "QUALIFIED"/"WON" bosqichlarini qaytarardi, lekin seed
 * crm_connections'da "C1:PREPARATION"/"C1:WON" sozlangan edi → crm-sync hech qachon
 * mos topmay, hamma lidni is_qualified=is_won=false qilib signalni o'chirardi.
 * Bu testlar mock bosqich ID'lari pipeline bilan izchilligini va status-token
 * mantiqini qulflaydi.
 */
describe("mockGetDeal", () => {
  it("dealId status tokeni bo'yicha mos bosqich qaytaradi", () => {
    expect(mockGetDeal("deal_won_ad_1001_5").stageId).toBe("WON");
    expect(mockGetDeal("deal_qual_ad_1001_6").stageId).toBe("QUALIFIED");
    expect(mockGetDeal("deal_new_ad_2001_7").stageId).toBe("NEW");
  });

  it("won deal'da amount/currency bor, qolganida yo'q", () => {
    const won = mockGetDeal("deal_won_x_1");
    expect(won.amount).toBeGreaterThan(0);
    expect(won.currency).toBe("USD");

    const qual = mockGetDeal("deal_qual_x_1");
    expect(qual.amount).toBeNull();
    expect(qual.currency).toBeNull();
  });

  it("qaytarilgan bosqich ID'lari pipeline bosqichlari ichida (izchillik kafolati)", () => {
    const stageIds = mockPipelines()[0].stages.map((s) => s.id);
    for (const id of ["deal_won_a", "deal_qual_b", "deal_new_c", "deal_mock_xyz"]) {
      expect(stageIds).toContain(mockGetDeal(id).stageId);
    }
  });

  it("tokensiz id (real lead-transfer) deterministik bosqich beradi", () => {
    expect(mockGetDeal("deal_mock_abc").stageId).toBe(mockGetDeal("deal_mock_abc").stageId);
  });
});
