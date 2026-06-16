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

function buildColumns(
  currency: string,
  verdicts: Record<string, Verdict>,
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
      header: ({ column }) => <SortHeader column={column} label="Nomi" />,
      cell: ({ row }) => {
        const r = row.original;
        const active = (r.effectiveStatus ?? r.status) === "ACTIVE";
        return (
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "h-1.5 w-1.5 shrink-0 rounded-full",
                active ? "bg-scale" : "bg-muted-foreground/40",
              )}
              title={r.effectiveStatus ?? r.status ?? "—"}
            />
            <span className="max-w-[220px] truncate font-medium">{r.name}</span>
          </div>
        );
      },
    },
    numeric("spend", "Sarf", (r) => r.spend, f.money),
    numeric("leads", "Lidlar", (r) => r.leads, f.int),
    numeric("qualified", "Sifatli", (r) => r.qualified, f.int),
    numeric("won", "Sotuv", (r) => r.won, f.int),
    numeric("revenue", "Daromad", (r) => r.revenue, f.money),
    numeric("roas", "ROAS", (r) => r.roas, f.ratio, (r) =>
      r.roas == null ? undefined : r.roas >= 1 ? "scale" : "kill",
    ),
    numeric("cpl", "CPL", (r) => r.cpl, f.moneyPrecise),
    numeric("cpql", "CPQL", (r) => r.cpql, f.moneyPrecise),
    numeric("profit", "Foyda", (r) => r.profit, f.money, (r) =>
      r.profit >= 0 ? "scale" : "kill",
    ),
    {
      id: "verdict",
      accessorFn: (r) => {
        const v = verdicts[r.id];
        return v === "kill" ? 0 : v === "scale" ? 1 : v === "watch" ? 2 : 3;
      },
      header: ({ column }) => <SortHeader column={column} label="Tavsiya" />,
      cell: ({ row }) => <VerdictBadge verdict={verdicts[row.original.id]} />,
    },
  ];
}

function LevelTable({
  rows,
  columns,
  onRowClick,
}: {
  rows: EntityRow[];
  columns: ColumnDef<EntityRow>[];
  onRowClick: (r: EntityRow) => void;
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
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((hg) => (
            <TableRow key={hg.id}>
              {hg.headers.map((h) => (
                <TableHead
                  key={h.id}
                  className={cn("whitespace-nowrap", h.column.id !== "name" && "text-right")}
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
                Ma&apos;lumot yo&apos;q.
              </TableCell>
            </TableRow>
          ) : (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                className="cursor-pointer"
                onClick={() => onRowClick(row.original)}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className={cn(cell.column.id !== "name" && "text-right")}
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
  const [activeOnly, setActiveOnly] = React.useState(false);
  const [selected, setSelected] = React.useState<EntityRow | null>(null);
  const columns = React.useMemo(
    () => buildColumns(currency, verdicts),
    [currency, verdicts],
  );

  const filter = (rows: EntityRow[]) =>
    activeOnly
      ? rows.filter((r) => (r.effectiveStatus ?? r.status) === "ACTIVE")
      : rows;

  const tabs: { value: EntityLevel; label: string; rows: EntityRow[] }[] = [
    { value: "campaign", label: "Kampaniyalar", rows: filter(campaigns) },
    { value: "adset", label: "Ad set'lar", rows: filter(adsets) },
    { value: "ad", label: "Reklamalar", rows: filter(ads) },
  ];

  return (
    <div>
      <Tabs defaultValue="campaign">
        <div className="mb-3 flex items-center justify-between gap-3">
          <TabsList>
            {tabs.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={activeOnly}
              onChange={(e) => setActiveOnly(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-input"
            />
            Faqat aktiv
          </label>
        </div>

        {tabs.map((t) => (
          <TabsContent key={t.value} value={t.value}>
            <LevelTable rows={t.rows} columns={columns} onRowClick={setSelected} />
          </TabsContent>
        ))}
      </Tabs>

      {unattributedLeads > 0 && (
        <p className="mt-3 text-xs text-muted-foreground">
          {unattributedLeads} ta lid reklamaga bog'lanmagan (jadvalga kirmaydi, lekin umumiy
          ko'rsatkichda hisobga olingan).
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
