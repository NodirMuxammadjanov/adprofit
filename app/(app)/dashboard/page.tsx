import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth-guards";
import { getCurrentProject } from "@/lib/projects/context";
import { computeDashboard } from "@/lib/metrics/dashboard";
import { parseRangeKey, resolveRange } from "@/lib/metrics/range";
import { getVerdictMap } from "@/lib/recommendations/queries";
import { ComputeRecommendationsButton } from "@/components/app/ComputeRecommendationsButton";
import { KpiCards } from "./_components/KpiCards";
import { DateRangePicker } from "./_components/DateRangePicker";
import { EntityTable } from "./_components/EntityTable";

/** Phase 8 — Attribution dashboard: KPI kartalar + Campaign/Ad set/Ad jadvali, sana oralig'i. */
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const user = await requireUser();
  const project = await getCurrentProject(user.id);
  if (!project) redirect("/onboarding");

  const sp = await searchParams;
  const range = resolveRange(parseRangeKey(sp.range));
  const currency = project.currency ?? "USD";
  const data = await computeDashboard(project.id, range, currency);
  const verdicts = await getVerdictMap(project.id);

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {project.name} · {range.label}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ComputeRecommendationsButton projectId={project.id} />
          <DateRangePicker active={range.key} />
        </div>
      </div>

      {!data.hasData ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="text-sm text-muted-foreground">
            Bu oraliq uchun ma&apos;lumot yo&apos;q. Meta&apos;ni ulang va sinxronlang, yoki
            boshqa sana oralig&apos;ini tanlang.
          </p>
        </div>
      ) : (
        <>
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
