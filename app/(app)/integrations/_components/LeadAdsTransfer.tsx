"use client";

import { useState } from "react";
import { Send, ChevronDown, ChevronRight, Info, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
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
import { cn } from "@/lib/utils";
import { useCrmPipelines } from "@/lib/integrations/crm-hooks";
import {
  useMetaForms,
  useLeadForms,
  useSaveLeadForm,
  type LeadForm,
} from "@/lib/integrations/leadforms-hooks";

type Props = {
  projectId: string;
  /** Meta sahifa + CRM ulangan/aktiv bo'lsa true */
  ready: boolean;
  /** Loyihaga FB Page biriktirilganmi (prerekvizit nomini ko'rsatish uchun) */
  hasMetaPage: boolean;
  /** CRM pipeline/bosqichlari sozlanganmi (prerekvizit nomini ko'rsatish uchun) */
  crmConfigured: boolean;
};

/** Har bir forma uchun tahrirlanayotgan tanlov holati. */
type FormSelection = {
  pipelineId: string;
  stageId: string;
  isActive: boolean;
  /** FB maydon kaliti → CRM maydon kaliti ("" = o'tkazib yuborilsin) */
  fieldMapping: Record<string, string>;
};

/**
 * FB Lead Ads formaning maydon sxemasi mavjud endpoint'lardan tortilmaydi
 * (meta/forms faqat id+name qaytaradi). Shuning uchun standart maydonlar
 * (full_name, phone, email) bo'yicha bazaviy moslik ko'rsatamiz.
 */
const FB_BASELINE_FIELDS = ["full_name", "phone", "email"] as const;
type FbField = (typeof FB_BASELINE_FIELDS)[number];

/** Tanlanadigan CRM standart maydonlari. */
const CRM_FIELDS = ["name", "phone", "email"] as const;

/** Avtomatik moslik: FB standart maydoni → CRM standart maydoni. */
const AUTO_MATCH: Record<FbField, string> = {
  full_name: "name",
  phone: "phone",
  email: "email",
};

export function LeadAdsTransfer({
  projectId,
  ready,
  hasMetaPage,
  crmConfigured,
}: Props) {
  const t = useTranslations("integrations");
  const tc = useTranslations("common");
  const forms = useMetaForms(projectId, ready);
  const leadForms = useLeadForms(projectId);
  const pipelines = useCrmPipelines(projectId, ready);
  const save = useSaveLeadForm(projectId);

  // Forma id bo'yicha tanlov holati
  const [selections, setSelections] = useState<Record<string, FormSelection>>(
    {},
  );
  // Qaysi forma satri yoyilgan (mapping jadvali ko'rinadi)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const configuredByMetaId = new Map<string, LeadForm>(
    (leadForms.data?.leadForms ?? []).map((lf) => [lf.metaFormId, lf]),
  );

  function defaultMapping(configured?: LeadForm): Record<string, string> {
    if (configured?.fieldMapping) return { ...configured.fieldMapping };
    return { ...AUTO_MATCH };
  }

  function getSelection(formId: string, configured?: LeadForm): FormSelection {
    return (
      selections[formId] ?? {
        pipelineId: configured?.targetPipelineId ?? "",
        stageId: configured?.targetStageId ?? "",
        isActive: configured?.isActive ?? true,
        fieldMapping: defaultMapping(configured),
      }
    );
  }

  function update(formId: string, patch: Partial<FormSelection>) {
    setSelections((prev) => ({
      ...prev,
      [formId]: {
        ...getSelection(formId, configuredByMetaId.get(formId)),
        ...patch,
      },
    }));
  }

  function toggleExpanded(formId: string) {
    setExpanded((prev) => ({ ...prev, [formId]: !prev[formId] }));
  }

  function crmFieldLabel(field: string): string {
    if (field === "name") return t("leadAds.mapping.crmName");
    if (field === "phone") return t("leadAds.mapping.crmPhone");
    if (field === "email") return t("leadAds.mapping.crmEmail");
    return field;
  }

  function fbFieldLabel(field: FbField): string {
    if (field === "full_name") return t("leadAds.mapping.fbFullName");
    if (field === "phone") return t("leadAds.mapping.fbPhone");
    return t("leadAds.mapping.fbEmail");
  }

  // Prerekvizit yetishmasa — qaysi qadam kerakligini aniq nomlaymiz.
  const notReadyMessage = !hasMetaPage && !crmConfigured
    ? t("leadAds.notReadyBoth")
    : !hasMetaPage
      ? t("leadAds.notReadyMetaPage")
      : t("leadAds.notReadyCrm");

  return (
    <Card className={cn(!ready && "opacity-60")}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Send className="h-4 w-4 text-primary" /> {t("leadAds.cardTitle")}
        </CardTitle>
        <CardDescription>{t("leadAds.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!ready ? (
          <p className="text-sm text-muted-foreground">{notReadyMessage}</p>
        ) : forms.isLoading || leadForms.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : forms.isError ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {forms.error?.message ?? t("loadError.forms")}
            </p>
            <Button variant="outline" size="sm" onClick={() => forms.refetch()}>
              <RefreshCw className="mr-2 h-3.5 w-3.5" />
              {tc("retry")}
            </Button>
          </div>
        ) : (forms.data?.forms.length ?? 0) === 0 ? (
          <p className="text-sm text-muted-foreground">{t("leadAds.noForms")}</p>
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
              const isOpen = expanded[form.id] ?? false;

              return (
                <div key={form.id} className="space-y-3 rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => toggleExpanded(form.id)}
                      aria-expanded={isOpen}
                      className="flex items-center gap-1.5 text-sm font-medium hover:text-primary"
                    >
                      {isOpen ? (
                        <ChevronDown className="h-4 w-4 shrink-0" aria-hidden="true" />
                      ) : (
                        <ChevronRight className="h-4 w-4 shrink-0" aria-hidden="true" />
                      )}
                      {form.name}
                    </button>
                    {configured ? (
                      configured.isActive ? (
                        <Badge className="bg-scale text-scale-foreground hover:bg-scale">
                          {t("status.active")}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">{t("status.inactive")}</Badge>
                      )
                    ) : (
                      <Badge variant="outline">{t("status.notSet")}</Badge>
                    )}
                  </div>

                  {configured && (
                    <p className="text-xs text-muted-foreground">
                      {t("leadAds.currentTarget")}{" "}
                      {targetPipelineName
                        ? targetPipelineName
                        : t("leadAds.noPipelineSelected")}
                    </p>
                  )}

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor={`leadform-pipeline-${form.id}`}>
                        {t("leadAds.pipelineLabel")}
                      </Label>
                      <Select
                        value={sel.pipelineId}
                        onValueChange={(value) =>
                          update(form.id, { pipelineId: value, stageId: "" })
                        }
                      >
                        <SelectTrigger id={`leadform-pipeline-${form.id}`}>
                          <SelectValue
                            placeholder={t("leadAds.pipelinePlaceholder")}
                          />
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
                      <Label htmlFor={`leadform-stage-${form.id}`}>
                        {t("leadAds.stageLabel")}
                      </Label>
                      <Select
                        value={sel.stageId}
                        onValueChange={(value) =>
                          update(form.id, { stageId: value })
                        }
                        disabled={!sel.pipelineId}
                      >
                        <SelectTrigger id={`leadform-stage-${form.id}`}>
                          <SelectValue
                            placeholder={t("leadAds.stagePlaceholder")}
                          />
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

                  {/* Maydon moslashtirish jadvali — satr yoyilganda */}
                  {isOpen && (
                    <div className="space-y-2 rounded-md border bg-muted/40 p-3">
                      <p className="text-sm font-medium">
                        {t("leadAds.mapping.title")}
                      </p>
                      <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                        <Info
                          className="mt-0.5 h-3.5 w-3.5 shrink-0"
                          aria-hidden="true"
                        />
                        <span>{t("leadAds.mapping.baselineNote")}</span>
                      </p>
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-3 text-xs font-medium text-muted-foreground">
                          <span>{t("leadAds.mapping.fbFieldHeader")}</span>
                          <span>{t("leadAds.mapping.crmFieldHeader")}</span>
                        </div>
                        {FB_BASELINE_FIELDS.map((fb) => {
                          const value = sel.fieldMapping[fb] ?? "";
                          const triggerId = `leadform-map-${form.id}-${fb}`;
                          return (
                            <div
                              key={fb}
                              className="grid grid-cols-2 items-center gap-3"
                            >
                              <Label
                                htmlFor={triggerId}
                                className="text-sm font-normal"
                              >
                                {fbFieldLabel(fb)}
                              </Label>
                              <Select
                                value={value === "" ? "__skip__" : value}
                                onValueChange={(next) =>
                                  update(form.id, {
                                    fieldMapping: {
                                      ...sel.fieldMapping,
                                      [fb]: next === "__skip__" ? "" : next,
                                    },
                                  })
                                }
                              >
                                <SelectTrigger id={triggerId}>
                                  <SelectValue
                                    placeholder={t(
                                      "leadAds.mapping.crmFieldPlaceholder",
                                    )}
                                  />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__skip__">
                                    {t("leadAds.mapping.skip")}
                                  </SelectItem>
                                  {CRM_FIELDS.map((crmField) => (
                                    <SelectItem key={crmField} value={crmField}>
                                      {crmFieldLabel(crmField)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="flex items-end justify-between gap-3">
                    <div className="space-y-2">
                      <Label htmlFor={`leadform-active-${form.id}`}>
                        {t("leadAds.activeLabel")}
                      </Label>
                      <Select
                        value={sel.isActive ? "yes" : "no"}
                        onValueChange={(value) =>
                          update(form.id, { isActive: value === "yes" })
                        }
                      >
                        <SelectTrigger
                          id={`leadform-active-${form.id}`}
                          className="w-28"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="yes">{t("leadAds.yes")}</SelectItem>
                          <SelectItem value="no">{t("leadAds.no")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Button
                      size="sm"
                      disabled={
                        !sel.pipelineId || !sel.stageId || save.isPending
                      }
                      onClick={() => {
                        // Bo'sh ("o'tkazib yuborilsin") moslamalarni saqlamaymiz.
                        const mapping = Object.fromEntries(
                          Object.entries(sel.fieldMapping).filter(
                            ([, v]) => v !== "",
                          ),
                        );
                        save.mutate({
                          metaFormId: form.id,
                          formName: form.name,
                          isActive: sel.isActive,
                          targetPipelineId: sel.pipelineId,
                          targetStageId: sel.stageId,
                          fieldMapping: mapping,
                        });
                      }}
                    >
                      {save.isPending ? tc("loading") : tc("save")}
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
