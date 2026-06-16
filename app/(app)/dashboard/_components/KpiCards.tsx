import { Card, CardContent } from "@/components/ui/card";
import { makeFormatters } from "@/lib/metrics/format";
import type { DashboardTotals } from "@/lib/metrics/types";
import { cn } from "@/lib/utils";

type Tone = "scale" | "kill" | undefined;

/** Yuqori qatordagi KPI kartalar (04-ui-ux). Foyda/ROAS semantik rangda. */
export function KpiCards({ totals }: { totals: DashboardTotals }) {
  const f = makeFormatters(totals.currency);

  const cards: { label: string; value: string; sub?: string; tone?: Tone }[] = [
    { label: "Sarf", value: f.money(totals.spend) },
    { label: "Daromad", value: f.money(totals.revenue) },
    {
      label: "Foyda",
      value: f.money(totals.profit),
      tone: totals.profit >= 0 ? "scale" : "kill",
    },
    {
      label: "ROAS",
      value: f.ratio(totals.roas),
      tone: totals.roas == null ? undefined : totals.roas >= 1 ? "scale" : "kill",
    },
    {
      label: "Sifatli lid",
      value: f.int(totals.qualified),
      sub: `${f.int(totals.leads)} lid · ${f.int(totals.won)} sotuv`,
    },
    { label: "CPL", value: f.moneyPrecise(totals.cpl) },
    { label: "CPQL", value: f.moneyPrecise(totals.cpql) },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
      {cards.map((c) => (
        <Card key={c.label}>
          <CardContent className="p-4">
            <div className="text-xs font-medium text-muted-foreground">{c.label}</div>
            <div
              className={cn(
                "mt-1 text-xl font-semibold tabular-nums",
                c.tone === "scale" && "text-scale",
                c.tone === "kill" && "text-kill",
              )}
            >
              {c.value}
            </div>
            {c.sub && (
              <div className="mt-0.5 text-xs tabular-nums text-muted-foreground">{c.sub}</div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
