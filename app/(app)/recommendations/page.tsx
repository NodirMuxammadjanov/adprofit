import { redirect } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { getTranslations, getFormatter } from "next-intl/server";
import { requireUser } from "@/lib/auth-guards";
import { getCurrentProject } from "@/lib/projects/context";
import { getCurrentRecommendations } from "@/lib/recommendations/queries";
import { db } from "@/lib/db";
import { recommendations } from "@/lib/db/schema";
import { ComputeRecommendationsButton } from "@/components/app/ComputeRecommendationsButton";
import { RecommendationList } from "./_components/RecommendationList";

/**
 * Joriy tavsiyalarning oxirgi hisoblangan vaqti (eng yangi created_at).
 * Loyiha egaligi sahifada allaqachon tekshirilgan — bu yerda faqat shu
 * loyihaga tegishli qatorlardan o'qiymiz.
 */
async function getLastComputedAt(projectId: string): Promise<Date | null> {
  const [row] = await db
    .select({ createdAt: recommendations.createdAt })
    .from(recommendations)
    .where(
      and(eq(recommendations.projectId, projectId), eq(recommendations.isCurrent, true)),
    )
    .orderBy(desc(recommendations.createdAt))
    .limit(1);
  return row?.createdAt ?? null;
}

/** Phase 9 — /recommendations: svetofor tavsiyalari (🔴 o'chir / 🟢 ko'paytir / 🟡 kuzat). */
export default async function RecommendationsPage() {
  const user = await requireUser();
  const project = await getCurrentProject(user.id);
  if (!project) redirect("/onboarding");

  const t = await getTranslations("recommendations");
  const format = await getFormatter();
  const currency = project.currency ?? "USD";

  const [items, lastComputedAt] = await Promise.all([
    getCurrentRecommendations(project.id, currency),
    getLastComputedAt(project.id),
  ]);

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("subtitle", { project: project.name })}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <ComputeRecommendationsButton projectId={project.id} />
          <p className="text-xs text-muted-foreground">
            {lastComputedAt
              ? t("lastComputed", {
                  time: format.relativeTime(lastComputedAt, new Date()),
                })
              : t("lastComputedNever")}
          </p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <h2 className="text-base font-semibold">{t("emptyTitle")}</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            {t("emptyBody")}
          </p>
        </div>
      ) : (
        <RecommendationList items={items} />
      )}
    </main>
  );
}
