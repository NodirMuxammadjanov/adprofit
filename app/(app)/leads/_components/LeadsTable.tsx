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

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { makeFormatters } from "@/lib/metrics/format";
import { cn } from "@/lib/utils";

export type LeadListItem = {
  id: string;
  name: string;
  phone: string;
  ad: string;
  status: string | null;
  isQualified: boolean;
  isWon: boolean;
  revenue: number | null;
  transferStatus: string;
  date: string;
};

type LeadFilter = "all" | "qualified" | "won" | "untransferred";

const FILTERS: { key: LeadFilter; label: string }[] = [
  { key: "all", label: "Hammasi" },
  { key: "qualified", label: "Sifatli" },
  { key: "won", label: "Sotuv" },
  { key: "untransferred", label: "O'tkazilmagan" },
];

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

function StatusBadge({ item }: { item: LeadListItem }) {
  if (item.isWon)
    return (
      <Badge className="border-transparent bg-scale text-scale-foreground">Sotuv</Badge>
    );
  if (item.isQualified) return <Badge variant="outline">Sifatli</Badge>;
  return <Badge variant="secondary">Yangi</Badge>;
}

function TransferBadge({ status }: { status: string }) {
  if (status === "transferred")
    return <span className="text-xs font-medium text-scale">✓ O&apos;tkazildi</span>;
  if (status === "failed")
    return <Badge variant="destructive">Xato</Badge>;
  return <Badge variant="secondary">Kutilmoqda</Badge>;
}

export function LeadsTable({
  items,
  currency,
}: {
  items: LeadListItem[];
  currency: string;
}) {
  const f = makeFormatters(currency);
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
      if (q && !`${it.name} ${it.phone}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [items, query, filter]);

  const columns = React.useMemo<ColumnDef<LeadListItem>[]>(
    () => [
      {
        id: "name",
        accessorFn: (r) => r.name,
        header: ({ column }) => <SortHeader column={column} label="Ism" />,
        cell: ({ row }) => (
          <div>
            <div className="font-medium">{row.original.name}</div>
            <div className="text-xs tabular-nums text-muted-foreground">
              {row.original.phone}
            </div>
          </div>
        ),
      },
      {
        id: "ad",
        accessorFn: (r) => r.ad,
        header: ({ column }) => <SortHeader column={column} label="Reklama" />,
        cell: ({ row }) => (
          <span className="max-w-[200px] truncate">{row.original.ad}</span>
        ),
      },
      {
        id: "status",
        accessorFn: (r) => (r.isWon ? 2 : r.isQualified ? 1 : 0),
        header: ({ column }) => <SortHeader column={column} label="Holat" />,
        cell: ({ row }) => <StatusBadge item={row.original} />,
      },
      {
        id: "revenue",
        accessorFn: (r) => (r.revenue == null ? Number.NEGATIVE_INFINITY : r.revenue),
        header: ({ column }) => <SortHeader column={column} label="Daromad" />,
        cell: ({ row }) => (
          <span className="tabular-nums">{f.money(row.original.revenue)}</span>
        ),
      },
      {
        id: "transfer",
        accessorFn: (r) => r.transferStatus,
        header: ({ column }) => <SortHeader column={column} label="Transfer" />,
        cell: ({ row }) => <TransferBadge status={row.original.transferStatus} />,
      },
      {
        id: "date",
        accessorFn: (r) => r.date,
        header: ({ column }) => <SortHeader column={column} label="Sana" />,
        cell: ({ row }) => (
          <span className="tabular-nums text-muted-foreground">{row.original.date}</span>
        ),
      },
    ],
    [f],
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

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Input
          placeholder="Ism yoki telefon bo'yicha qidirish..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-xs"
        />
        <div className="inline-flex items-center rounded-lg border bg-muted p-1">
          {FILTERS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setFilter(opt.key)}
              className={cn(
                "rounded-md px-3 py-1 text-sm font-medium transition-colors",
                filter === opt.key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((h) => (
                  <TableHead
                    key={h.id}
                    className={cn(
                      "whitespace-nowrap",
                      numericCols.has(h.column.id) && "text-right",
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
                  Lid topilmadi.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={cn(numericCols.has(cell.column.id) && "text-right")}
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

      <p className="text-xs text-muted-foreground">{data.length} ta lid ko&apos;rsatilmoqda.</p>
    </div>
  );
}
