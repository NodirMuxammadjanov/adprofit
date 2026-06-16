import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth-guards";
import { getCurrentProject } from "@/lib/projects/context";
import { getCurrentRecommendations } from "@/lib/recommendations/queries";
import { ComputeRecommendationsButton } from "@/components/app/ComputeRecommendationsButton";
import { RecommendationList } from "./_components/RecommendationList";

/** Phase 9 — /recommendations: svetofor tavsiyalari (🔴 o'chir / 🟢 ko'paytir / 🟡 kuzat). */
export default async function RecommendationsPage() {
  const user = await requireUser();
  const project = await getCurrentProject(user.id);
  if (!project) redirect("/onboarding");

  const currency = project.currency ?? "USD";
  const items = await getCurrentRecommendations(project.id, currency);

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tavsiyalar</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {project.name} — qaysi reklamani o&apos;chirish yoki ko&apos;paytirishni AdProfit
            aytadi.
          </p>
        </div>
        <ComputeRecommendationsButton projectId={project.id} label="Qayta hisoblash" />
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="mx-auto max-w-md text-sm text-muted-foreground">
            Hali tavsiya yo&apos;q. &quot;Qayta hisoblash&quot;ni bosing (Meta/CRM
            sinxronlangach avtomatik ham hisoblanadi). Aniq tavsiya uchun yetarli data kerak —
            bir necha kun sarf va sifatli lidlar.
          </p>
        </div>
      ) : (
        <RecommendationList items={items} />
      )}
    </main>
  );
}
