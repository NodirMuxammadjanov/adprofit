"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export type CrmStage = { id: string; name: string };
export type CrmPipeline = { id: string; name: string; stages: CrmStage[] };

async function parseError(res: Response): Promise<never> {
  let message = "So'rovda xatolik yuz berdi";
  try {
    const data = (await res.json()) as { error?: string };
    if (data?.error) message = data.error;
  } catch {
    // javobni o'qib bo'lmadi — standart xabardan foydalanamiz
  }
  throw new Error(message);
}

/** CRM pipeline'lari va bosqichlari. `enabled` — CRM ulangan bo'lsa true. */
export function useCrmPipelines(projectId: string, enabled: boolean) {
  return useQuery<{ pipelines: CrmPipeline[] }>({
    queryKey: ["crm", "pipelines", projectId],
    enabled,
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/crm/pipelines`);
      if (!res.ok) await parseError(res);
      return (await res.json()) as { pipelines: CrmPipeline[] };
    },
  });
}

export type CrmConfigInput = {
  pipelineId: string;
  qualifiedStageId: string;
  wonStageId: string;
  revenueField?: string;
};

/** Loyiha uchun CRM pipeline va bosqichlarini sozlaydi. */
export function useCrmConfig(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation<{ ok: true }, Error, CrmConfigInput>({
    mutationFn: async (body) => {
      const res = await fetch(`/api/projects/${projectId}/crm/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) await parseError(res);
      return (await res.json()) as { ok: true };
    },
    onSuccess: () => {
      toast.success("CRM sozlandi");
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["crm"] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

/** Loyiha uchun CRM sinxronlashni navbatga qo'yadi. */
export function useCrmSync(projectId: string) {
  return useMutation<{ ok: true; queued: true }, Error, void>({
    mutationFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/crm/sync`, {
        method: "POST",
      });
      if (!res.ok) await parseError(res);
      return (await res.json()) as { ok: true; queued: true };
    },
    onSuccess: () => {
      toast.success("CRM sinxronlash boshlandi");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}
