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
  useMetaAdAccounts,
  useMetaPages,
  useSelectMetaAccount,
  useMetaSync,
} from "@/lib/integrations/meta-hooks";

type Props = {
  projectId: string;
  /** Meta OAuth grant mavjud (token bor) */
  hasConnection: boolean;
  /** Loyihaga ad account biriktirilgan */
  adAccountId?: string | null;
};

export function MetaConnect({ projectId, hasConnection, adAccountId }: Props) {
  const bound = Boolean(adAccountId);
  const accounts = useMetaAdAccounts(hasConnection && !bound);
  const pages = useMetaPages(hasConnection && !bound);
  const select = useSelectMetaAccount(projectId);
  const sync = useMetaSync(projectId);

  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [selectedPage, setSelectedPage] = useState<string>("");

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <Plug className="h-4 w-4 text-primary" /> Meta Ads
        </CardTitle>
        {bound ? (
          <Badge className="bg-scale text-scale-foreground hover:bg-scale">Ulangan</Badge>
        ) : hasConnection ? (
          <Badge variant="secondary">Hisob tanlanmagan</Badge>
        ) : (
          <Badge variant="outline">Ulanmagan</Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Holat 1: umuman ulanmagan */}
        {!hasConnection && (
          <>
            <p className="text-sm text-muted-foreground">
              Meta hisobingizni ulang — campaign, ad set va ad statistikasi tortiladi.
            </p>
            <Button onClick={() => (window.location.href = "/api/integrations/meta/connect")}>
              Meta'ni ulash
            </Button>
          </>
        )}

        {/* Holat 2: ulangan, lekin ad account tanlanmagan */}
        {hasConnection && !bound && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Reklama hisobi (ad account)</Label>
              {accounts.isLoading ? (
                <Skeleton className="h-9 w-full" />
              ) : (
                <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                  <SelectTrigger>
                    <SelectValue placeholder="Hisobni tanlang" />
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
              <Label>Facebook Page (Lead Ads uchun)</Label>
              {pages.isLoading ? (
                <Skeleton className="h-9 w-full" />
              ) : (
                <Select value={selectedPage} onValueChange={setSelectedPage}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sahifani tanlang" />
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
            </div>

            <Button
              disabled={!selectedAccount || select.isPending}
              onClick={() => {
                const acc = accounts.data?.adAccounts.find((a) => a.id === selectedAccount);
                select.mutate({
                  adAccountId: selectedAccount,
                  pageId: selectedPage || undefined,
                  adAccountCurrency: acc?.currency,
                });
              }}
            >
              {select.isPending ? "Saqlanmoqda..." : "Saqlash"}
            </Button>
          </div>
        )}

        {/* Holat 3: ad account biriktirilgan */}
        {bound && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Reklama hisobi: <span className="font-medium text-foreground">{adAccountId}</span>
            </p>
            <Button
              variant="outline"
              size="sm"
              disabled={sync.isPending}
              onClick={() => sync.mutate()}
            >
              <RefreshCw className="mr-2 h-3.5 w-3.5" />
              Hozir sinxronla
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
