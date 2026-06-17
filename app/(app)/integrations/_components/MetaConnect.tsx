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
  useMetaAdAccounts,
  useMetaPages,
  useSelectMetaAccount,
  useMetaSync,
} from "@/lib/integrations/meta-hooks";
import type { ConnectionStatus } from "@/lib/meta/connection";

type Props = {
  projectId: string;
  /** Meta OAuth grant mavjud (token bor) */
  hasConnection: boolean;
  /** Ulanish holati: token muddati bo'yicha (active | expired). Ulanish yo'q → null. */
  status: ConnectionStatus | null;
  /** Loyihaga ad account biriktirilgan */
  adAccountId?: string | null;
  /** Loyihaga FB Page biriktirilgan (Lead Ads uchun shart) */
  pageId?: string | null;
  /** Oxirgi sinxronlash vaqti (epoch ms) yoki null */
  lastSyncedAt?: number | null;
};

const CONNECT_URL = "/api/integrations/meta/connect";

export function MetaConnect({
  projectId,
  hasConnection,
  status,
  adAccountId,
  pageId,
  lastSyncedAt,
}: Props) {
  const t = useTranslations("integrations");
  const tc = useTranslations("common");
  const bound = Boolean(adAccountId);
  const expired = status === "expired";
  // Token muddati tugagan bo'lsa, ro'yxat so'rovlarini yangidan yuklamaymiz —
  // qayta ulash birinchi qadam.
  const accounts = useMetaAdAccounts(hasConnection && !bound && !expired);
  const pages = useMetaPages(hasConnection && !bound && !expired);
  const select = useSelectMetaAccount(projectId);
  const sync = useMetaSync(projectId);

  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [selectedPage, setSelectedPage] = useState<string>("");

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <Plug className="h-4 w-4 text-primary" /> {t("meta.cardTitle")}
        </CardTitle>
        {expired ? (
          <Badge className="bg-kill text-kill-foreground hover:bg-kill">
            {t("status.expired")}
          </Badge>
        ) : bound ? (
          <Badge className="bg-scale text-scale-foreground hover:bg-scale">
            {t("status.connected")}
          </Badge>
        ) : hasConnection ? (
          <Badge variant="secondary">{t("status.accountNotSelected")}</Badge>
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
              <span>{t("meta.expiredHint")}</span>
            </div>
            <Button asChild className="bg-kill text-kill-foreground hover:bg-kill/90">
              <a href={CONNECT_URL}>{t("reconnect")}</a>
            </Button>
          </div>
        )}

        {/* Holat 1: umuman ulanmagan */}
        {!hasConnection && !expired && (
          <>
            <p className="text-sm text-muted-foreground">
              {t("meta.connectIntro")}
            </p>
            <Button asChild>
              <a href={CONNECT_URL}>{t("meta.connect")}</a>
            </Button>
          </>
        )}

        {/* Holat 2: ulangan, lekin ad account tanlanmagan */}
        {hasConnection && !bound && !expired && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="meta-ad-account">{t("meta.adAccountLabel")}</Label>
              {accounts.isLoading ? (
                <Skeleton className="h-9 w-full" />
              ) : accounts.isError ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    {accounts.error?.message ?? t("loadError.adAccounts")}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => accounts.refetch()}
                  >
                    <RefreshCw className="mr-2 h-3.5 w-3.5" />
                    {tc("retry")}
                  </Button>
                </div>
              ) : (
                <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                  <SelectTrigger id="meta-ad-account">
                    <SelectValue placeholder={t("meta.adAccountPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.data?.adAccounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name} ({a.currency})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="meta-page">{t("meta.pageLabel")}</Label>
              {pages.isLoading ? (
                <Skeleton className="h-9 w-full" />
              ) : pages.isError ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    {pages.error?.message ?? t("loadError.pages")}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => pages.refetch()}
                  >
                    <RefreshCw className="mr-2 h-3.5 w-3.5" />
                    {tc("retry")}
                  </Button>
                </div>
              ) : (
                <Select value={selectedPage} onValueChange={setSelectedPage}>
                  <SelectTrigger id="meta-page">
                    <SelectValue placeholder={t("meta.pagePlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {pages.data?.pages.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <p className="text-xs text-muted-foreground">
                {t("meta.pageRequiredHint")}
              </p>
            </div>

            <Button
              disabled={!selectedAccount || select.isPending}
              onClick={() => {
                const acc = accounts.data?.adAccounts.find(
                  (a) => a.id === selectedAccount,
                );
                select.mutate({
                  adAccountId: selectedAccount,
                  pageId: selectedPage || undefined,
                  adAccountCurrency: acc?.currency,
                });
              }}
            >
              {select.isPending ? tc("loading") : tc("save")}
            </Button>
          </div>
        )}

        {/* Holat 3: ad account biriktirilgan */}
        {bound && !expired && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {t("meta.accountBound")}{" "}
                <span className="font-medium text-foreground">{adAccountId}</span>
              </p>
              <Button
                variant="outline"
                size="sm"
                disabled={sync.isPending}
                onClick={() => sync.mutate()}
              >
                <RefreshCw className="mr-2 h-3.5 w-3.5" />
                {t("meta.syncNow")}
              </Button>
            </div>
            {!pageId && (
              <p className="text-xs text-watch">{t("meta.noPageBound")}</p>
            )}
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
