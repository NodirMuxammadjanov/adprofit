"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { VERDICT_META } from "@/components/app/VerdictBadge";
import { makeFormatters } from "@/lib/metrics/format";
import type { EntityLevel } from "@/lib/metrics/types";
import type { RecListItem } from "@/lib/recommendations/queries";
import type { Verdict } from "@/lib/recommendations/types";
import {
  groupRecommendations,
  type StatusFilter,
} from "@/lib/recommendations/group";
import { cn } from "@/lib/utils";

/** Chap chetdagi rang chizig'i (svetofor semantikasi — 04-ui-ux). */
const STRIPE: Record<Verdict, string> = {
  scale: "border-l-scale",
  kill: "border-l-kill",
  watch: "border-l-watch",
};
/** Guruh sarlavhasi ikonkasi rangi. */
const HEADER_ICON_COLOR: Record<Verdict, string> = {
  scale: "text-scale",
  kill: "text-kill",
  watch: "text-watch",
};

function Pills<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: { key: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  ariaLabel?: string;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="inline-flex items-center rounded-lg border bg-muted p-1"
    >
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          aria-pressed={value === o.key}
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
  const t = useTranslations("recommendations");
  const tv = useTranslations("verdict");

  // Standart "all": tavsiyalar faqat campaign/adset darajasida bo'lsa ham
  // birinchi yuklanishda ko'rinadi (aks holda bo'sh "noMatch" chiqib qolardi).
  const [level, setLevel] = React.useState<EntityLevel | "all">("all");
  // Standart holatda bajarilmagan tavsiyalar (done pastga itariladi).
  const [status, setStatus] = React.useState<StatusFilter>("pending");
  const [pendingId, setPendingId] = React.useState<string | null>(null);

  const LEVEL_FILTERS: { key: EntityLevel | "all"; label: string }[] = [
    { key: "ad", label: t("levelAd") },
    { key: "adset", label: t("levelAdset") },
    { key: "campaign", label: t("levelCampaign") },
    { key: "all", label: t("levelAll") },
  ];
  const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
    { key: "pending", label: t("statusPending") },
    { key: "done", label: t("statusDone") },
    { key: "all", label: t("statusAll") },
  ];

  // Verdict bo'yicha guruhlash (kill → scale → watch); done elementlar pastga.
  const groups = groupRecommendations(items, level, status);
  // Ko'rsatilgan kartalar soni — guruhlardan (qo'shimcha filtrlash o'tkazmasdan).
  const count = groups.reduce((n, g) => n + g.list.length, 0);

  const isFiltered = level !== "all" || status !== "all";

  function resetFilters() {
    setLevel("all");
    setStatus("all");
  }

  async function setRecStatus(id: string, next: "seen" | "done" | "new") {
    setPendingId(id);
    try {
      const res = await fetch(`/api/recommendations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? t("updateError"));
      }
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("updateError"));
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <Pills options={LEVEL_FILTERS} value={level} onChange={setLevel} />
        <Pills
          options={STATUS_FILTERS}
          value={status}
          onChange={setStatus}
          ariaLabel={t("filterByStatus")}
        />
        <span className="text-xs text-muted-foreground">
          {t("count", { count })}
        </span>
      </div>

      {groups.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">{t("noMatch")}</p>
          {isFiltered && (
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={resetFilters}
            >
              {t("clearFilters")}
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map(({ verdict, list }) => {
            const meta = VERDICT_META[verdict];
            const Icon = meta.icon;
            return (
              <section key={verdict} className="space-y-3">
                <h2 className="flex items-center gap-2 text-sm font-semibold">
                  <Icon
                    className={cn("h-4 w-4 shrink-0", HEADER_ICON_COLOR[verdict])}
                    aria-hidden="true"
                  />
                  <span>
                    {t("groupCount", {
                      label: tv(meta.labelKey),
                      count: list.length,
                    })}
                  </span>
                </h2>
                <div className="space-y-3">
                  {list.map((it) => (
                    <RecommendationCard
                      key={it.id}
                      item={it}
                      pending={pendingId === it.id}
                      onSetStatus={setRecStatus}
                      t={t}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RecommendationCard({
  item,
  pending,
  onSetStatus,
  t,
}: {
  item: RecListItem;
  pending: boolean;
  onSetStatus: (id: string, next: "seen" | "done" | "new") => void;
  t: ReturnType<typeof useTranslations<"recommendations">>;
}) {
  const f = makeFormatters(item.currency);
  const s = item.snapshot;
  // Sabab YOKI raqamlar yo'q bo'lsa, asossiz tavsiya ko'rsatmaymiz.
  const hasJustification = Boolean(item.reason?.text) && Boolean(s);
  const isDone = item.status === "done";
  const isSeen = item.status === "seen";

  return (
    <div
      className={cn(
        "rounded-lg border border-l-4 bg-card p-4",
        STRIPE[item.verdict],
        isDone && "opacity-60",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">{t(levelKey(item.level))}</span>
            {isDone && (
              <span className="text-xs font-medium text-scale">{t("doneBadge")}</span>
            )}
            {isSeen && (
              <span className="text-xs text-muted-foreground">{t("seenBadge")}</span>
            )}
          </div>
          <div className="mt-0.5 truncate font-medium">{item.adName}</div>

          {hasJustification ? (
            <>
              <p className="mt-1 text-sm text-muted-foreground">{item.reason!.text}</p>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs tabular-nums text-muted-foreground">
                <span>
                  {t("metricSpend")}:{" "}
                  <span className="text-foreground">{f.money(s!.spend)}</span>
                </span>
                <span>
                  {t("metricQualified")}:{" "}
                  <span className="text-foreground">{f.int(s!.qualified)}</span>
                </span>
                <span>
                  {t("metricRevenue")}:{" "}
                  <span className="text-foreground">{f.money(s!.revenue)}</span>
                </span>
                <span>
                  {t("metricRoas")}:{" "}
                  <span className="text-foreground">{f.ratio(s!.roas)}</span>
                </span>
              </div>
            </>
          ) : (
            <p className="mt-1 text-sm italic text-muted-foreground">
              {t("insufficientData")}
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-col gap-1.5">
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            aria-label={
              isSeen
                ? t("ariaUnmarkSeen", { name: item.adName })
                : t("ariaMarkSeen", { name: item.adName })
            }
            onClick={() => onSetStatus(item.id, isSeen ? "new" : "seen")}
          >
            {pending && (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            )}
            {isSeen ? t("unsee") : t("seen")}
          </Button>
          <Button
            size="sm"
            variant={isDone ? "secondary" : "default"}
            disabled={pending}
            aria-label={
              isDone
                ? t("ariaUnmarkDone", { name: item.adName })
                : t("ariaMarkDone", { name: item.adName })
            }
            onClick={() => onSetStatus(item.id, isDone ? "new" : "done")}
          >
            {pending ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              !isDone && <Check className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            )}
            {isDone ? t("undone") : t("done")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function levelKey(level: EntityLevel): "levelAd" | "levelAdset" | "levelCampaign" {
  switch (level) {
    case "ad":
      return "levelAd";
    case "adset":
      return "levelAdset";
    case "campaign":
      return "levelCampaign";
  }
}
