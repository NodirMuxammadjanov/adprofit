"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

export type MetaForm = { id: string; name: string };

export type LeadForm = {
  id: string;
  metaFormId: string;
  formName: string | null;
  isActive: boolean;
  targetPipelineId: string | null;
  targetStageId: string | null;
  fieldMapping: Record<string, string> | null;
};

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

/** Meta Lead Ads formalari ro'yxati. `enabled` — Meta sahifa ulangan bo'lsa true. */
export function useMetaForms(projectId: string, enabled: boolean) {
  return useQuery<{ forms: MetaForm[] }>({
    queryKey: ["meta", "forms", projectId],
    enabled,
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/meta/forms`);
      if (!res.ok) await parseError(res);
      return (await res.json()) as { forms: MetaForm[] };
    },
  });
}

/** Loyiha uchun sozlangan lead formalar. */
export function useLeadForms(projectId: string) {
  return useQuery<{ leadForms: LeadForm[] }>({
    queryKey: ["lead-forms", projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/lead-forms`);
      if (!res.ok) await parseError(res);
      return (await res.json()) as { leadForms: LeadForm[] };
    },
  });
}

export type SaveLeadFormInput = {
  metaFormId: string;
  formName?: string;
  isActive?: boolean;
  fieldMapping?: Record<string, string>;
  targetPipelineId?: string;
  targetStageId?: string;
};

/** Lead formani saqlaydi (yangi yaratadi yoki yangilaydi). */
export function useSaveLeadForm(projectId: string) {
  const queryClient = useQueryClient();
  const t = useTranslations("integrations");

  return useMutation<{ leadForm: LeadForm }, Error, SaveLeadFormInput>({
    mutationFn: async (body) => {
      const res = await fetch(`/api/projects/${projectId}/lead-forms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) await parseError(res);
      return (await res.json()) as { leadForm: LeadForm };
    },
    onSuccess: () => {
      toast.success(t("toast.leadFormSaved"));
      queryClient.invalidateQueries({ queryKey: ["lead-forms", projectId] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}
