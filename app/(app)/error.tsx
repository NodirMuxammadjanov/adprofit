"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

/** Ilova qobig'i (app) darajasidagi xato holati — "Xatolik yuz berdi" + qayta urinish. */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("projects");
  const tc = useTranslations("common");

  useEffect(() => {
    console.error("[app] render error:", error);
  }, [error]);

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <div className="rounded-lg border border-dashed p-10 text-center">
        <h1 className="text-lg font-semibold">{t("errorTitle")}</h1>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
          {t("errorBody")}
        </p>
        <Button onClick={reset} variant="outline" size="sm" className="mt-4">
          {tc("retry")}
        </Button>
      </div>
    </main>
  );
}
