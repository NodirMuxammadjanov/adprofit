import Link from "next/link";
import { hasClerk } from "@/lib/auth";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      {hasClerk() ? (
        <ClerkSignIn />
      ) : (
        <DevAuthNotice mode="login" />
      )}
    </main>
  );
}

async function ClerkSignIn() {
  const { SignIn } = await import("@clerk/nextjs");
  return <SignIn routing="path" path="/login" signUpUrl="/signup" forceRedirectUrl="/dashboard" />;
}

function DevAuthNotice({ mode }: { mode: "login" | "signup" }) {
  return (
    <div className="w-full max-w-sm rounded-lg border border-border bg-secondary p-6 text-center">
      <h1 className="text-lg font-semibold">
        {mode === "login" ? "Kirish" : "Ro'yxatdan o'tish"}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Dev rejimi: Clerk kalitlari sozlanmagan. Demo foydalanuvchi bilan ishlayapsiz.
      </p>
      <Link
        href="/dashboard"
        className="mt-4 inline-block rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
      >
        Demo dashboard'ga o'tish
      </Link>
    </div>
  );
}
