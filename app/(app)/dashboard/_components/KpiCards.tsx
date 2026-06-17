"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { makeFormatters } from "@/lib/metrics/format";
import type { DashboardTotals } from "@/lib/metrics/types";
import { cn } from "@/lib/utils";

type Tone = "scale" | "kill" | undefined;

type KpiCard = {
  label: string;
  value: string;
  /** Ikkinchi (kichik) qiymat — yorlig'i bilan, masalan "Lid narxi" kartasi CPL/CPQL. */
  sub?: { label: string; value: string }[];
  subText?: string;
  tone?: Tone;
  /** Profit/ROAS — biroz kuchliroq vizual urg'u (kattaroq raqam). */
  emphasis?: boolean;
};

/** Yuqori qatordagi KPI kartalar (04-ui-ux). Foyda/ROAS semantik rangda + urg'uli. */
export function KpiCards({ totals }: { totals: DashboardTotals }) {
  const t = useTranslations("dashboard.kpi");
  const f = makeFormatters(totals.currency);

  const cards: KpiCard[] = [
    { label: t("spend"), value: f.money(totals.spend) },
    { label: t("revenue"), value: f.money(totals.revenue) },
    {
      label: t("profit"),
      value: f.money(totals.profit),
      tone: totals.profit >= 0 ? "scale" : "kill",
      emphasis: true,
    },
    {
      label: t("roas"),
      value: f.ratio(totals.roas),
      tone: totals.roas == null ? undefined : totals.roas >= 1 ? "scale" : "kill",
      emphasis: true,
    },
    {
      label: t("qualified"),
      value: f.int(totals.qualified),
      subText: t("qualifiedSub", { leads: f.int(totals.leads), won: f.int(totals.won) }),
    },
    // CPL/CPQL bitta kartada — ikkita kichik sub-qiymat.
    {
      label: t("leadCost"),
      value: f.moneyPrecise(totals.cpl),
      sub: [
        { label: t("cpl"), value: f.moneyPrecise(totals.cpl) },
        { label: t("cpql"), value: f.moneyPrecise(totals.cpql) },
      ],
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {cards.map((c) => (
        <Card
          key={c.label}
          className={cn(c.emphasis && "border-foreground/10 shadow-sm ring-1 ring-border")}
        >
          <CardContent className="p-4">
            <div className="text-xs font-medium text-muted-foreground">{c.label}</div>
            {c.sub ? (
              // "Lid narxi" — ikkita kichik qiymat yonma-yon.
              <div className="mt-1 flex items-baseline gap-4">
                {c.sub.map((s) => (
                  <div key={s.label}>
                    <div className="whitespace-nowrap text-lg font-semibold tabular-nums">
                      {s.value}
                    </div>
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      {s.label}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div
                className={cn(
                  "mt-1 whitespace-nowrap font-semibold tabular-nums",
                  c.emphasis ? "text-2xl" : "text-xl",
                  c.tone === "scale" && "text-scale",
                  c.tone === "kill" && "text-kill",
                )}
              >
                {c.value}
              </div>
            )}
            {c.subText && (
              <div className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                {c.subText}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
