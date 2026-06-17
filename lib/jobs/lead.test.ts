import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * `enqueueLeadRetransfer` testlari — `db` (Drizzle) va `queue` (pg-boss) mock qilinadi,
 * shunda haqiqiy ulanish bo'lmaydi. Asosiy e'tibor: loyiha egaligi tekshiruvi
 * (boshqa loyihaning lidi qaytarilmasligi) va navbatga to'g'ri payload qo'yilishi.
 */

type LeadRow = {
  projectId: string;
  metaLeadId: string;
  formId: string | null;
  adMetaId: string | null;
  adsetMetaId: string | null;
  campaignMetaId: string | null;
};

const h = vi.hoisted(() => ({
  rows: [] as LeadRow[],
  enqueue: vi.fn(),
  updateWhere: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve(h.rows),
        }),
      }),
    }),
    update: () => ({
      set: () => ({
        where: (...args: unknown[]) => {
          h.updateWhere(...args);
          return Promise.resolve();
        },
      }),
    }),
  },
}));

vi.mock("./queue", () => ({
  JOB: {
    metaSync: "meta.sync",
    crmSync: "crm.sync",
    leadTransfer: "lead.transfer",
    recommendationsCompute: "recommendations.compute",
  },
  enqueue: h.enqueue,
}));

import { enqueueLeadRetransfer, LeadRetransferError } from "./lead";

const fullLead: LeadRow = {
  projectId: "P1",
  metaLeadId: "m1",
  formId: "f1",
  adMetaId: "ad1",
  adsetMetaId: "as1",
  campaignMetaId: "c1",
};

beforeEach(() => {
  vi.clearAllMocks();
  h.rows = [];
  h.enqueue.mockResolvedValue("job-1");
});

describe("enqueueLeadRetransfer", () => {
  it("lid topilmasa not_found va navbatga qo'ymaydi", async () => {
    h.rows = [];
    await expect(enqueueLeadRetransfer("L1", "P1")).rejects.toBeInstanceOf(
      LeadRetransferError,
    );
    await expect(enqueueLeadRetransfer("L1", "P1")).rejects.toMatchObject({
      code: "not_found",
    });
    expect(h.enqueue).not.toHaveBeenCalled();
    expect(h.updateWhere).not.toHaveBeenCalled();
  });

  it("lid boshqa loyihaga tegishli bo'lsa not_found (egalik himoyasi)", async () => {
    h.rows = [{ ...fullLead, projectId: "OTHER" }];
    await expect(enqueueLeadRetransfer("L1", "P1")).rejects.toMatchObject({
      code: "not_found",
    });
    expect(h.enqueue).not.toHaveBeenCalled();
    expect(h.updateWhere).not.toHaveBeenCalled();
  });

  it("formId yo'q bo'lsa no_form", async () => {
    h.rows = [{ ...fullLead, formId: null }];
    await expect(enqueueLeadRetransfer("L1", "P1")).rejects.toMatchObject({
      code: "no_form",
    });
    expect(h.enqueue).not.toHaveBeenCalled();
    expect(h.updateWhere).not.toHaveBeenCalled();
  });

  it("yaroqli lid — to'g'ri payload bilan navbatga qo'yadi va statusni pending qiladi", async () => {
    h.rows = [fullLead];
    const res = await enqueueLeadRetransfer("L1", "P1");

    expect(res).toBe("job-1");
    expect(h.enqueue).toHaveBeenCalledTimes(1);
    expect(h.enqueue).toHaveBeenCalledWith(
      "lead.transfer",
      {
        leadgenId: "m1",
        formId: "f1",
        adId: "ad1",
        adsetId: "as1",
        campaignId: "c1",
      },
      expect.objectContaining({ retryLimit: 5 }),
    );
    // transferStatus = "pending" yangilanishi (router.refresh keyin "failed" ko'rsatmasin).
    expect(h.updateWhere).toHaveBeenCalledTimes(1);
  });
});
