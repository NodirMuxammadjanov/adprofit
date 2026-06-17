import Link from "next/link";
import { eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { AlertTriangle } from "lucide-react";
import { requireUser } from "@/lib/auth-guards";
import { getCurrentProject } from "@/lib/projects/context";
import {
  getUserMetaConnection,
  deriveConnectionStatus,
} from "@/lib/meta/connection";
import { getProjectCrmConnection } from "@/lib/crm/connection";
import { db } from "@/lib/db";
import { projectMeta } from "@/lib/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetaConnect } from "./_components/MetaConnect";
import { CrmConnect } from "./_components/CrmConnect";
import { LeadAdsTransfer } from "./_components/LeadAdsTransfer";

export default async function IntegrationsPage({
  searchParams,
}: {
  searchParams: Promise<{ meta?: string; crm?: string }>;
}) {
  const user = await requireUser();
  const project = await getCurrentProject(user.id);
  const sp = await searchParams;
  const t = await getTranslations("integrations");

  if (!project) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <Card>
          <CardHeader>
            <CardTitle>{t("noProjectTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">
              {t("noProjectBody")}
            </p>
            <Link
              href="/onboarding"
              className="text-sm font-medium text-primary underline"
            >
              {t("createProject")}
            </Link>
          </CardContent>
        </Card>
      </main>
    );
  }

  const [pm] = await db
    .select()
    .from(projectMeta)
    .where(eq(projectMeta.projectId, project.id))
    .limit(1);
  const connection = await getUserMetaConnection(user.id);
  const crm = await getProjectCrmConnection(project.id);
  const crmConfigured = Boolean(
    crm?.pipelineId && crm?.qualifiedStageId && crm?.wonStageId,
  );

  // Token muddati `token_expires_at` bo'yicha holatga aylantiriladi (active | expired).
  const metaStatus = connection
    ? deriveConnectionStatus(connection.tokenExpiresAt)
    : null;
  const crmStatus = crm ? deriveConnectionStatus(crm.tokenExpiresAt) : null;
  const anyExpired = metaStatus === "expired" || crmStatus === "expired";

  // Lead Ads tayyorlik prerekvizitlari (qaysi qadam yetishmaydi — banner uchun).
  const hasMetaPage = Boolean(pm?.pageId);
  const leadReady = hasMetaPage && crmConfigured && metaStatus !== "expired";

  // Timestamp'lar — millisekund (raqam) sifatida client'ga uzatiladi (serializatsiya uchun).
  const metaLastSyncedAt = pm?.lastSyncedAt
    ? pm.lastSyncedAt.getTime()
    : null;
  const crmLastSyncedAt = crm?.lastSyncedAt ? crm.lastSyncedAt.getTime() : null;

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("intro")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("introHint")}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("projectLabel")}:{" "}
          <span className="font-medium text-foreground">{project.name}</span>
        </p>
      </div>

      {anyExpired && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-kill/30 bg-kill/10 px-4 py-3 text-sm text-foreground"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-kill" aria-hidden="true" />
          <span>{t("syncStoppedBanner")}</span>
        </div>
      )}

      {sp.meta === "connected" && (
        <div className="rounded-lg border border-scale/30 bg-scale/10 px-4 py-3 text-sm text-foreground">
          {t("banner.metaConnected")}
        </div>
      )}
      {sp.meta === "error" && (
        <div className="rounded-lg border border-kill/30 bg-kill/10 px-4 py-3 text-sm text-foreground">
          {t("banner.metaError")}
        </div>
      )}

      <MetaConnect
        projectId={project.id}
        hasConnection={Boolean(connection)}
        status={metaStatus}
        adAccountId={pm?.adAccountId ?? null}
        pageId={pm?.pageId ?? null}
        lastSyncedAt={metaLastSyncedAt}
      />

      {sp.crm === "connected" && (
        <div className="rounded-lg border border-scale/30 bg-scale/10 px-4 py-3 text-sm text-foreground">
          {t("banner.crmConnected")}
        </div>
      )}
      {sp.crm === "error" && (
        <div className="rounded-lg border border-kill/30 bg-kill/10 px-4 py-3 text-sm text-foreground">
          {t("banner.crmError")}
        </div>
      )}

      <CrmConnect
        projectId={project.id}
        connected={Boolean(crm)}
        configured={crmConfigured}
        status={crmStatus}
        provider={crm?.provider ?? null}
        lastSyncedAt={crmLastSyncedAt}
      />

      <LeadAdsTransfer
        projectId={project.id}
        ready={leadReady}
        hasMetaPage={hasMetaPage}
        crmConfigured={crmConfigured}
      />
    </main>
  );
}
