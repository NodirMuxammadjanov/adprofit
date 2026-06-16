"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { RANGE_OPTIONS, type RangeKey } from "@/lib/metrics/range";
import { cn } from "@/lib/utils";

/** Sana oralig'i preset tugmalari — ?range= ni yangilaydi (server qayta render qiladi). */
export function DateRangePicker({ active }: { active: RangeKey }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function select(key: RangeKey) {
    const next = new URLSearchParams(params.toString());
    next.set("range", key);
    router.push(`${pathname}?${next.toString()}`);
  }

  return (
    <div className="inline-flex items-center rounded-lg border bg-muted p-1">
      {RANGE_OPTIONS.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => select(o.key)}
          className={cn(
            "rounded-md px-3 py-1 text-sm font-medium transition-colors",
            active === o.key
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
