"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { useMetaSync } from "@/lib/integrations/meta-hooks";

type CompletionStepProps = {
  projectId: string;
  /** Sarlavhaga fokus berish uchun (sehrgar fokus boshqaruvi). */
  headingRef: React.RefObject<HTMLHeadingElement | null>;
};

/**
 * Yakuniy qadam: "Tabriklaymiz! Sinxronlash boshlandi".
 * Mount bo'lganda mavjud useMetaSync mutatsiyasini bir marta ishga tushiradi,
 * muvaffaqiyatda /dashboard'ga yo'naltiradi (dashboard syncing holatini ko'rsatadi).
 */
export function CompletionStep({ projectId, headingRef }: CompletionStepProps) {
  const t = useTranslations("onboarding");
  const router = useRouter();
  const sync = useMetaSync(projectId);
  const fired = useRef(false);

  // Sinxronlashni faqat bir marta avtomatik ishga tushiramiz.
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    sync.mutate();
  }, [sync]);

  // Navbatga qo'yilgach dashboard'ga o'tamiz (u yerda syncing holati ko'rinadi).
  useEffect(() => {
    if (sync.isSuccess) {
      router.push("/dashboard");
    }
  }, [sync.isSuccess, router]);

  return (
    <div className="space-y-5 text-center">
      <div className="flex justify-center">
        <CheckCircle2 className="h-12 w-12 text-scale" aria-hidden="true" />
      </div>
      <div className="space-y-2">
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="text-xl font-semibold tracking-tight focus-visible:outline-none"
        >
          {t("completion.title")}
        </h2>
        <p className="text-sm text-muted-foreground">{t("completion.subtitle")}</p>
        <p className="text-sm text-muted-foreground">{t("completion.body")}</p>
      </div>

      {sync.isPending && (
        <p
          className="flex items-center justify-center gap-2 text-sm text-muted-foreground"
          role="status"
        >
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          {t("completion.syncing")}
        </p>
      )}

      <div className="flex flex-col items-center gap-3">
        {sync.isError && (
          <Button
            variant="outline"
            onClick={() => sync.mutate()}
            disabled={sync.isPending}
          >
            <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
            {t("completion.retry")}
          </Button>
        )}
        <Button onClick={() => router.push("/dashboard")} className="w-full sm:w-auto">
          {t("completion.goToDashboard")}
        </Button>
      </div>
    </div>
  );
}
