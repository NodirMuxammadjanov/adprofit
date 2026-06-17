"use client";

import { useTranslations } from "next-intl";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { makeFormatters } from "@/lib/metrics/format";
import type { EntityLevel, EntityRow } from "@/lib/metrics/types";
import { cn } from "@/lib/utils";

type Tone = "scale" | "kill" | undefined;
type Stat = { label: string; value: string; tone?: Tone };
type Section = { title: string; stats: Stat[] };

export function EntityDrawer({
  selected,
  onClose,
  adsets,
  ads,
}: {
  selected: EntityRow | null;
  onClose: () => void;
  adsets: EntityRow[];
  ads: EntityRow[];
}) {
  const t = useTranslations("dashboard.drawer");
  const row = selected;
  const f = makeFormatters(row?.currency);

  const childLevel: EntityLevel | null =
    row == null
      ? null
      : row.level === "campaign"
        ? "adset"
        : row.level === "adset"
          ? "ad"
          : null;

  const children =
    row == null
      ? []
      : row.level === "campaign"
        ? adsets.filter((a) => a.parentId === row.id)
        : row.level === "adset"
          ? ads.filter((a) => a.parentId === row.id)
          : [];

  // ~15 ko'rsatkich uchta mavzuga bo'lingan: Moliya / Voronka / Yetkazib berish.
  const sections: Section[] = row
    ? [
        {
          title: t("sections.finance"),
          stats: [
            { label: t("stats.spend"), value: f.money(row.spend) },
            { label: t("stats.revenue"), value: f.money(row.revenue) },
            {
              label: t("stats.profit"),
              value: f.money(row.profit),
              tone: row.profit >= 0 ? "scale" : "kill",
            },
            {
              label: t("stats.roas"),
              value: f.ratio(row.roas),
              tone: row.roas == null ? undefined : row.roas >= 1 ? "scale" : "kill",
            },
          ],
        },
        {
          title: t("sections.funnel"),
          stats: [
            { label: t("stats.leads"), value: f.int(row.leads) },
            { label: t("stats.qualified"), value: f.int(row.qualified) },
            { label: t("stats.won"), value: f.int(row.won) },
            { label: t("stats.qualityRate"), value: f.pct(row.qualityRate) },
            { label: t("stats.cpl"), value: f.moneyPrecise(row.cpl) },
            { label: t("stats.cpql"), value: f.moneyPrecise(row.cpql) },
            { label: t("stats.cac"), value: f.moneyPrecise(row.cac) },
          ],
        },
        {
          title: t("sections.delivery"),
          stats: [
            { label: t("stats.impressions"), value: f.int(row.impressions) },
            { label: t("stats.clicks"), value: f.int(row.clicks) },
            { label: t("stats.ctr"), value: f.pct(row.ctr) },
            { label: t("stats.cpc"), value: f.moneyPrecise(row.cpc) },
            { label: t("stats.cpm"), value: f.moneyPrecise(row.cpm) },
          ],
        },
      ]
    : [];

  return (
    <Sheet open={row != null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="overflow-y-auto">
        {row && (
          <>
            <SheetHeader>
              <SheetTitle>{row.name}</SheetTitle>
              <SheetDescription>
                {t(`level.${row.level}`)} · {row.effectiveStatus ?? row.status ?? "—"} ·{" "}
                <span className="font-mono text-xs">{row.metaId}</span>
              </SheetDescription>
            </SheetHeader>

            <div className="mt-6 space-y-6">
              {sections.map((section) => (
                <div key={section.title}>
                  <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {section.title}
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                    {section.stats.map((s) => (
                      <div key={s.label}>
                        <div className="text-xs text-muted-foreground">{s.label}</div>
                        <div
                          className={cn(
                            "text-sm font-medium tabular-nums",
                            s.tone === "scale" && "text-scale",
                            s.tone === "kill" && "text-kill",
                          )}
                        >
                          {s.value}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {childLevel && (
              <div className="mt-8">
                <div className="mb-2 text-sm font-medium text-foreground">
                  {t("childrenCount", {
                    label: t(`children.${childLevel}`),
                    count: children.length,
                  })}
                </div>
                {children.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("empty")}</p>
                ) : (
                  <div className="divide-y rounded-lg border">
                    {children.map((c) => (
                      <div
                        key={c.id}
                        className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                      >
                        <span className="min-w-0 flex-1 truncate">{c.name}</span>
                        <span className="tabular-nums text-muted-foreground">
                          {f.money(c.spend)}
                        </span>
                        <span
                          className={cn(
                            "w-14 text-right tabular-nums",
                            c.roas == null
                              ? "text-muted-foreground"
                              : c.roas >= 1
                                ? "text-scale"
                                : "text-kill",
                          )}
                        >
                          {f.ratio(c.roas)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
