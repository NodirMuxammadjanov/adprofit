import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { env, isMock } from "@/lib/env";
import { getCrmAdapter } from "@/lib/crm/registry";
import type { CrmProvider } from "@/lib/crm/types";

/**
 * GET /api/integrations/crm/[provider]/connect — CRM OAuth oqimini boshlaydi.
 * Mock rejimida real OAuth o'rniga to'g'ridan-to'g'ri callback'ga (code=MOCK) yo'naltiradi,
 * shunda butun ulanish oqimi tashqi CRM'siz test qilinadi.
 */

const PROVIDERS = ["bitrix24", "amocrm"] as const;

function isProvider(p: string): p is CrmProvider {
  return (PROVIDERS as readonly string[]).includes(p);
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Avtorizatsiya talab qilinadi" }, { status: 401 });
  }

  const { provider } = await params;
  if (!isProvider(provider)) {
    return NextResponse.json({ error: "Noma'lum CRM provayder" }, { status: 400 });
  }

  const state = provider;

  if (isMock()) {
    return NextResponse.redirect(
      `${env.APP_BASE_URL}/api/integrations/crm/${provider}/callback?code=MOCK&state=${state}`,
    );
  }

  return NextResponse.redirect(getCrmAdapter(provider).getAuthUrl(state));
}
