import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { leads } from "@/lib/db/schema";
import { JOB, enqueue } from "./queue";

export type LeadTransferPayload = {
  leadgenId: string;
  formId: string;
  adId?: string | null;
  adsetId?: string | null;
  campaignId?: string | null;
};

/** FB Lead Ads lidini CRM'ga o'tkazish ishini navbatga qo'yadi (retry bilan). */
export async function enqueueLeadTransfer(payload: LeadTransferPayload) {
  return enqueue(JOB.leadTransfer, payload, {
    retryLimit: 5,
    retryDelay: 30,
    retryBackoff: true,
  });
}

export class LeadRetransferError extends Error {
  constructor(
    message: string,
    readonly code: "not_found" | "no_form",
  ) {
    super(message);
    this.name = "LeadRetransferError";
  }
}

/**
 * Mavjud (odatda "failed") lidni qayta o'tkazishni navbatga qo'yadi.
 * Lidning `metaLeadId`/`formId` va ad identifikatorlari bo'yicha lead.transfer
 * ishini qaytadan yuboradi. Chaqiruvchi AVVAL assertProjectOwnership orqali
 * loyiha egaligini tekshirishi shart — bu funksiya `expectedProjectId` ham
 * talab qiladi (qo'shimcha himoya: boshqa loyihaning lidi qaytarilmasin).
 *
 * Lid topilmasa yoki boshqa loyihaga tegishli bo'lsa → not_found.
 * Lidning `formId` yo'q bo'lsa (qayta o'tkazib bo'lmaydi) → no_form.
 */
export async function enqueueLeadRetransfer(
  leadId: string,
  expectedProjectId: string,
) {
  const [lead] = await db
    .select({
      projectId: leads.projectId,
      metaLeadId: leads.metaLeadId,
      formId: leads.formId,
      adMetaId: leads.adMetaId,
      adsetMetaId: leads.adsetMetaId,
      campaignMetaId: leads.campaignMetaId,
    })
    .from(leads)
    .where(eq(leads.id, leadId))
    .limit(1);

  if (!lead || lead.projectId !== expectedProjectId) {
    throw new LeadRetransferError("Lid topilmadi", "not_found");
  }
  if (!lead.formId) {
    throw new LeadRetransferError("Lid formasi noma'lum", "no_form");
  }

  const result = await enqueueLeadTransfer({
    leadgenId: lead.metaLeadId,
    formId: lead.formId,
    adId: lead.adMetaId,
    adsetId: lead.adsetMetaId,
    campaignId: lead.campaignMetaId,
  });

  // Ish navbatga qo'yilgach holatni darhol "pending" ga o'tkazamiz: shunda
  // server komponentini qayta yuklaganda (router.refresh) qator "failed" emas,
  // "Kutilmoqda" ko'rinadi va qayta-yuborish tugmasi cheksiz spinnerda qotmaydi.
  // Egalik allaqachon tekshirilgan — yangilashni id + loyiha bo'yicha cheklaymiz.
  await db
    .update(leads)
    .set({ transferStatus: "pending" })
    .where(and(eq(leads.id, leadId), eq(leads.projectId, expectedProjectId)));

  return result;
}
