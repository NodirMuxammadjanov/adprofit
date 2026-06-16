"use client";

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

const LEVEL_LABEL: Record<EntityLevel, string> = {
  campaign: "Kampaniya",
  adset: "Ad set",
  ad: "Reklama",
};

const CHILD_LABEL: Record<EntityLevel, string | null> = {
  campaign: "Ad set'lar",
  adset: "Reklamalar",
  ad: null,
};

type Tone = "scale" | "kill" | undefined;
type Stat = { label: string; value: string; tone?: Tone };

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
  const row = selected;
  const f = makeFormatters(row?.currency);

  const children =
    row == null
      ? []
      : row.level === "campaign"
        ? adsets.filter((a) => a.parentId === row.id)
        : row.level === "adset"
          ? ads.filter((a) => a.parentId === row.id)
          : [];

  const stats: Stat[] = row
    ? [
        { label: "Sarf", value: f.money(row.spend) },
        { label: "Daromad", value: f.money(row.revenue) },
        {
          label: "Foyda",
          value: f.money(row.profit),
          tone: row.profit >= 0 ? "scale" : "kill",
        },
        {
          label: "ROAS",
          value: f.ratio(row.roas),
          tone: row.roas == null ? undefined : row.roas >= 1 ? "scale" : "kill",
        },
        { label: "Lidlar", value: f.int(row.leads) },
        { label: "Sifatli lid", value: f.int(row.qualified) },
        { label: "Sotuv", value: f.int(row.won) },
        { label: "Sifat ulushi", value: f.pct(row.qualityRate) },
        { label: "CPL", value: f.moneyPrecise(row.cpl) },
        { label: "CPQL", value: f.moneyPrecise(row.cpql) },
        { label: "CAC", value: f.moneyPrecise(row.cac) },
        { label: "Ko'rsatish", value: f.int(row.impressions) },
        { label: "Klik", value: f.int(row.clicks) },
        { label: "CTR", value: f.pct(row.ctr) },
        { label: "CPC", value: f.moneyPrecise(row.cpc) },
        { label: "CPM", value: f.moneyPrecise(row.cpm) },
      ]
    : [];

  return (
    <Sheet open={row != null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right">
        {row && (
          <>
            <SheetHeader>
              <SheetTitle>{row.name}</SheetTitle>
              <SheetDescription>
                {LEVEL_LABEL[row.level]} · {row.effectiveStatus ?? row.status ?? "—"} ·{" "}
                <span className="font-mono text-xs">{row.metaId}</span>
              </SheetDescription>
            </SheetHeader>

            <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-3">
              {stats.map((s) => (
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

            {CHILD_LABEL[row.level] && (
              <div className="mt-8">
                <div className="mb-2 text-sm font-medium text-foreground">
                  {CHILD_LABEL[row.level]} ({children.length})
                </div>
                {children.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Ma'lumot yo'q.</p>
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
