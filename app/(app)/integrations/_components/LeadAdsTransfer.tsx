"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCrmPipelines } from "@/lib/integrations/crm-hooks";
import {
  useMetaForms,
  useLeadForms,
  useSaveLeadForm,
  type LeadForm,
} from "@/lib/integrations/leadforms-hooks";

type Props = {
  projectId: string;
  /** Meta sahifa + CRM ulangan bo'lsa true */
  ready: boolean;
};

/** Har bir forma uchun tahrirlanayotgan tanlov holati. */
type FormSelection = {
  pipelineId: string;
  stageId: string;
  isActive: boolean;
};

export function LeadAdsTransfer({ projectId, ready }: Props) {
  const forms = useMetaForms(projectId, ready);
  const leadForms = useLeadForms(projectId);
  const pipelines = useCrmPipelines(projectId, ready);
  const save = useSaveLeadForm(projectId);

  // Forma id bo'yicha tanlov holati
  const [selections, setSelections] = useState<Record<string, FormSelection>>(
    {},
  );

  const configuredByMetaId = new Map<string, LeadForm>(
    (leadForms.data?.leadForms ?? []).map((lf) => [lf.metaFormId, lf]),
  );

  function getSelection(formId: string, configured?: LeadForm): FormSelection {
    return (
      selections[formId] ?? {
        pipelineId: configured?.targetPipelineId ?? "",
        stageId: configured?.targetStageId ?? "",
        isActive: configured?.isActive ?? true,
      }
    );
  }

  function update(formId: string, patch: Partial<FormSelection>) {
    setSelections((prev) => ({
      ...prev,
      [formId]: { ...getSelection(formId, configuredByMetaId.get(formId)), ...patch },
    }));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Send className="h-4 w-4 text-primary" /> Lead Ads transfer
        </CardTitle>
        <CardDescription>
          FB Lead Ads lidlarini avtomatik CRM&apos;ga o&apos;tkazadi.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!ready ? (
          <p className="text-sm text-muted-foreground">
            Avval Meta va CRM&apos;ni ulang
          </p>
        ) : forms.isLoading || leadForms.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : forms.isError ? (
          <p className="text-sm text-muted-foreground">
            {forms.error?.message ?? "Formalarni yuklab bo'lmadi"}
          </p>
        ) : (forms.data?.forms.length ?? 0) === 0 ? (
          <p className="text-sm text-muted-foreground">
            Mavjud Lead Ads formalari topilmadi.
          </p>
        ) : (
          <div className="space-y-3">
            {forms.data?.forms.map((form) => {
              const configured = configuredByMetaId.get(form.id);
              const sel = getSelection(form.id, configured);
              const stages =
                pipelines.data?.pipelines.find((p) => p.id === sel.pipelineId)
                  ?.stages ?? [];
              const targetPipelineName = configured?.targetPipelineId
                ? (pipelines.data?.pipelines.find(
                    (p) => p.id === configured.targetPipelineId,
                  )?.name ?? configured.targetPipelineId)
                : null;

              return (
                <div
                  key={form.id}
                  className="space-y-3 rounded-lg border p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{form.name}</span>
                    {configured ? (
                      configured.isActive ? (
                        <Badge className="bg-scale text-scale-foreground hover:bg-scale">
                          Faol
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Faolsiz</Badge>
                      )
                    ) : (
                      <Badge variant="outline">Sozlanmagan</Badge>
                    )}
                  </div>

                  {configured && (
                    <p className="text-xs text-muted-foreground">
                      Joriy maqsad:{" "}
                      {targetPipelineName
                        ? targetPipelineName
                        : "pipeline tanlanmagan"}
                    </p>
                  )}

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Pipeline (voronka)</Label>
                      <Select
                        value={sel.pipelineId}
                        onValueChange={(value) =>
                          update(form.id, { pipelineId: value, stageId: "" })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Pipeline'ni tanlang" />
                        </SelectTrigger>
                        <SelectContent>
                          {pipelines.data?.pipelines.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Bosqich</Label>
                      <Select
                        value={sel.stageId}
                        onValueChange={(value) =>
                          update(form.id, { stageId: value })
                        }
                        disabled={!sel.pipelineId}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Bosqichni tanlang" />
                        </SelectTrigger>
                        <SelectContent>
                          {stages.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex items-end justify-between gap-3">
                    <div className="space-y-2">
                      <Label>Faol</Label>
                      <Select
                        value={sel.isActive ? "yes" : "no"}
                        onValueChange={(value) =>
                          update(form.id, { isActive: value === "yes" })
                        }
                      >
                        <SelectTrigger className="w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="yes">Ha</SelectItem>
                          <SelectItem value="no">Yo&apos;q</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Button
                      size="sm"
                      disabled={
                        !sel.pipelineId || !sel.stageId || save.isPending
                      }
                      onClick={() =>
                        save.mutate({
                          metaFormId: form.id,
                          formName: form.name,
                          isActive: sel.isActive,
                          targetPipelineId: sel.pipelineId,
                          targetStageId: sel.stageId,
                        })
                      }
                    >
                      {save.isPending ? "Saqlanmoqda..." : "Saqlash"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
