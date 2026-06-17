import { Skeleton } from "@/components/ui/skeleton";

/**
 * /onboarding yuklanish holati — sehrgar (stepper + karta) skeleti.
 * Sahifa server komponenti bir nechta DB so'rovini kutadi; bu fallback
 * shu paytda bo'sh ekran o'rniga skelet ko'rsatadi.
 */
export default function OnboardingLoading() {
  return (
    <main className="mx-auto max-w-2xl space-y-8 px-6 py-10">
      <div className="space-y-2 text-center">
        <Skeleton className="mx-auto h-7 w-64" />
        <Skeleton className="mx-auto h-4 w-80" />
      </div>

      {/* Stepper (4 qadam). */}
      <div className="flex items-center justify-center gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="hidden h-4 w-20 sm:block" />
          </div>
        ))}
      </div>

      {/* Joriy qadam kartasi. */}
      <div className="space-y-4 rounded-lg border p-6">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-10 w-40" />
      </div>
    </main>
  );
}
