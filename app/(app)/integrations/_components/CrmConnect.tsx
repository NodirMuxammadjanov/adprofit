"use client";

import { useState } from "react";
import { RefreshCw, Plug, AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  useCrmPipelines,
  useCrmConfig,
  useCrmSync,
} from "@/lib/integrations/crm-hooks";
import type { ConnectionStatus } from "@/lib/meta/connection";

type Props = {
  projectId: string;
  /** CRM OAuth grant mavjud (token bor) */
  connected: boolean;
  /** Loyiha uchun pipeline/bosqichlar sozlangan */
  configured: boolean;
  /** Ulanish holati: token muddati bo'yicha (active | expired). Ulanish yo'q → null. */
  status: ConnectionStatus | null;
  provider?: string | null;
  /** Oxirgi sinxronlash vaqti (epoch ms) yoki null */
  lastSyncedAt?: number | null;
};

/** Ulangan provayder uchun OAuth connect URL'i (qayta ulash uchun ham). */
function connectUrl(provider: string) {
  return `/api/integrations/crm/${provider}/connect`;
}

export function CrmConnect({
  projectId,
  connected,
  configured,
  status,
  provider,
  lastSyncedAt,
}: Props) {
  const t = useTranslations("integrations");
  const tc = useTranslations("common");
  const expired = status === "expired";
  // Ulangan provayder (yo'q bo'lsa bitrix24 birlamchi tanlov).
  const activeProvider = provider ?? "bitrix24";
  const providerLabel =
    activeProvider === "amocrm"
      ? t("crm.providerAmocrm")
      : t("crm.providerBitrix24");

  const pipelines = useCrmPipelines(
    projectId,
    connected && !configured && !expired,
  );
  const config = useCrmConfig(projectId);
  const sync = useCrmSync(projectId);

  const [pipelineId, setPipelineId] = useState<string>("");
  const [qualifiedStageId, setQualifiedStageId] = useState<string>("");
  const [wonStageId, setWonStageId] = useState<string>("");

  const stages =
    pipelines.data?.pipelines.find((p) => p.id === pipelineId)?.stages ?? [];

  function onPipelineChange(value: string) {
    setPipelineId(value);
    // Pipeline o'zgarsa bosqich tanlovlari tozalanadi
    setQualifiedStageId("");
    setWonStageId("");
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <Plug className="h-4 w-4 text-primary" />{" "}
          {connected ? `${t("crm.cardTitle")} — ${providerLabel}` : t("crm.cardTitle")}
        </CardTitle>
        {expired ? (
          <Badge className="bg-kill text-kill-foreground hover:bg-kill">
            {t("status.expired")}
          </Badge>
        ) : configured ? (
          <Badge className="bg-scale text-scale-foreground hover:bg-scale">
            {t("status.configured")}
          </Badge>
        ) : connected ? (
          <Badge variant="secondary">{t("status.notConfigured")}</Badge>
        ) : (
          <Badge variant="outline">{t("status.notConnected")}</Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Holat 0: token muddati tugagan — qayta ulash birinchi */}
        {expired && (
          <div className="space-y-3">
            <div className="flex items-start gap-2 text-sm text-foreground">
              <AlertTriangle
                className="mt-0.5 h-4 w-4 shrink-0 text-kill"
                aria-hidden="true"
              />
              <span>{t("crm.expiredHint")}</span>
            </div>
            <Button
              asChild
              className="bg-kill text-kill-foreground hover:bg-kill/90"
            >
              <a href={connectUrl(activeProvider)}>{t("reconnect")}</a>
            </Button>
          </div>
        )}

        {/* Holat 1: umuman ulanmagan */}
        {!connected && !expired && (
          <>
            <p className="text-sm text-muted-foreground">
              {t("crm.connectIntro", { provider: t("crm.providerBitrix24") })}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button asChild>
                <a href={connectUrl("bitrix24")}>
                  {t("crm.connect", { provider: t("crm.providerBitrix24") })}
                </a>
              </Button>
              <span className="text-sm text-muted-foreground">
                {t("crm.amocrmSoon")}
              </span>
            </div>
          </>
        )}

        {/* Holat 2: ulangan, lekin sozlanmagan */}
        {connected && !configured && !expired && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="crm-pipeline">{t("crm.pipelineLabel")}</Label>
              {pipelines.isLoading ? (
                <Skeleton className="h-9 w-full" />
              ) : pipelines.isError ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    {pipelines.error?.message ?? t("loadError.pipelines")}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => pipelines.refetch()}
                  >
                    <RefreshCw className="mr-2 h-3.5 w-3.5" />
                    {tc("retry")}
                  </Button>
                </div>
              ) : (
                <Select value={pipelineId} onValueChange={onPipelineChange}>
                  <SelectTrigger id="crm-pipeline">
                    <SelectValue placeholder={t("crm.pipelinePlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {pipelines.data?.pipelines.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="crm-qualified-stage">
                {t("crm.qualifiedStageLabel")}
              </Label>
              <Select
                value={qualifiedStageId}
                onValueChange={setQualifiedStageId}
                disabled={!pipelineId}
              >
                <SelectTrigger id="crm-qualified-stage">
                  <SelectValue placeholder={t("crm.stagePlaceholder")} />
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

            <div className="space-y-2">
              <Label htmlFor="crm-won-stage">{t("crm.wonStageLabel")}</Label>
              <Select
                value={wonStageId}
                onValueChange={setWonStageId}
                disabled={!pipelineId}
              >
                <SelectTrigger id="crm-won-stage">
                  <SelectValue placeholder={t("crm.stagePlaceholder")} />
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

            <Button
              disabled={
                !pipelineId ||
                !qualifiedStageId ||
                !wonStageId ||
                config.isPending
              }
              onClick={() =>
                config.mutate({
                  pipelineId,
                  qualifiedStageId,
                  wonStageId,
                })
              }
            >
              {config.isPending ? tc("loading") : tc("save")}
            </Button>
          </div>
        )}

        {/* Holat 3: sozlangan */}
        {connected && configured && !expired && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {t("crm.configuredHint")}
              </p>
              <Button
                variant="outline"
                size="sm"
                disabled={sync.isPending}
                onClick={() => sync.mutate()}
              >
                <RefreshCw className="mr-2 h-3.5 w-3.5" />
                {t("crm.syncNow")}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {lastSyncedAt
                ? t("lastSynced", {
                    time: new Date(lastSyncedAt).toLocaleString(),
                  })
                : t("neverSynced")}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
