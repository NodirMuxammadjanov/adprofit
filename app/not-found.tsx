import Link from "next/link";
import { getTranslations } from "next-intl/server";

/**
 * 404 — root layout ichida render bo'ladi (NextIntlClientProvider mavjud),
 * shuning uchun server tarjimasi to'g'ridan-to'g'ri ishlaydi.
 */
export default async function NotFound() {
  const t = await getTranslations("auth");
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="text-5xl font-semibold tracking-tight text-muted-foreground">
        404
      </span>
      <h1 className="text-2xl font-semibold tracking-tight">
        {t("notFoundTitle")}
      </h1>
      <p className="text-muted-foreground">{t("notFoundText")}</p>
      <Link
        href="/"
        className="mt-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        {t("notFoundHome")}
      </Link>
    </main>
  );
}
