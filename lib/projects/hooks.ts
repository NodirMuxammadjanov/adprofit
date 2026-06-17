"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export type Project = {
  id: string;
  name: string;
  currency: string | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
};

export type ProjectsResponse = {
  projects: Project[];
  currentProjectId: string | null;
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

export function useProjects() {
  return useQuery<ProjectsResponse>({
    queryKey: ["projects"],
    queryFn: async () => {
      const res = await fetch("/api/projects");
      if (!res.ok) await parseError(res);
      return (await res.json()) as ProjectsResponse;
    },
    // Joriy-loyiha holati tez eskirsin (almashganda eski mijoz ko'rinmasin).
    // Agressiv yangilik faqat shu yengil so'rovga tegishli — og'irroq integratsiya
    // so'rovlari (meta/crm/lead-forms) global standart staleTime'dan foydalanadi.
    staleTime: 5_000,
    refetchOnWindowFocus: true,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation<
    { project: Project },
    Error,
    { name: string; currency?: string }
  >({
    mutationFn: async (body) => {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) await parseError(res);
      return (await res.json()) as { project: Project };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Loyiha yaratildi");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useSetCurrentProject() {
  const queryClient = useQueryClient();

  return useMutation<{ ok: true }, Error, { projectId: string }>({
    mutationFn: async (body) => {
      const res = await fetch("/api/projects/current", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) await parseError(res);
      return (await res.json()) as { ok: true };
    },
    onSuccess: () => {
      // Joriy-loyiha ro'yxatini bekor qilamiz; server komponentlarni qayta
      // yangilash (router.refresh) va boshqa keshlarni bekor qilish chaqiruvchida
      // (ProjectSwitcher) bajariladi — bu yerda to'liq sahifa qayta yuklanmaydi.
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}
