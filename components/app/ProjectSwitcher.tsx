"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  useProjects,
  useSetCurrentProject,
  type Project,
} from "@/lib/projects/hooks";
import { CreateProjectDialog } from "@/components/app/CreateProjectDialog";

function projectInitial(name: string) {
  const trimmed = name.trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : "?";
}

export function ProjectSwitcher() {
  const t = useTranslations();
  const tProjects = useTranslations("projects");
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data, isLoading } = useProjects();
  const setCurrent = useSetCurrentProject();
  const [createOpen, setCreateOpen] = useState(false);
  // Qaysi qator almashtirilmoqda — faqat o'shanda spinner ko'rsatamiz.
  const [switchingId, setSwitchingId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-lg border px-2 py-1.5">
        <Skeleton className="h-7 w-7 rounded-full" />
        <Skeleton className="h-4 w-28" />
      </div>
    );
  }

  const projects: Project[] = data?.projects ?? [];
  const currentProjectId = data?.currentProjectId ?? null;
  const current =
    projects.find((p) => p.id === currentProjectId) ?? projects[0] ?? null;
  const hasProjects = projects.length > 0;

  const triggerName = current?.name ?? tProjects("switcherEmptyTrigger");
  const triggerInitial = current ? projectInitial(current.name) : "+";

  function handleSwitch(projectId: string) {
    setSwitchingId(projectId);
    setCurrent.mutate(
      { projectId },
      {
        onSuccess: () => {
          // Loyihaga bog'liq keshlangan ma'lumotlar (eski mijoz raqamlari)
          // boshqa loyiha tanlanganda darhol bekor qilinsin.
          queryClient.invalidateQueries({ queryKey: ["projects"] });
          queryClient.invalidateQueries({ queryKey: ["meta"] });
          queryClient.invalidateQueries({ queryKey: ["crm"] });
          queryClient.invalidateQueries({ queryKey: ["lead-forms"] });
          // Server komponentlar yangi joriy-loyiha cookie'sini qayta o'qisin.
          router.refresh();
          toast.success(tProjects("switched"));
        },
        onSettled: () => {
          setSwitchingId(null);
        },
      },
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={tProjects("switcherLabel")}
          className={cn(
            "flex items-center gap-2 rounded-lg border bg-background px-2 py-1.5",
            "text-sm font-medium outline-none transition-colors",
            "hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring",
            "disabled:opacity-60",
          )}
          disabled={setCurrent.isPending}
        >
          <span
            aria-hidden="true"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
          >
            {triggerInitial}
          </span>
          <span
            className={cn(
              "max-w-[10rem] truncate",
              !current && "text-muted-foreground",
            )}
          >
            {triggerName}
          </span>
          {setCurrent.isPending ? (
            <Loader2
              className="h-4 w-4 shrink-0 animate-spin text-muted-foreground"
              aria-hidden="true"
            />
          ) : (
            <ChevronsUpDown
              className="h-4 w-4 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
          )}
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
            {tProjects("listLabel")}
          </DropdownMenuLabel>

          {!hasProjects ? (
            <div className="px-2 py-1.5 text-sm text-muted-foreground">
              {tProjects("emptyHint")}
            </div>
          ) : (
            projects.map((project) => {
              const isCurrent = current?.id === project.id;
              const isSwitching = switchingId === project.id;
              return (
                <DropdownMenuItem
                  key={project.id}
                  className="gap-2"
                  disabled={setCurrent.isPending}
                  onSelect={(event) => {
                    if (isCurrent || setCurrent.isPending) return;
                    event.preventDefault();
                    handleSwitch(project.id);
                  }}
                >
                  <span
                    aria-hidden="true"
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold"
                  >
                    {projectInitial(project.name)}
                  </span>
                  <span className="flex-1 truncate">{project.name}</span>
                  {isSwitching ? (
                    <Loader2
                      className="h-4 w-4 shrink-0 animate-spin text-muted-foreground"
                      aria-hidden="true"
                    />
                  ) : isCurrent ? (
                    <Check
                      className="h-4 w-4 shrink-0 text-primary"
                      aria-hidden="true"
                    />
                  ) : null}
                </DropdownMenuItem>
              );
            })
          )}

          <DropdownMenuSeparator />

          <DropdownMenuItem
            className="gap-2"
            onSelect={(event) => {
              event.preventDefault();
              setCreateOpen(true);
            }}
          >
            <span
              aria-hidden="true"
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-dashed"
            >
              <Plus className="h-3.5 w-3.5" />
            </span>
            <span>{t("nav.newProject")}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CreateProjectDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}
