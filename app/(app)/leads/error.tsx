"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

/** /leads xato chegarasi (App Router error boundary) — qayta urinish bilan. */
export default function LeadsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("leads");
  const tc = useTranslations("common");

  React.useEffect(() => {
    console.error("[leads] sahifa xatosi:", error);
  }, [error]);

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
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
