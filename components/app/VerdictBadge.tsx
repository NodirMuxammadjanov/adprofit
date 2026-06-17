"use client";

import { Ban, Eye, TrendingUp, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import type { Verdict } from "@/lib/recommendations/types";
import { cn } from "@/lib/utils";

/**
 * Svetofor xulosasining yagona manbasi: ikonka + i18n yorlig'i kaliti + rang.
 * Boshqa ekranlar yorliq/ikkonkani shu yerdan oladi (qayta ta'riflamaydi).
 * `labelKey` — "verdict" namespace ichidagi kalit.
 */
export const VERDICT_META: Record<
  Verdict,
  { icon: LucideIcon; labelKey: Verdict; cls: string }
> = {
  scale: {
    icon: TrendingUp,
    labelKey: "scale",
    cls: "bg-scale text-scale-foreground hover:bg-scale",
  },
  kill: {
    icon: Ban,
    labelKey: "kill",
    cls: "bg-kill text-kill-foreground hover:bg-kill",
  },
  watch: {
    icon: Eye,
    labelKey: "watch",
    cls: "bg-watch text-watch-foreground hover:bg-watch",
  },
};

/**
 * Verdict yorlig'ini "verdict" namespace tarjimoni orqali qaytaradi.
 * `t = useTranslations("verdict")` yoki `getTranslations("verdict")`.
 */
export function verdictLabel(
  verdict: Verdict,
  t: (key: string) => string,
): string {
  return t(VERDICT_META[verdict].labelKey);
}

/** Verdict uchun lucide ikonka komponentini qaytaradi. */
export function verdictIcon(verdict: Verdict): LucideIcon {
  return VERDICT_META[verdict].icon;
}

/**
 * Kanonik svetofor chipi — rang + ikonka + o'zbekcha yozuv.
 * Faqat rangga/ikkonkага tayanmaymiz (04-ui-ux accessibility):
 * `role="img"` + `aria-label` yordamchi texnologiyalarga xulosani ochib beradi,
 * ko'rinadigan ichki kontent esa a11y daraxtidan yashiriladi (ikki marta o'qilmasin).
 * verdict yo'q (hisoblanmagan) → "—".
 */
export function VerdictBadge({
  verdict,
  className,
}: {
  verdict: Verdict | null | undefined;
  className?: string;
}) {
  const t = useTranslations("verdict");

  if (!verdict) {
    return (
      <span
        className={cn("text-[13px] text-muted-foreground", className)}
        aria-label="—"
      >
        —
      </span>
    );
  }

  const meta = VERDICT_META[verdict];
  const Icon = meta.icon;
  const label = t(meta.labelKey);

  return (
    <Badge
      role="img"
      aria-label={label}
      className={cn("gap-1 border-transparent", meta.cls, className)}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span aria-hidden="true">{label}</span>
    </Badge>
  );
}
