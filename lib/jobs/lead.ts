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
