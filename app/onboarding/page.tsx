import { and, eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth-guards";
import { getCurrentProject } from "@/lib/projects/context";
import { db } from "@/lib/db";
import { leadForms, projectMeta } from "@/lib/db/schema";
import {
  deriveConnectionStatus,
  getUserMetaConnection,
} from "@/lib/meta/connection";
import { getProjectCrmConnection } from "@/lib/crm/connection";
import {
  OnboardingWizard,
  type OnboardingWizardProps,
} from "./_components/OnboardingWizard";

type BannerKind = "connected" | "error" | null;

/** ?meta= / ?crm= query qiymatini banner holatiga aylantiradi. */
function normalizeBanner(value: string | undefined): BannerKind {
  if (value === "connected") return "connected";
  if (value === "error") return "error";
  return null;
}

/**
 * Onboarding sehrgari (stepper): Loyiha → Meta → CRM → Lead transfer.
 * Joriy qadam haqiqiy ulanish holatidan chiqariladi, shuning uchun yarim
 * yo'lda to'xtagan foydalanuvchi to'g'ri qadamdan davom etadi.
 */
export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ meta?: string; crm?: string }>;
}) {
  const user = await requireUser();
  const project = await getCurrentProject(user.id);
  const sp = await searchParams;

  // Standart (loyiha hali yo'q) holat.
  let completion = { project: false, meta: false, crm: false, lead: false };
  let metaProps: OnboardingWizardProps["meta"] = {
    hasConnection: false,
    status: null,
    adAccountId: null,
    pageId: null,
    lastSyncedAt: null,
  };
  let crmProps: OnboardingWizardProps["crm"] = {
    connected: false,
    configured: false,
    status: null,
    provider: null,
    lastSyncedAt: null,
  };
  let leadProps: OnboardingWizardProps["lead"] = {
    ready: false,
    hasMetaPage: false,
    crmConfigured: false,
  };

  if (project) {
    // Barcha so'rovlar loyiha id bo'yicha — loyiha esa egalik tekshirilgan
    // getCurrentProject'dan keladi (ma'lumot izolyatsiyasi saqlanadi).
    const [pm] = await db
      .select()
      .from(projectMeta)
      .where(eq(projectMeta.projectId, project.id))
      .limit(1);
    const connection = await getUserMetaConnection(user.id);
    const crm = await getProjectCrmConnection(project.id);
    const [activeLead] = await db
      .select({ id: leadForms.id })
      .from(leadForms)
      .where(
        and(
          eq(leadForms.projectId, project.id),
          eq(leadForms.isActive, true),
        ),
      )
      .limit(1);

    const crmConfigured = Boolean(
      crm?.pipelineId && crm?.qualifiedStageId && crm?.wonStageId,
    );
    const metaStatus = connection
      ? deriveConnectionStatus(connection.tokenExpiresAt)
      : null;
    const crmStatus = crm ? deriveConnectionStatus(crm.tokenExpiresAt) : null;
    const hasMetaPage = Boolean(pm?.pageId);
    const metaBound = Boolean(pm?.adAccountId);

    completion = {
      project: true,
      // Resume mezoni: reklama hisobi + Facebook Page biriktirilgan.
      meta: metaBound && hasMetaPage,
      crm: crmConfigured,
      // Resume mezoni: kamida bitta faol lead forma.
      lead: Boolean(activeLead),
    };

    metaProps = {
      hasConnection: Boolean(connection),
      status: metaStatus,
      adAccountId: pm?.adAccountId ?? null,
      pageId: pm?.pageId ?? null,
      lastSyncedAt: pm?.lastSyncedAt ? pm.lastSyncedAt.getTime() : null,
    };
    crmProps = {
      connected: Boolean(crm),
      configured: crmConfigured,
      status: crmStatus,
      provider: crm?.provider ?? null,
      lastSyncedAt: crm?.lastSyncedAt ? crm.lastSyncedAt.getTime() : null,
    };
    leadProps = {
      ready: hasMetaPage && crmConfigured && metaStatus !== "expired",
      hasMetaPage,
      crmConfigured,
    };
  }

  // Joriy qadam = birinchi tugallanmagan qadam; barchasi tugagan bo'lsa yakun (4).
  const stepsDone = [
    completion.project,
    completion.meta,
    completion.crm,
    completion.lead,
  ];
  const firstIncomplete = stepsDone.findIndex((done) => !done);
  const initialStep = firstIncomplete === -1 ? stepsDone.length : firstIncomplete;

  return (
    <OnboardingWizard
      projectId={project?.id ?? null}
      initialStep={initialStep}
      userName={user.name ?? null}
      completion={completion}
      meta={metaProps}
      crm={crmProps}
      lead={leadProps}
      banner={{
        meta: normalizeBanner(sp.meta),
        crm: normalizeBanner(sp.crm),
      }}
    />
  );
}
