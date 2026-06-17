import { Skeleton } from "@/components/ui/skeleton";

/** /leads yuklanish holati — jadval skeleti (App Router suspense fallback). */
export default function LeadsLoading() {
  return (
    <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-9 w-56" />
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-9 w-72" />
        </div>

        <div className="overflow-x-auto rounded-lg border">
          <div className="space-y-3 p-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="hidden h-4 w-32 md:block" />
                <Skeleton className="h-4 w-44" />
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="ml-auto h-4 w-16" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
