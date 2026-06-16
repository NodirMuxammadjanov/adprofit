import { and, eq } from "drizzle-orm";
import { db } from "../../lib/db";
import {
  adEntities,
  leadForms,
  leads,
  metaConnections,
  projectMeta,
} from "../../lib/db/schema";
import { decrypt } from "../../lib/crypto";
import { getLeadDetails } from "../../lib/meta/leads";
import { getCrmContextForProject } from "../../lib/crm/connection";
import type { CrmLeadInput } from "../../lib/crm/types";

/**
 * lead.transfer — FB Lead Ads → CRM o'tkazish + attribution.
 * Graph API'dan lid maydonlari + ad_id'larni oladi, CRM'ga yozadi, `leads` qatorini
 * o'z reklamasiga (ad_entity_id) bog'lab yaratadi. Xato bo'lsa transfer_status='failed'
 * va rethrow (pg-boss retry qiladi).
 */

export type LeadTransferPayload = {
  leadgenId: string;
  formId: string;
  adId?: string | null;
  adsetId?: string | null;
  campaignId?: string | null;
};

export type LeadTransferResult = {
  status: "transferred" | "skipped" | "failed";
  leadRowId?: string;
  crmEntityId?: string;
  reason?: string;
};

export async function runLeadTransfer(payload: LeadTransferPayload): Promise<LeadTransferResult> {
  // 1. Forma → loyiha + mapping + maqsadli pipeline/stage
  const [form] = await db
    .select()
    .from(leadForms)
    .where(and(eq(leadForms.metaFormId, payload.formId), eq(leadForms.isActive, true)))
    .limit(1);
  if (!form) return { status: "skipped", reason: "forma sozlanmagan" };

  const projectId = form.projectId;

  // 2. Dedup
  const [existing] = await db
    .select()
    .from(leads)
    .where(and(eq(leads.projectId, projectId), eq(leads.metaLeadId, payload.leadgenId)))
    .limit(1);
  if (existing && existing.transferStatus === "transferred") {
    return { status: "skipped", reason: "allaqachon o'tkazilgan", leadRowId: existing.id };
  }

  try {
    // 3. Meta token
    const [pm] = await db
      .select()
      .from(projectMeta)
      .where(eq(projectMeta.projectId, projectId))
      .limit(1);
    if (!pm) throw new Error("Meta ulanmagan (project_meta yo'q)");
    const [conn] = await db
      .select()
      .from(metaConnections)
      .where(eq(metaConnections.id, pm.metaConnectionId))
      .limit(1);
    if (!conn) throw new Error("Meta connection topilmadi");
    const token = decrypt(conn.accessToken);

    // 4. Lid tafsilotlari
    const details = await getLeadDetails(token, payload.leadgenId);

    // 5. Attribution
    const adMetaId = payload.adId ?? details.adId;
    let adEntityId: string | null = null;
    if (adMetaId) {
      const [ad] = await db
        .select({ id: adEntities.id })
        .from(adEntities)
        .where(
          and(
            eq(adEntities.projectId, projectId),
            eq(adEntities.metaId, adMetaId),
            eq(adEntities.level, "ad"),
          ),
        )
        .limit(1);
      adEntityId = ad?.id ?? null;
    }

    // 6. CRM input (mapping orqali)
    const mapping = (form.fieldMapping ?? {}) as Record<string, string>;
    const mappedFields: Record<string, string> = {};
    for (const [fbField, crmField] of Object.entries(mapping)) {
      const v = details.rawFields[fbField];
      if (v != null) mappedFields[crmField] = v;
    }
    const input: CrmLeadInput = {
      fullName: details.fullName,
      phone: details.phone,
      email: details.email,
      pipelineId: form.targetPipelineId,
      stageId: form.targetStageId,
      fields: mappedFields,
    };

    // 7. CRM'ga yozish
    const crm = await getCrmContextForProject(projectId);
    if (!crm) throw new Error("CRM ulanmagan");
    const created = await crm.adapter.createLead(crm.ctx, input);

    // 8. leads qatori (upsert)
    const now = new Date();
    const [row] = await db
      .insert(leads)
      .values({
        projectId,
        metaLeadId: payload.leadgenId,
        formId: payload.formId,
        adEntityId,
        campaignMetaId: payload.campaignId ?? details.campaignId,
        adsetMetaId: payload.adsetId ?? details.adsetId,
        adMetaId,
        fullName: details.fullName,
        phone: details.phone,
        email: details.email,
        rawFields: details.rawFields,
        crmEntityType: created.entityType,
        crmEntityId: created.entityId,
        status: "new",
        transferStatus: "transferred",
        transferredAt: now,
        lastSyncedAt: now,
      })
      .onConflictDoUpdate({
        target: [leads.projectId, leads.metaLeadId],
        set: {
          adEntityId,
          crmEntityType: created.entityType,
          crmEntityId: created.entityId,
          transferStatus: "transferred",
          transferredAt: now,
          lastSyncedAt: now,
          updatedAt: now,
        },
      })
      .returning();

    return { status: "transferred", leadRowId: row.id, crmEntityId: created.entityId };
  } catch (err) {
    // Failed holatini saqlaymiz (/leads'da "o'tkazilmadi" + retry uchun)
    await db
      .insert(leads)
      .values({
        projectId,
        metaLeadId: payload.leadgenId,
        formId: payload.formId,
        adMetaId: payload.adId ?? null,
        adsetMetaId: payload.adsetId ?? null,
        campaignMetaId: payload.campaignId ?? null,
        status: "new",
        transferStatus: "failed",
      })
      .onConflictDoUpdate({
        target: [leads.projectId, leads.metaLeadId],
        set: { transferStatus: "failed", updatedAt: new Date() },
      });
    throw err; // pg-boss retry qiladi
  }
}

/** pg-boss handler wrapper (v10: massiv yoki yakka job). */
export async function leadTransferHandler(job: unknown): Promise<LeadTransferResult> {
  const data = (Array.isArray(job) ? (job[0] as { data: LeadTransferPayload })?.data : (job as { data: LeadTransferPayload })?.data) as LeadTransferPayload;
  if (!data?.leadgenId || !data?.formId) {
    return { status: "skipped", reason: "yaroqsiz payload" };
  }
  return runLeadTransfer(data);
}
