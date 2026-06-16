"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export type MetaAdAccount = { id: string; name: string; currency: string };
export type MetaPage = { id: string; name: string };

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

/** Meta reklama hisoblari ro'yxati. `enabled` — Meta ulanган bo'lsa true. */
export function useMetaAdAccounts(enabled: boolean) {
  return useQuery<{ adAccounts: MetaAdAccount[] }>({
    queryKey: ["meta", "ad-accounts"],
    enabled,
    queryFn: async () => {
      const res = await fetch("/api/integrations/meta/ad-accounts");
      if (!res.ok) await parseError(res);
      return (await res.json()) as { adAccounts: MetaAdAccount[] };
    },
  });
}

/** Meta sahifalari ro'yxati. */
export function useMetaPages(enabled: boolean) {
  return useQuery<{ pages: MetaPage[] }>({
    queryKey: ["meta", "pages"],
    enabled,
    queryFn: async () => {
      const res = await fetch("/api/integrations/meta/pages");
      if (!res.ok) await parseError(res);
      return (await res.json()) as { pages: MetaPage[] };
    },
  });
}

export type SelectMetaAccountInput = {
  adAccountId: string;
  pageId?: string;
  adAccountCurrency?: string;
};

/** Loyihaga Meta reklama hisobini biriktiradi. */
export function useSelectMetaAccount(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation<{ ok: true }, Error, SelectMetaAccountInput>({
    mutationFn: async (body) => {
      const res = await fetch(`/api/projects/${projectId}/meta`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) await parseError(res);
      return (await res.json()) as { ok: true };
    },
    onSuccess: () => {
      toast.success("Meta hisobi biriktirildi");
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["meta"] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

/** Loyiha uchun Meta sinxronlashni navbatga qo'yadi. */
export function useMetaSync(projectId: string) {
  return useMutation<{ ok: true; queued: true }, Error, void>({
    mutationFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/meta/sync`, {
        method: "POST",
      });
      if (!res.ok) await parseError(res);
      return (await res.json()) as { ok: true; queued: true };
    },
    onSuccess: () => {
      toast.success("Sinxronlash boshlandi");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}
