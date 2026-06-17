"use client";

import { useEffect } from "react";
import { NextIntlClientProvider, useTranslations } from "next-intl";
import authMessages from "@/messages/uz/auth.json";
import commonMessages from "@/messages/uz/common.json";
import "./globals.css";

/**
 * Root global-error — root layout'ni TO'LIQ almashtiradi, shuning uchun
 * o'zining <html>/<body> va i18n kontekstini render qilishi shart
 * (NextIntlClientProvider bu yerda mavjud emas). v1 yagona til — uz,
 * shuning uchun xabarlarni statik import qilamiz.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Kutilmagan global xatoni log qilamiz (digest bilan).
    console.error("[global-error]", error.digest ?? "", error);
  }, [error]);

  return (
    <html lang="uz">
      <body className="font-sans antialiased">
        <NextIntlClientProvider
          locale="uz"
          messages={{ auth: authMessages, common: commonMessages }}
        >
          <ErrorContent reset={reset} />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

function ErrorContent({ reset }: { reset: () => void }) {
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">
        {t("errorTitle")}
      </h1>
      <p className="text-muted-foreground">{t("errorText")}</p>
      <button
        type="button"
        onClick={reset}
        className="mt-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        {tc("retry")}
      </button>
    </main>
  );
}
