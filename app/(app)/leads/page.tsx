import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { and, desc, eq, gte, lt } from "drizzle-orm";
import { requireUser } from "@/lib/auth-guards";
import { getCurrentProject } from "@/lib/projects/context";
import { db } from "@/lib/db";
import { adEntities, leads } from "@/lib/db/schema";
import { rangeDisplayLabel, resolveRangeFromParams } from "@/lib/metrics/range";
import { DateRangePicker } from "@/app/(app)/dashboard/_components/DateRangePicker";
import { LeadsTable, type LeadListItem } from "./_components/LeadsTable";

const ROW_CAP = 1000;

/** Phase 8 — /leads: lidlar ro'yxati, har biri o'z reklamasiga bog'langan. */
export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  const user = await requireUser();
  const project = await getCurrentProject(user.id);
  if (!project) redirect("/onboarding");

  const sp = await searchParams;
  const range = resolveRangeFromParams(sp);
  const currency = project.currency ?? "USD";
  const t = await getTranslations("leads");
  const tr = await getTranslations("dashboard.range");

  const rows = await db
    .select({
      id: leads.id,
      fullName: leads.fullName,
      phone: leads.phone,
      status: leads.status,
      isQualified: leads.isQualified,
      isWon: leads.isWon,
      revenue: leads.revenue,
      transferStatus: leads.transferStatus,
      createdAt: leads.createdAt,
      adName: adEntities.name,
      adMetaId: leads.adMetaId,
      campaignMetaId: leads.campaignMetaId,
      adsetMetaId: leads.adsetMetaId,
    })
    .from(leads)
    .leftJoin(adEntities, eq(leads.adEntityId, adEntities.id))
    .where(
      and(
        eq(leads.projectId, project.id),
        gte(leads.createdAt, range.fromTs),
        lt(leads.createdAt, range.toTsExclusive),
      ),
    )
    .orderBy(desc(leads.createdAt))
    .limit(ROW_CAP);

  const items: LeadListItem[] = rows.map((r) => ({
    id: r.id,
    name: r.fullName ?? "—",
    phone: r.phone ?? "",
    // Xom adMetaId hech qachon UI'da ko'rsatilmaydi (komponent niqoblaydi);
    // bu yerda faqat join'lanmagan reklamani aniqlash uchun uzatamiz.
    adName: r.adName ?? null,
    adMetaId: r.adMetaId ?? null,
    campaignMetaId: r.campaignMetaId ?? null,
    adsetMetaId: r.adsetMetaId ?? null,
    status: r.status,
    isQualified: r.isQualified,
    isWon: r.isWon,
    revenue: r.revenue == null ? null : Number(r.revenue),
    transferStatus: r.transferStatus,
    date: r.createdAt.toISOString().slice(0, 10),
  }));

  const capped = rows.length >= ROW_CAP;

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {project.name} · {rangeDisplayLabel(range, tr)}
          </p>
        </div>
        <DateRangePicker active={range.key} from={range.fromDate} to={range.toDate} />
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="text-sm text-muted-foreground">{t("empty.title")}</p>
        </div>
      ) : (
        <LeadsTable items={items} currency={currency} capped={capped} />
      )}
    </main>
  );
}
