import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { hasClerk } from "@/lib/auth";
import { TelegramLoginButton } from "@/components/auth/TelegramLoginButton";

export default async function SignupPage() {
  const t = await getTranslations("auth");
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6">
      {/* Ko'rinmas sarlavha — ekran o'qiguvchilar uchun sahifa nomi. */}
      <h1 className="sr-only">{t("signupTitle")}</h1>
      {hasClerk() ? (
        <>
          <ClerkSignUp />
          <TelegramLoginButton />
        </>
      ) : (
        <DevAuthNotice />
      )}
    </main>
  );
}

async function ClerkSignUp() {
  const { SignUp } = await import("@clerk/nextjs");
  return <SignUp routing="path" path="/signup" signInUrl="/login" forceRedirectUrl="/dashboard" />;
}

async function DevAuthNotice() {
  const t = await getTranslations("auth");
  return (
    <div className="w-full max-w-sm rounded-lg border border-border bg-secondary p-6 text-center">
      <p className="text-lg font-semibold">{t("signupTitle")}</p>
      <p className="mt-2 text-sm text-muted-foreground">{t("devMode")}</p>
      <Link
        href="/dashboard"
        className="mt-4 inline-block rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        {t("devGoDashboard")}
      </Link>
    </div>
  );
}
