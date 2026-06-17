import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import { requireUser } from "@/lib/auth-guards";
import { getCurrentProject } from "@/lib/projects/context";
import { computeDashboard } from "@/lib/metrics/dashboard";
import { rangeDisplayLabel, resolveRangeFromParams } from "@/lib/metrics/range";
import { getVerdictMap } from "@/lib/recommendations/queries";
import { ComputeRecommendationsButton } from "@/components/app/ComputeRecommendationsButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiCards } from "./_components/KpiCards";
import { DateRangePicker } from "./_components/DateRangePicker";
import { EntityTable } from "./_components/EntityTable";

/** Phase 8 — Attribution dashboard: KPI kartalar + Campaign/Ad set/Ad jadvali, sana oralig'i. */
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  const user = await requireUser();
  const project = await getCurrentProject(user.id);
  if (!project) redirect("/onboarding");

  const t = await getTranslations("dashboard");
  const tr = await getTranslations("dashboard.range");
  const sp = await searchParams;
  const range = resolveRangeFromParams(sp);
  const currency = project.currency ?? "USD";
  const data = await computeDashboard(project.id, range, currency);
  const verdicts = await getVerdictMap(project.id);

  // Inline CRM eslatmasi (daromad ko'rsatkichlari uchun) — KPI/jadval yonida.
  const crmReminder = !data.crmConnected ? (
    <Link
      href="/integrations"
      className="inline-flex items-center gap-1 rounded-md border border-dashed border-watch/40 bg-watch/5 px-3 py-1.5 text-xs font-medium text-watch transition-colors hover:bg-watch/10"
    >
      {t("crmReminder")}
    </Link>
  ) : null;

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("subtitle", { project: project.name, range: rangeDisplayLabel(range, tr) })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ComputeRecommendationsButton projectId={project.id} />
          <DateRangePicker
            active={range.key}
            from={range.fromDate}
            to={range.toDate}
          />
        </div>
      </div>

      {/* (a) Meta ulanmagan — boshqa hech narsa ko'rsatmaymiz. */}
      {!data.metaConnected ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("empty.metaTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">{t("empty.metaBody")}</p>
            <Link
              href="/integrations"
              className="inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              {t("empty.metaCta")}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </CardContent>
        </Card>
      ) : data.syncing ? (
        /* (b) Sinxronlanmoqda — banner + skelet jadval. */
        <>
          {crmReminder}
          <div
            role="status"
            className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-foreground"
          >
            {t("empty.syncing")}
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-[88px] animate-pulse rounded-lg border bg-muted/40"
                />
              ))}
            </div>
            <div className="h-72 animate-pulse rounded-lg border bg-muted/40" />
          </div>
        </>
      ) : !data.hasData ? (
        /* (c) Haqiqatan bo'sh oraliq. */
        <>
          {crmReminder}
          <div className="rounded-lg border border-dashed p-10 text-center">
            <p className="text-sm text-muted-foreground">{t("empty.noData")}</p>
          </div>
        </>
      ) : (
        <>
          {crmReminder}
          <KpiCards totals={data.totals} />
          <EntityTable
            campaigns={data.campaigns}
            adsets={data.adsets}
            ads={data.ads}
            currency={currency}
            unattributedLeads={data.unattributedLeads}
            verdicts={verdicts}
          />
        </>
      )}
    </main>
  );
}
