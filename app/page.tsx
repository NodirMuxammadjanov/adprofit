import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

/** Landing (logged-out). Logged-in bo'lsa → /dashboard. */
export default async function LandingPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-6 px-6 text-center">
      <span className="rounded-full bg-secondary px-3 py-1 text-sm text-muted-foreground">
        AdProfit
      </span>
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        Foyda olib keladigan reklamalarni topib beramiz.
      </h1>
      <p className="max-w-xl text-muted-foreground">
        Meta Ads sarfini CRM daromadiga bog'lab, har bir reklamaga 🟢 ko'paytir / 🔴 o'chir /
        🟡 kuzat tavsiyasini beramiz.
      </p>
      <div className="flex gap-3">
        <Link
          href="/signup"
          className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
        >
          Bepul boshlash
        </Link>
        <Link
          href="/login"
          className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium"
        >
          Kirish
        </Link>
      </div>
    </main>
  );
}
