import { NextResponse } from "next/server";
import { getMetaAuthUrl } from "@/lib/meta/oauth";
import { env, isMock } from "@/lib/env";

/**
 * GET /api/integrations/meta/connect — Meta OAuth oqimini boshlaydi.
 * Mock rejimida real OAuth o'rniga to'g'ridan-to'g'ri callback'ga (code=MOCK) yo'naltiradi,
 * shunda butun ulanish oqimi Meta App Review'siz test qilinadi.
 */
export async function GET() {
  const state = "meta";

  if (isMock()) {
    return NextResponse.redirect(
      `${env.APP_BASE_URL}/api/integrations/meta/callback?code=MOCK&state=${state}`,
    );
  }

  return NextResponse.redirect(getMetaAuthUrl(state));
}
