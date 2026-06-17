import { Skeleton } from "@/components/ui/skeleton";

/**
 * /integrations yuklanish holati — Meta / CRM / Lead Ads ulanish kartalari
 * skeleti. Server qobig'i ulanish holatini tortayotganda bo'sh ekran o'rniga
 * skelet ko'rsatadi (connect komponentlari tuzilishiga mos).
 */
export default function IntegrationsLoading() {
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-6 py-10">
      <div className="space-y-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-80" />
        <Skeleton className="h-4 w-40" />
      </div>

      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="space-y-4 rounded-lg border p-6">
          <div className="flex items-center justify-between gap-4">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-10 w-36" />
        </div>
      ))}
    </main>
  );
}
