"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type Summary = { total: number; scale: number; kill: number; watch: number };

/** Svetofor tavsiyalarini qayta hisoblash tugmasi (inline compute + sahifani yangilash). */
export function ComputeRecommendationsButton({
  projectId,
  label = "Tavsiyalarni hisoblash",
}: {
  projectId: string;
  label?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/recommendations/compute`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Hisoblashda xatolik");
      }
      const { summary } = (await res.json()) as { summary: Summary };
      toast.success(
        `Hisoblandi: 🟢 ${summary.scale} · 🔴 ${summary.kill} · 🟡 ${summary.watch}`,
      );
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Xatolik");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button onClick={run} disabled={loading} variant="outline" size="sm">
      <Sparkles className="mr-2 h-3.5 w-3.5" />
      {loading ? "Hisoblanmoqda..." : label}
    </Button>
  );
}
