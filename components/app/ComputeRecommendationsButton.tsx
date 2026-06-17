"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type Summary = { total: number; scale: number; kill: number; watch: number };

/** Svetofor tavsiyalarini qayta hisoblash tugmasi (inline compute + sahifani yangilash). */
export function ComputeRecommendationsButton({ projectId }: { projectId: string }) {
  const router = useRouter();
  const t = useTranslations("recommendations");
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/recommendations/compute`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? t("computeError"));
      }
      const { summary } = (await res.json()) as { summary: Summary };
      toast.success(
        t("computed", {
          scale: summary.scale,
          kill: summary.kill,
          watch: summary.watch,
        }),
      );
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("computeError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button onClick={run} disabled={loading} variant="outline" size="sm">
      {loading ? (
        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
      ) : (
        <Sparkles className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
      )}
      {loading ? t("computing") : t("recompute")}
    </Button>
  );
}
