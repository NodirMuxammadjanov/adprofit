import Link from "next/link";
import { hasClerk } from "@/lib/auth";

export default function SignupPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      {hasClerk() ? <ClerkSignUp /> : <DevAuthNotice />}
    </main>
  );
}

async function ClerkSignUp() {
  const { SignUp } = await import("@clerk/nextjs");
  return <SignUp routing="path" path="/signup" signInUrl="/login" forceRedirectUrl="/dashboard" />;
}

function DevAuthNotice() {
  return (
    <div className="w-full max-w-sm rounded-lg border border-border bg-secondary p-6 text-center">
      <h1 className="text-lg font-semibold">Ro'yxatdan o'tish</h1>
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
