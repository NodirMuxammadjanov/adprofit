"use client";

import * as React from "react";
import {
  type Column,
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { useTranslations } from "next-intl";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { makeFormatters } from "@/lib/metrics/format";
import type { EntityLevel, EntityRow } from "@/lib/metrics/types";
import type { Verdict } from "@/lib/recommendations/types";
import { VerdictBadge } from "@/components/app/VerdictBadge";
import { cn } from "@/lib/utils";
import { EntityDrawer } from "./EntityDrawer";

type Tone = "scale" | "kill" | undefined;

/** next-intl tarjimon tipi (qisman) — buildColumns/LevelTable'ga uzatiladi. */
type T = (key: string, values?: Record<string, string | number>) => string;

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
      // ≥36px bosish maydoni (04-ui-ux a11y) — min-h-9.
      className="inline-flex min-h-9 items-center gap-1 rounded-md hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {label}
      {sorted === "asc" ? (
        <ArrowUp className="h-3 w-3" aria-hidden="true" />
      ) : sorted === "desc" ? (
        <ArrowDown className="h-3 w-3" aria-hidden="true" />
      ) : (
        <ChevronsUpDown className="h-3 w-3 opacity-40" aria-hidden="true" />
      )}
    </button>
  );
}

/** md'dan past ekranda yashiriladigan past-prioritetli ustunlar; Nomi/Sarf/ROAS/Tavsiya doim ko'rinadi. */
const LOW_PRIORITY = new Set(["leads", "qualified", "won", "revenue", "cpl", "cpql", "profit"]);

function buildColumns(
  currency: string,
  verdicts: Record<string, Verdict>,
  t: T,
): ColumnDef<EntityRow>[] {
  const f = makeFormatters(currency);

  const numeric = (
    id: string,
    label: string,
    get: (r: EntityRow) => number | null,
    fmt: (n: number | null) => string,
    getTone?: (r: EntityRow) => Tone,
  ): ColumnDef<EntityRow> => ({
    id,
    accessorFn: (r) => {
      const v = get(r);
      return v == null ? Number.NEGATIVE_INFINITY : v;
    },
    header: ({ column }) => <SortHeader column={column} label={label} />,
    cell: ({ row }) => {
      const r = row.original;
      const tone = getTone?.(r);
      return (
        <span
          className={cn(
            "tabular-nums",
            tone === "scale" && "text-scale",
            tone === "kill" && "text-kill",
          )}
        >
          {fmt(get(r))}
        </span>
      );
    },
  });

  return [
    {
      id: "name",
      accessorFn: (r) => r.name,
      header: ({ column }) => <SortHeader column={column} label={t("cols.name")} />,
      cell: ({ row }) => {
        const r = row.original;
        const active = (r.effectiveStatus ?? r.status) === "ACTIVE";
        const statusLabel = active ? t("statusActive") : t("statusPaused");
        return (
          <div className="flex items-center gap-2">
            {/* Faqat rangga tayanmaymiz: nuqta yonida sr-only matn (04-ui-ux a11y). */}
            <span
              className={cn(
                "h-1.5 w-1.5 shrink-0 rounded-full",
                active ? "bg-scale" : "bg-muted-foreground/40",
              )}
              aria-hidden="true"
            />
            <span className="sr-only">{statusLabel}</span>
            <span className="max-w-[220px] truncate font-medium">{r.name}</span>
          </div>
        );
      },
    },
    numeric("spend", t("cols.spend"), (r) => r.spend, f.money),
    numeric("leads", t("cols.leads"), (r) => r.leads, f.int),
    numeric("qualified", t("cols.qualified"), (r) => r.qualified, f.int),
    numeric("won", t("cols.won"), (r) => r.won, f.int),
    numeric("revenue", t("cols.revenue"), (r) => r.revenue, f.money),
    numeric("roas", t("cols.roas"), (r) => r.roas, f.ratio, (r) =>
      r.roas == null ? undefined : r.roas >= 1 ? "scale" : "kill",
    ),
    numeric("cpl", t("cols.cpl"), (r) => r.cpl, f.moneyPrecise),
    numeric("cpql", t("cols.cpql"), (r) => r.cpql, f.moneyPrecise),
    numeric("profit", t("cols.profit"), (r) => r.profit, f.money, (r) =>
      r.profit >= 0 ? "scale" : "kill",
    ),
    {
      id: "verdict",
      // Saralash tartibi (asc): kill (0) → scale (1) → watch (2) → tavsiya yo'q (3).
      // Shunday qilib asc'da eng shoshilinch (kill) tepada, hisoblanmaganlar oxirida turadi.
      accessorFn: (r) => {
        const v = verdicts[r.id];
        return v === "kill" ? 0 : v === "scale" ? 1 : v === "watch" ? 2 : 3;
      },
      header: ({ column }) => <SortHeader column={column} label={t("cols.verdict")} />,
      cell: ({ row }) => <VerdictBadge verdict={verdicts[row.original.id]} />,
    },
  ];
}

/** aria-sort qiymatini tanstack saralash holatidan oladi. */
function ariaSort(sorted: false | "asc" | "desc"): "ascending" | "descending" | "none" {
  return sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : "none";
}

function LevelTable({
  rows,
  columns,
  onRowClick,
  t,
}: {
  rows: EntityRow[];
  columns: ColumnDef<EntityRow>[];
  onRowClick: (r: EntityRow) => void;
  t: T;
}) {
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "spend", desc: true },
  ]);
  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    // Mobilda gorizontal scroll (04-ui-ux mobil).
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((hg) => (
            <TableRow key={hg.id}>
              {hg.headers.map((h) => (
                <TableHead
                  key={h.id}
                  aria-sort={ariaSort(h.column.getIsSorted())}
                  className={cn(
                    "whitespace-nowrap",
                    h.column.id !== "name" && "text-right",
                    LOW_PRIORITY.has(h.column.id) && "hidden md:table-cell",
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
                {t("empty")}
              </TableCell>
            </TableRow>
          ) : (
            table.getRowModel().rows.map((row) => {
              const open = () => onRowClick(row.original);
              return (
                <TableRow
                  key={row.id}
                  tabIndex={0}
                  role="button"
                  aria-label={t("rowAriaLabel", { name: row.original.name })}
                  className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                  onClick={open}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      open();
                    } else if (e.key === " " || e.key === "Spacebar") {
                      // Space sahifani scroll qilmasin.
                      e.preventDefault();
                      open();
                    }
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={cn(
                        cell.column.id !== "name" && "text-right",
                        LOW_PRIORITY.has(cell.column.id) && "hidden md:table-cell",
                      )}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export function EntityTable({
  campaigns,
  adsets,
  ads,
  currency,
  unattributedLeads,
  verdicts,
}: {
  campaigns: EntityRow[];
  adsets: EntityRow[];
  ads: EntityRow[];
  currency: string;
  unattributedLeads: number;
  verdicts: Record<string, Verdict>;
}) {
  const t = useTranslations("dashboard.table");
  const [activeOnly, setActiveOnly] = React.useState(false);
  const [selected, setSelected] = React.useState<EntityRow | null>(null);
  const columns = React.useMemo(
    () => buildColumns(currency, verdicts, t),
    [currency, verdicts, t],
  );

  const filter = (rows: EntityRow[]) =>
    activeOnly
      ? rows.filter((r) => (r.effectiveStatus ?? r.status) === "ACTIVE")
      : rows;

  const tabs: { value: EntityLevel; label: string; rows: EntityRow[] }[] = [
    { value: "campaign", label: t("tabs.campaign"), rows: filter(campaigns) },
    { value: "adset", label: t("tabs.adset"), rows: filter(adsets) },
    { value: "ad", label: t("tabs.ad"), rows: filter(ads) },
  ];

  return (
    <div>
      <Tabs defaultValue="campaign">
        <div className="mb-3 flex items-center justify-between gap-3">
          <TabsList>
            {tabs.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {/* Native checkbox a11y: id+htmlFor, ≥16px, fokus halqasi, kengroq bosish maydoni. */}
          <label
            htmlFor="active-only"
            className="flex cursor-pointer items-center gap-2 py-2 text-sm text-muted-foreground"
          >
            <input
              id="active-only"
              type="checkbox"
              checked={activeOnly}
              onChange={(e) => setActiveOnly(e.target.checked)}
              className="h-4 w-4 rounded border-input accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
            {t("activeOnly")}
          </label>
        </div>

        {tabs.map((tab) => (
          <TabsContent key={tab.value} value={tab.value}>
            <LevelTable rows={tab.rows} columns={columns} onRowClick={setSelected} t={t} />
          </TabsContent>
        ))}
      </Tabs>

      {unattributedLeads > 0 && (
        <p className="mt-3 text-xs text-muted-foreground">
          {t("unattributed", { count: unattributedLeads })}
        </p>
      )}

      <EntityDrawer
        selected={selected}
        onClose={() => setSelected(null)}
        adsets={adsets}
        ads={ads}
      />
    </div>
  );
}
