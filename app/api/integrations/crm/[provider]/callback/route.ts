import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { env } from "@/lib/env";
import { getCurrentProject } from "@/lib/projects/context";
import { getCrmAdapter } from "@/lib/crm/registry";
import { saveCrmConnection } from "@/lib/crm/connection";
import type { CrmProvider } from "@/lib/crm/types";

/**
 * GET /api/integrations/crm/[provider]/callback — OAuth redirect qaytishi.
 * `code` ni token'ga almashtiradi va joriy loyiha darajasida CRM ulanishni saqlaydi.
 * Mock rejimida exchangeCode mock token qaytaradi.
 */

const PROVIDERS = ["bitrix24", "amocrm"] as const;

function isProvider(p: string): p is CrmProvider {
  return (PROVIDERS as readonly string[]).includes(p);
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;
  if (!isProvider(provider)) {
    return NextResponse.json({ error: "Noma'lum CRM provayder" }, { status: 400 });
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.redirect(`${env.APP_BASE_URL}/login`);
    }

    const project = await getCurrentProject(user.id);
    if (!project) {
      return NextResponse.redirect(`${env.APP_BASE_URL}/onboarding`);
    }

    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    if (!code) {
      return NextResponse.redirect(`${env.APP_BASE_URL}/integrations?crm=error`);
    }

    const data = await getCrmAdapter(provider).exchangeCode(code);
    await saveCrmConnection(project.id, provider, data);

    return NextResponse.redirect(`${env.APP_BASE_URL}/integrations?crm=connected`);
  } catch {
    return NextResponse.redirect(`${env.APP_BASE_URL}/integrations?crm=error`);
  }
}
