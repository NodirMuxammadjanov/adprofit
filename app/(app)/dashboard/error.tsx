"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Dashboard route segment error boundary — yuklash xatosi + qayta urinish. */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("dashboard");
  const tc = useTranslations("common");

  useEffect(() => {
    // Diagnostika uchun log (server log'da digest bilan bog'lanadi).
    console.error("[dashboard] render error:", error);
  }, [error]);

  return (
    <main className="mx-auto flex max-w-7xl flex-col items-center justify-center px-6 py-20 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-kill/10">
        <AlertTriangle className="h-6 w-6 text-kill" aria-hidden="true" />
      </div>
      <h1 className="text-lg font-semibold tracking-tight">{t("loadError")}</h1>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        {t("loadErrorHint")}
      </p>
      <Button onClick={() => reset()} className="mt-6">
        {tc("retry")}
      </Button>
    </main>
  );
}
