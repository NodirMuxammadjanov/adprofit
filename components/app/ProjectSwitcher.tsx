"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";

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
  const { data, isLoading } = useProjects();
  const setCurrent = useSetCurrentProject();
  const [createOpen, setCreateOpen] = useState(false);

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

  const triggerName = current?.name ?? "Loyiha tanlang";
  const triggerInitial = current ? projectInitial(current.name) : "+";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            "flex items-center gap-2 rounded-lg border bg-background px-2 py-1.5",
            "text-sm font-medium outline-none transition-colors",
            "hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring",
            "disabled:opacity-60"
          )}
          disabled={setCurrent.isPending}
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
            {triggerInitial}
          </span>
          <span className="max-w-[10rem] truncate">{triggerName}</span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
            Loyihalar
          </DropdownMenuLabel>

          {projects.length === 0 ? (
            <div className="px-2 py-1.5 text-sm text-muted-foreground">
              Hozircha loyiha yo&apos;q
            </div>
          ) : (
            projects.map((project) => {
              const isCurrent = current?.id === project.id;
              return (
                <DropdownMenuItem
                  key={project.id}
                  className="gap-2"
                  onSelect={(event) => {
                    if (isCurrent) return;
                    event.preventDefault();
                    setCurrent.mutate({ projectId: project.id });
                  }}
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold">
                    {projectInitial(project.name)}
                  </span>
                  <span className="flex-1 truncate">{project.name}</span>
                  {isCurrent ? (
                    <Check className="h-4 w-4 shrink-0 text-primary" />
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
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-dashed">
              <Plus className="h-3.5 w-3.5" />
            </span>
            <span>Yangi loyiha</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CreateProjectDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}
