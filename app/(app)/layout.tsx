import { requireUser } from "@/lib/auth-guards";
import { hasClerk } from "@/lib/auth";
import { AppNav } from "@/components/app/AppNav";

/**
 * Himoyalangan ilova qobig'i (Dashboard / Recommendations / Leads / Integrations / Settings).
 * Yuqori navbar + loyiha almashtirgich shu yerda.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return (
    <div className="min-h-screen bg-background">
      <AppNav showAccount={hasClerk()} />
      {children}
    </div>
  );
}
