"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { makeFormatters } from "@/lib/metrics/format";
import type { EntityLevel } from "@/lib/metrics/types";
import type { RecListItem } from "@/lib/recommendations/queries";
import type { Verdict } from "@/lib/recommendations/types";
import { cn } from "@/lib/utils";

const ACTION: Record<Verdict, string> = {
  scale: "Buni ko'paytir",
  kill: "Buni o'chir",
  watch: "Kuzatib tur",
};
const EMOJI: Record<Verdict, string> = { scale: "🟢", kill: "🔴", watch: "🟡" };
const STRIPE: Record<Verdict, string> = {
  scale: "border-l-scale",
  kill: "border-l-kill",
  watch: "border-l-watch",
};
const LEVEL_LABEL: Record<EntityLevel, string> = {
  campaign: "Kampaniya",
  adset: "Ad set",
  ad: "Reklama",
};

const LEVEL_FILTERS: { key: EntityLevel | "all"; label: string }[] = [
  { key: "ad", label: "Reklama" },
  { key: "adset", label: "Ad set" },
  { key: "campaign", label: "Kampaniya" },
  { key: "all", label: "Hammasi" },
];
const VERDICT_FILTERS: { key: Verdict | "all"; label: string }[] = [
  { key: "all", label: "Hammasi" },
  { key: "kill", label: "🔴 O'chir" },
  { key: "scale", label: "🟢 Skala" },
  { key: "watch", label: "🟡 Kuzat" },
];

function Pills<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { key: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex items-center rounded-lg border bg-muted p-1">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => onChange(o.key)}
          className={cn(
            "rounded-md px-3 py-1 text-sm font-medium transition-colors",
            value === o.key
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function RecommendationList({ items }: { items: RecListItem[] }) {
  const router = useRouter();
  const [level, setLevel] = React.useState<EntityLevel | "all">("ad");
  const [verdict, setVerdict] = React.useState<Verdict | "all">("all");
  const [pendingId, setPendingId] = React.useState<string | null>(null);

  const filtered = items.filter(
    (it) =>
      (level === "all" || it.level === level) &&
      (verdict === "all" || it.verdict === verdict),
  );

  async function setStatus(id: string, status: "seen" | "done" | "new") {
    setPendingId(id);
    try {
      const res = await fetch(`/api/recommendations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Yangilab bo'lmadi");
      }
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Xatolik");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Pills options={LEVEL_FILTERS} value={level} onChange={setLevel} />
        <Pills options={VERDICT_FILTERS} value={verdict} onChange={setVerdict} />
        <span className="text-xs text-muted-foreground">{filtered.length} ta tavsiya</span>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">Bu filtr bo&apos;yicha tavsiya yo&apos;q.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((it) => {
            const f = makeFormatters(it.currency);
            const s = it.snapshot;
            return (
              <div
                key={it.id}
                className={cn(
                  "rounded-lg border border-l-4 bg-card p-4",
                  STRIPE[it.verdict],
                  it.status === "done" && "opacity-60",
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold">
                        {EMOJI[it.verdict]} {ACTION[it.verdict]}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        · {LEVEL_LABEL[it.level]}
                      </span>
                      {it.status === "done" && (
                        <span className="text-xs font-medium text-scale">✓ Bajarildi</span>
                      )}
                      {it.status === "seen" && (
                        <span className="text-xs text-muted-foreground">Ko&apos;rildi</span>
                      )}
                    </div>
                    <div className="mt-0.5 truncate font-medium">{it.adName}</div>
                    {it.reason && (
                      <p className="mt-1 text-sm text-muted-foreground">{it.reason.text}</p>
                    )}
                    {s && (
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs tabular-nums text-muted-foreground">
                        <span>
                          Sarf: <span className="text-foreground">{f.money(s.spend)}</span>
                        </span>
                        <span>
                          Sifatli lid:{" "}
                          <span className="text-foreground">{f.int(s.qualified)}</span>
                        </span>
                        <span>
                          Daromad:{" "}
                          <span className="text-foreground">{f.money(s.revenue)}</span>
                        </span>
                        <span>
                          ROAS: <span className="text-foreground">{f.ratio(s.roas)}</span>
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={pendingId === it.id}
                      onClick={() => setStatus(it.id, it.status === "seen" ? "new" : "seen")}
                    >
                      {it.status === "seen" ? "Belgini olish" : "Ko'rildi"}
                    </Button>
                    <Button
                      size="sm"
                      variant={it.status === "done" ? "secondary" : "default"}
                      disabled={pendingId === it.id}
                      onClick={() => setStatus(it.id, it.status === "done" ? "new" : "done")}
                    >
                      {it.status === "done" ? "Bekor qilish" : "Bajarildi"}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
