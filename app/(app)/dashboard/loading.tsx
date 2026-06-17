/** Dashboard route segment skeleton — KPI kartalar + jadval (data tortilguncha). */
export default function DashboardLoading() {
  return (
    <main className="mx-auto max-w-7xl space-y-6 px-6 py-8" aria-busy="true">
      {/* Sarlavha + boshqaruv qatori. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-2">
          <div className="h-7 w-40 animate-pulse rounded-md bg-muted" />
          <div className="h-4 w-56 animate-pulse rounded-md bg-muted/60" />
        </div>
        <div className="h-9 w-48 animate-pulse rounded-lg bg-muted" />
      </div>

      {/* KPI kartalar (lg:grid-cols-4 — KpiCards bilan mos). */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-[88px] animate-pulse rounded-lg border bg-muted/40"
          />
        ))}
      </div>

      {/* Jadval skeleti. */}
      <div className="space-y-3">
        <div className="h-9 w-64 animate-pulse rounded-lg bg-muted" />
        <div className="overflow-hidden rounded-lg border">
          <div className="h-10 animate-pulse bg-muted/60" />
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-12 animate-pulse border-t bg-muted/20"
            />
          ))}
        </div>
      </div>
    </main>
  );
}
