"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  type Column,
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  ChevronsUpDown,
  Clock,
  Eye,
  EyeOff,
  Loader2,
  RefreshCw,
  Star,
  Trophy,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { makeFormatters } from "@/lib/metrics/format";
import { maskPhone } from "@/lib/phone-mask";
import { cn } from "@/lib/utils";

export type LeadListItem = {
  id: string;
  name: string;
  /** Xom telefon — qidiruv shu bo'yicha ishlaydi; ko'rsatishda niqoblanadi. */
  phone: string;
  /** Bog'langan reklama nomi (join'dan); bog'lanmagan bo'lsa null. */
  adName: string | null;
  /** Dashboard detali uchun reklama meta_id (mavjud bo'lsa). */
  adMetaId: string | null;
  campaignMetaId: string | null;
  adsetMetaId: string | null;
  status: string | null;
  isQualified: boolean;
  isWon: boolean;
  revenue: number | null;
  /** transfer_status: transferred | failed | pending */
  transferStatus: string;
  date: string;
};

type LeadFilter = "all" | "qualified" | "won" | "untransferred";
const FILTER_KEYS: LeadFilter[] = ["all", "qualified", "won", "untransferred"];

/** Sariq holatlar uchun kuzatuv rangi (svetofor: data kam/kutilmoqda). */
function SortHeader<TData, TValue>({
  column,
  label,
}: {
  column: Column<TData, TValue>;
  label: string;
}) {
  const sorted = column.getIsSorted();
  return (
    <button
      type="button"
      onClick={() => column.toggleSorting(sorted === "asc")}
      className="inline-flex items-center gap-1 hover:text-foreground"
    >
      {label}
      {sorted === "asc" ? (
        <ArrowUp className="h-3 w-3" />
      ) : sorted === "desc" ? (
        <ArrowDown className="h-3 w-3" />
      ) : (
        <ChevronsUpDown className="h-3 w-3 opacity-40" />
      )}
    </button>
  );
}

/** Holat badge'i — har holat uchun ikonka + matn + aria-label. */
function StatusBadge({ item }: { item: LeadListItem }) {
  const t = useTranslations("leads");
  if (item.isWon) {
    const label = t("status.won");
    return (
      <Badge
        aria-label={label}
        className="gap-1 border-transparent bg-scale text-scale-foreground"
      >
        <Trophy aria-hidden className="h-3 w-3" />
        {label}
      </Badge>
    );
  }
  if (item.isQualified) {
    const label = t("status.qualified");
    return (
      <Badge aria-label={label} variant="outline" className="gap-1">
        <Star aria-hidden className="h-3 w-3" />
        {label}
      </Badge>
    );
  }
  const label = t("status.new");
  return (
    <Badge aria-label={label} variant="secondary" className="gap-1">
      <Clock aria-hidden className="h-3 w-3" />
      {label}
    </Badge>
  );
}

/** O'tkazish holati — har holat uchun ikonka + matn + aria-label. */
function TransferBadge({ status }: { status: string }) {
  const t = useTranslations("leads");
  if (status === "transferred") {
    const label = t("transfer.transferred");
    return (
      <span
        aria-label={label}
        className="inline-flex items-center gap-1 text-xs font-medium text-scale"
      >
        <CheckCircle2 aria-hidden className="h-3.5 w-3.5" />
        {label}
      </span>
    );
  }
  if (status === "failed") {
    const label = t("transfer.failed");
    return (
      <Badge aria-label={label} variant="destructive" className="gap-1">
        <XCircle aria-hidden className="h-3 w-3" />
        {label}
      </Badge>
    );
  }
  const label = t("transfer.pending");
  return (
    <Badge aria-label={label} variant="secondary" className="gap-1">
      <Clock aria-hidden className="h-3 w-3" />
      {label}
    </Badge>
  );
}

/** PII: telefon niqoblangan, qatorda ochib ko'rish tugmasi bilan. */
function PhoneCell({ phone }: { phone: string }) {
  const t = useTranslations("leads");
  const [revealed, setRevealed] = React.useState(false);
  if (!phone) {
    return <span className="text-xs text-muted-foreground">{t("phone.none")}</span>;
  }
  return (
    <span className="inline-flex items-center gap-1">
      <span className="text-xs tabular-nums text-muted-foreground">
        {revealed ? phone : maskPhone(phone)}
      </span>
      <button
        type="button"
        onClick={() => setRevealed((v) => !v)}
        aria-label={revealed ? t("phone.hide") : t("phone.reveal")}
        aria-pressed={revealed}
        className="text-muted-foreground hover:text-foreground"
      >
        {revealed ? (
          <EyeOff aria-hidden className="h-3.5 w-3.5" />
        ) : (
          <Eye aria-hidden className="h-3.5 w-3.5" />
        )}
      </button>
    </span>
  );
}

/** Attribution: reklama nomi (dashboard detaliga havola) + kampaniya/adset izoh. */
function AdCell({ item }: { item: LeadListItem }) {
  const t = useTranslations("leads");
  const secondary = [item.campaignMetaId, item.adsetMetaId]
    .filter((v): v is string => !!v)
    .join(" · ");

  // Bog'langan reklama nomi — dashboard detaliga havola. Xom adMetaId hech qachon
  // ko'rsatilmaydi: nom yo'q bo'lsa "Noma'lum reklama".
  if (item.adName) {
    return (
      <div className="min-w-0">
        <Link
          href={item.adMetaId ? `/dashboard?ad=${encodeURIComponent(item.adMetaId)}` : "/dashboard"}
          title={item.adName}
          className="block max-w-[220px] truncate font-medium text-primary hover:underline"
        >
          {item.adName}
        </Link>
        {secondary && (
          <div className="max-w-[220px] truncate text-xs text-muted-foreground" title={secondary}>
            {secondary}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <span className="block max-w-[220px] truncate text-muted-foreground" title={t("ad.unknown")}>
        {t("ad.unknown")}
      </span>
      {secondary && (
        <div className="max-w-[220px] truncate text-xs text-muted-foreground" title={secondary}>
          {secondary}
        </div>
      )}
    </div>
  );
}

/** "Qayta yuborish" — faqat failed qatorlarda; optimistik "Kutilmoqda" + toast. */
function RetransferButton({ item }: { item: LeadListItem }) {
  const t = useTranslations("leads");
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  if (item.transferStatus !== "failed") return null;

  async function retransfer() {
    setPending(true);
    try {
      const res = await fetch(`/api/leads/${item.id}/retransfer`, { method: "POST" });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(typeof data.error === "string" ? data.error : t("retransfer.error"));
      }
      toast.success(t("retransfer.queued"));
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("retransfer.error"));
      setPending(false);
    }
  }

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={retransfer}
      className="gap-1"
    >
      {pending ? (
        <>
          <Loader2 aria-hidden className="h-3.5 w-3.5 animate-spin" />
          {t("transfer.pending")}
        </>
      ) : (
        <>
          <RefreshCw aria-hidden className="h-3.5 w-3.5" />
          {t("retransfer.button")}
        </>
      )}
    </Button>
  );
}

export function LeadsTable({
  items,
  currency,
  capped = false,
}: {
  items: LeadListItem[];
  currency: string;
  /** True bo'lsa 1000 ta limitga yetildi (eng so'nggilari ko'rsatilmoqda). */
  capped?: boolean;
}) {
  const t = useTranslations("leads");
  // Formatterni memoize qilamiz — aks holda har renderda yangi obyekt yaralib,
  // unga bog'liq `columns` memo'si hech qachon ushlanmasdi (har renderda qayta quriladi).
  const f = React.useMemo(() => makeFormatters(currency), [currency]);
  const [query, setQuery] = React.useState("");
  const [filter, setFilter] = React.useState<LeadFilter>("all");
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "date", desc: true },
  ]);

  const data = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((it) => {
      if (filter === "qualified" && !it.isQualified) return false;
      if (filter === "won" && !it.isWon) return false;
      if (filter === "untransferred" && it.transferStatus === "transferred") return false;
      // Qidiruv xom telefon (xotirada) + ism + reklama nomi bo'yicha.
      if (q && !`${it.name} ${it.phone} ${it.adName ?? ""}`.toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [items, query, filter]);

  const columns = React.useMemo<ColumnDef<LeadListItem>[]>(
    () => [
      {
        id: "name",
        accessorFn: (r) => r.name,
        header: ({ column }) => <SortHeader column={column} label={t("columns.name")} />,
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      },
      {
        id: "phone",
        enableSorting: false,
        header: () => t("columns.phone"),
        cell: ({ row }) => <PhoneCell phone={row.original.phone} />,
      },
      {
        id: "ad",
        accessorFn: (r) => r.adName ?? "",
        header: ({ column }) => <SortHeader column={column} label={t("columns.ad")} />,
        cell: ({ row }) => <AdCell item={row.original} />,
      },
      {
        id: "status",
        accessorFn: (r) => (r.isWon ? 2 : r.isQualified ? 1 : 0),
        header: ({ column }) => <SortHeader column={column} label={t("columns.status")} />,
        cell: ({ row }) => <StatusBadge item={row.original} />,
      },
      {
        id: "revenue",
        accessorFn: (r) => (r.revenue == null ? Number.NEGATIVE_INFINITY : r.revenue),
        header: ({ column }) => <SortHeader column={column} label={t("columns.revenue")} />,
        cell: ({ row }) => (
          <span className="tabular-nums">{f.money(row.original.revenue)}</span>
        ),
      },
      {
        id: "transfer",
        accessorFn: (r) => r.transferStatus,
        header: ({ column }) => <SortHeader column={column} label={t("columns.transfer")} />,
        cell: ({ row }) => <TransferBadge status={row.original.transferStatus} />,
      },
      {
        id: "date",
        accessorFn: (r) => r.date,
        header: ({ column }) => <SortHeader column={column} label={t("columns.date")} />,
        cell: ({ row }) => (
          <span className="tabular-nums text-muted-foreground">{row.original.date}</span>
        ),
      },
      {
        id: "actions",
        enableSorting: false,
        header: () => <span className="sr-only">{t("columns.actions")}</span>,
        cell: ({ row }) => <RetransferButton item={row.original} />,
      },
    ],
    [f, t],
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const numericCols = new Set(["revenue", "date"]);
  // md'dan past ekranlarda yashiriladigan ikkilamchi ustunlar.
  const lowPriorityCols = new Set(["phone", "revenue", "date"]);
  const colVisClass = (id: string) =>
    lowPriorityCols.has(id) ? "hidden md:table-cell" : undefined;

  function ariaSort(id: string): "ascending" | "descending" | "none" | undefined {
    const s = sorting.find((x) => x.id === id);
    if (!s) return "none";
    return s.desc ? "descending" : "ascending";
  }

  const sortableCols = new Set(["name", "ad", "status", "revenue", "transfer", "date"]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Input
          placeholder={t("searchPlaceholder")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-xs"
        />
        <div className="inline-flex items-center rounded-lg border bg-muted p-1">
          {FILTER_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={cn(
                "rounded-md px-3 py-1 text-sm font-medium transition-colors",
                filter === key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t(`filters.${key}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableCaption className="sr-only">{t("tableCaption")}</TableCaption>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((h) => (
                  <TableHead
                    key={h.id}
                    aria-sort={sortableCols.has(h.column.id) ? ariaSort(h.column.id) : undefined}
                    className={cn(
                      "whitespace-nowrap",
                      numericCols.has(h.column.id) && "text-right",
                      colVisClass(h.column.id),
                    )}
                  >
                    {flexRender(h.column.columnDef.header, h.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  {t("emptyFiltered")}
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={cn(
                        numericCols.has(cell.column.id) && "text-right",
                        colVisClass(cell.column.id),
                      )}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>{t("rowCount", { count: data.length })}</span>
        {capped && <span>{t("capNotice")}</span>}
      </div>
    </div>
  );
}
