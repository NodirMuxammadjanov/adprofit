"use client";

import { useState } from "react";
import { RefreshCw, Plug } from "lucide-react";
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

type Props = {
  projectId: string;
  /** CRM OAuth grant mavjud (token bor) */
  connected: boolean;
  /** Loyiha uchun pipeline/bosqichlar sozlangan */
  configured: boolean;
  provider?: string | null;
};

export function CrmConnect({ projectId, connected, configured }: Props) {
  const pipelines = useCrmPipelines(projectId, connected && !configured);
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
          <Plug className="h-4 w-4 text-primary" /> CRM (Bitrix24)
        </CardTitle>
        {configured ? (
          <Badge className="bg-scale text-scale-foreground hover:bg-scale">
            Sozlangan
          </Badge>
        ) : connected ? (
          <Badge variant="secondary">Sozlanmagan</Badge>
        ) : (
          <Badge variant="outline">Ulanmagan</Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Holat 1: umuman ulanmagan */}
        {!connected && (
          <>
            <p className="text-sm text-muted-foreground">
              Bitrix24 hisobingizni ulang — lid va bitim statuslari tortiladi.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() =>
                  (window.location.href =
                    "/api/integrations/crm/bitrix24/connect")
                }
              >
                Bitrix24&apos;ni ulash
              </Button>
              <Button variant="secondary" disabled>
                amoCRM (tez orada)
              </Button>
            </div>
          </>
        )}

        {/* Holat 2: ulangan, lekin sozlanmagan */}
        {connected && !configured && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Pipeline (voronka)</Label>
              {pipelines.isLoading ? (
                <Skeleton className="h-9 w-full" />
              ) : (
                <Select value={pipelineId} onValueChange={onPipelineChange}>
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
              )}
            </div>

            <div className="space-y-2">
              <Label>Sifatli lid bosqichi</Label>
              <Select
                value={qualifiedStageId}
                onValueChange={setQualifiedStageId}
                disabled={!pipelineId}
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

            <div className="space-y-2">
              <Label>Yutuq (won) bosqichi</Label>
              <Select
                value={wonStageId}
                onValueChange={setWonStageId}
                disabled={!pipelineId}
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
              {config.isPending ? "Saqlanmoqda..." : "Saqlash"}
            </Button>
          </div>
        )}

        {/* Holat 3: sozlangan */}
        {connected && configured && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              CRM sozlangan — lid va bitimlar avtomatik tortiladi.
            </p>
            <Button
              variant="outline"
              size="sm"
              disabled={sync.isPending}
              onClick={() => sync.mutate()}
            >
              <RefreshCw className="mr-2 h-3.5 w-3.5" />
              CRM sinxronla
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
