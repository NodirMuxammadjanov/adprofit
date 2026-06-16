import { requireUser } from "@/lib/auth-guards";

/** Phase 11'da to'liq onboarding sehrgari (stepper) quriladi. */
export default async function OnboardingPage() {
  const user = await requireUser();
  return (
    <main className="mx-auto max-w-2xl px-6 py-16 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Xush kelibsiz, AdProfit!</h1>
      <p className="mt-3 text-muted-foreground">
        {user.name ?? "Targetolog"}, birinchi mijoz loyihasini yaratamiz: Loyiha → Meta → CRM →
        Lead transfer.
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        (Onboarding sehrgari Phase 4 va 11'da quriladi.)
      </p>
    </main>
  );
}
