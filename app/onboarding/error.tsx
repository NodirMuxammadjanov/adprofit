"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * /onboarding xato chegarasi (App Router error boundary).
 * Onboarding (app) guruhidan tashqarida — shuning uchun (app)/error.tsx uni
 * qoplamaydi. Bu chegara o'rnida qayta-urinish beradi (global-error to'liq
 * sahifani almashtirib yubormasligi uchun).
 */
export default function OnboardingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("onboarding");
  const tc = useTranslations("common");

  React.useEffect(() => {
    console.error("[onboarding] sahifa xatosi:", error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl items-center justify-center px-6 py-10">
      <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed p-10 text-center">
        <AlertTriangle aria-hidden className="h-8 w-8 text-destructive" />
        <div className="space-y-1">
          <p className="text-base font-semibold">{t("error.title")}</p>
          <p className="text-sm text-muted-foreground">{t("error.description")}</p>
        </div>
        <Button onClick={() => reset()} variant="outline">
          {tc("retry")}
        </Button>
      </div>
    </main>
  );
}
