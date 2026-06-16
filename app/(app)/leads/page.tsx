import { redirect } from "next/navigation";
import { and, desc, eq, gte, lt } from "drizzle-orm";
import { requireUser } from "@/lib/auth-guards";
import { getCurrentProject } from "@/lib/projects/context";
import { db } from "@/lib/db";
import { adEntities, leads } from "@/lib/db/schema";
import { parseRangeKey, resolveRange } from "@/lib/metrics/range";
import { DateRangePicker } from "@/app/(app)/dashboard/_components/DateRangePicker";
import { LeadsTable, type LeadListItem } from "./_components/LeadsTable";

/** Phase 8 — /leads: lidlar ro'yxati, har biri o'z reklamasiga bog'langan. */
export default async function LeadsPage({
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
    .limit(1000);

  const items: LeadListItem[] = rows.map((r) => ({
    id: r.id,
    name: r.fullName ?? "—",
    phone: r.phone ?? "",
    ad: r.adName ?? r.adMetaId ?? "—",
    status: r.status,
    isQualified: r.isQualified,
    isWon: r.isWon,
    revenue: r.revenue == null ? null : Number(r.revenue),
    transferStatus: r.transferStatus,
    date: r.createdAt.toISOString().slice(0, 10),
  }));

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Lidlar</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {project.name} · {range.label}
          </p>
        </div>
        <DateRangePicker active={range.key} />
      </div>

      <LeadsTable items={items} currency={currency} />
    </main>
  );
}
