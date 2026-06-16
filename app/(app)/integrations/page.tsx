import Link from "next/link";
import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth-guards";
import { getCurrentProject } from "@/lib/projects/context";
import { getUserMetaConnection } from "@/lib/meta/connection";
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

  if (!project) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <Card>
          <CardHeader>
            <CardTitle>Loyiha yo'q</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">
              Integratsiyalarni ulashdan oldin mijoz loyihasini yarating.
            </p>
            <Link href="/onboarding" className="text-sm font-medium text-primary underline">
              Loyiha yaratish →
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

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Integratsiyalar</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Loyiha: <span className="font-medium text-foreground">{project.name}</span>
        </p>
      </div>

      {sp.meta === "connected" && (
        <div className="rounded-lg border border-scale/30 bg-scale/10 px-4 py-3 text-sm text-foreground">
          Meta muvaffaqiyatli ulandi. Endi reklama hisobini tanlang.
        </div>
      )}
      {sp.meta === "error" && (
        <div className="rounded-lg border border-kill/30 bg-kill/10 px-4 py-3 text-sm text-foreground">
          Meta ulanishi bekor qilindi yoki xato yuz berdi. Qayta urinib ko'ring.
        </div>
      )}

      <MetaConnect
        projectId={project.id}
        hasConnection={Boolean(connection)}
        adAccountId={pm?.adAccountId ?? null}
      />

      {sp.crm === "connected" && (
        <div className="rounded-lg border border-scale/30 bg-scale/10 px-4 py-3 text-sm text-foreground">
          CRM muvaffaqiyatli ulandi. Endi pipeline va bosqichlarni tanlang.
        </div>
      )}
      {sp.crm === "error" && (
        <div className="rounded-lg border border-kill/30 bg-kill/10 px-4 py-3 text-sm text-foreground">
          CRM ulanishi bekor qilindi yoki xato yuz berdi. Qayta urinib ko'ring.
        </div>
      )}

      <CrmConnect
        projectId={project.id}
        connected={Boolean(crm)}
        configured={crmConfigured}
        provider={crm?.provider ?? null}
      />

      <LeadAdsTransfer
        projectId={project.id}
        ready={Boolean(pm?.pageId) && crmConfigured}
      />
    </main>
  );
}
