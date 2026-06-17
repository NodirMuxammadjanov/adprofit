"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { RANGE_OPTIONS, type PresetKey, type RangeKey } from "@/lib/metrics/range";
import { cn } from "@/lib/utils";

/**
 * Sana oralig'i tanlovi — ?range= (+ custom uchun ?from=&to=) ni yangilaydi.
 * Navigatsiya useTransition ichida — pending paytida butun guruh disabled + aria-busy.
 */
export function DateRangePicker({
  active,
  from,
  to,
}: {
  active: RangeKey;
  /** Joriy oraliqning 'YYYY-MM-DD' chegaralari (custom inputlar uchun boshlang'ich). */
  from: string;
  to: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const t = useTranslations("dashboard.range");
  const [isPending, startTransition] = React.useTransition();
  const [customOpen, setCustomOpen] = React.useState(active === "custom");
  const [fromVal, setFromVal] = React.useState(from);
  const [toVal, setToVal] = React.useState(to);

  // Server tomondan yangi oraliq kelganda lokal inputlarni sinxronlaymiz.
  React.useEffect(() => {
    setFromVal(from);
    setToVal(to);
  }, [from, to]);

  function pushParams(mutate: (p: URLSearchParams) => void) {
    const next = new URLSearchParams(params.toString());
    mutate(next);
    startTransition(() => {
      router.push(`${pathname}?${next.toString()}`);
    });
  }

  function selectPreset(key: PresetKey) {
    setCustomOpen(false);
    pushParams((p) => {
      p.set("range", key);
      p.delete("from");
      p.delete("to");
    });
  }

  function applyCustom(e: React.FormEvent) {
    e.preventDefault();
    if (!fromVal || !toVal) return;
    pushParams((p) => {
      p.set("range", "custom");
      p.set("from", fromVal);
      p.set("to", toVal);
    });
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div
        className="inline-flex items-center rounded-lg border bg-muted p-1"
        aria-busy={isPending}
      >
        {RANGE_OPTIONS.map((o) => (
          <button
            key={o.key}
            type="button"
            disabled={isPending}
            onClick={() => selectPreset(o.key)}
            className={cn(
              "min-h-9 rounded-md px-3 py-1 text-sm font-medium transition-colors disabled:opacity-60",
              active === o.key && !customOpen
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {o.key === "today"
              ? t("today")
              : o.key === "7d"
                ? t("7d")
                : t("30d")}
          </button>
        ))}
        <button
          type="button"
          disabled={isPending}
          aria-pressed={customOpen || active === "custom"}
          aria-expanded={customOpen}
          onClick={() => setCustomOpen((v) => !v)}
          className={cn(
            "min-h-9 rounded-md px-3 py-1 text-sm font-medium transition-colors disabled:opacity-60",
            active === "custom"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {t("custom")}
        </button>
      </div>

      {customOpen && (
        <form
          onSubmit={applyCustom}
          className="flex flex-wrap items-end gap-2 rounded-lg border bg-background p-2 shadow-sm"
          aria-busy={isPending}
        >
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            {t("from")}
            <input
              type="date"
              value={fromVal}
              max={toVal || undefined}
              disabled={isPending}
              onChange={(e) => setFromVal(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            {t("to")}
            <input
              type="date"
              value={toVal}
              min={fromVal || undefined}
              disabled={isPending}
              onChange={(e) => setToVal(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
            />
          </label>
          <button
            type="submit"
            disabled={isPending || !fromVal || !toVal}
            className="inline-flex h-9 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
          >
            {isPending ? t("pending") : t("apply")}
          </button>
        </form>
      )}
    </div>
  );
}
