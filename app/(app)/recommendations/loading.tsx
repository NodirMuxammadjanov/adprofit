import { Skeleton } from "@/components/ui/skeleton";

/** /recommendations yuklanish holati — karta shaklini takrorlovchi skeletlar. */
export default function Loading() {
  return (
    <main className="mx-auto max-w-4xl space-y-6 px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-8 w-32" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-9 w-40" />
      </div>

      <div className="space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-lg border border-l-4 bg-card p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-28" />
                  <Skeleton className="h-4 w-20" />
                </div>
                <Skeleton className="h-5 w-3/5" />
                <Skeleton className="h-4 w-4/5" />
                <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
              <div className="flex shrink-0 flex-col gap-1.5">
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-8 w-24" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
