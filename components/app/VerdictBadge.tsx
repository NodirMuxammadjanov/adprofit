import { Badge } from "@/components/ui/badge";
import type { Verdict } from "@/lib/recommendations/types";
import { cn } from "@/lib/utils";

const META: Record<Verdict, { label: string; emoji: string; cls: string }> = {
  scale: { label: "Skala", emoji: "🟢", cls: "bg-scale text-scale-foreground hover:bg-scale" },
  kill: { label: "O'chir", emoji: "🔴", cls: "bg-kill text-kill-foreground hover:bg-kill" },
  watch: { label: "Kuzat", emoji: "🟡", cls: "bg-watch text-watch-foreground hover:bg-watch" },
};

/**
 * Svetofor belgisi — rang + yozuv (faqat rangga tayanmaymiz, 04-ui-ux accessibility).
 * verdict yo'q (hisoblanmagan) → "—".
 */
export function VerdictBadge({
  verdict,
  className,
}: {
  verdict: Verdict | null | undefined;
  className?: string;
}) {
  if (!verdict) {
    return <span className={cn("text-xs text-muted-foreground", className)}>—</span>;
  }
  const m = META[verdict];
  return <Badge className={cn("border-transparent", m.cls, className)}>{m.label}</Badge>;
}

export function verdictEmoji(verdict: Verdict): string {
  return META[verdict].emoji;
}

export function verdictLabel(verdict: Verdict): string {
  return META[verdict].label;
}
