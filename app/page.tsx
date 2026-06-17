import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Ban, Eye, TrendingUp, type LucideIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/lib/auth";

/** Landing (logged-out). Logged-in bo'lsa → /dashboard. */
export default async function LandingPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  const t = await getTranslations("landing");

  // TODO(screenshots): real skrinshotlarni /public ga joylang
  //   (preview-dashboard.png, preview-recommendations.png, preview-leads.png).
  //   Hozircha framed placeholder slot'lar ko'rsatiladi.
  const previews: { src: string; alt: string }[] = [
    { src: "/preview-dashboard.png", alt: t("previewDashboardAlt") },
    { src: "/preview-recommendations.png", alt: t("previewRecommendationsAlt") },
    { src: "/preview-leads.png", alt: t("previewLeadsAlt") },
  ];

  const features: {
    icon: LucideIcon;
    title: string;
    text: string;
    cls: string;
  }[] = [
    {
      icon: TrendingUp,
      title: t("featureScaleTitle"),
      text: t("featureScaleText"),
      cls: "bg-scale/10 text-scale",
    },
    {
      icon: Ban,
      title: t("featureKillTitle"),
      text: t("featureKillText"),
      cls: "bg-kill/10 text-kill",
    },
    {
      icon: Eye,
      title: t("featureWatchTitle"),
      text: t("featureWatchText"),
      cls: "bg-watch/10 text-watch",
    },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center gap-16 px-6 py-16">
        {/* Hero */}
        <section className="flex flex-col items-center gap-6 text-center">
          <span className="rounded-full bg-secondary px-3 py-1 text-sm text-muted-foreground">
            {t("badge")}
          </span>
          <h1 className="max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
            {t("heroTitle")}
          </h1>
          <p className="max-w-xl text-muted-foreground">{t("heroSubtitle")}</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/signup"
              className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {t("ctaPrimary")}
            </Link>
            <Link
              href="/login"
              className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {t("ctaSecondary")}
            </Link>
          </div>
        </section>

        {/* Mahsulot ko'rinishi (product preview) */}
        <section className="flex w-full flex-col items-center gap-6">
          <div className="text-center">
            <h2 className="text-xl font-semibold tracking-tight">
              {t("previewTitle")}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("previewSubtitle")}
            </p>
          </div>
          <div className="grid w-full gap-4 sm:grid-cols-3">
            {previews.map((p) => (
              <div
                key={p.src}
                className="relative aspect-[4/3] overflow-hidden rounded-lg border border-border bg-secondary"
              >
                {/* next/image — skrinshot bo'lmasa ham layout buzilmaydi;
                    real fayl /public ga qo'yilgach avtomatik ko'rinadi. */}
                <Image
                  src={p.src}
                  alt={p.alt}
                  fill
                  sizes="(max-width: 640px) 100vw, 33vw"
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        </section>

        {/* Wedge — 3 ta tavsiya turi (scale / kill / watch) */}
        <section className="flex w-full flex-col items-center gap-6">
          <h2 className="text-center text-xl font-semibold tracking-tight">
            {t("featuresTitle")}
          </h2>
          <div className="grid w-full gap-4 sm:grid-cols-3">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="flex flex-col items-start gap-3 rounded-lg border border-border bg-card p-5 shadow-sm"
                >
                  <span
                    className={`flex h-10 w-10 items-center justify-center rounded-lg ${f.cls}`}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="text-base font-semibold">{f.title}</h3>
                  <p className="text-sm text-muted-foreground">{f.text}</p>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center justify-between gap-2 px-6 py-6 text-sm text-muted-foreground sm:flex-row">
          <span className="font-medium text-foreground">{t("badge")}</span>
          <span>{t("footerTagline")}</span>
          <span>
            © {new Date().getFullYear()} {t("footerRights")}
          </span>
        </div>
      </footer>
    </div>
  );
}
