import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { exchangeCodeForToken, saveMetaConnection } from "@/lib/meta/oauth";
import { env } from "@/lib/env";

/**
 * GET /api/integrations/meta/callback — OAuth redirect qaytishi.
 * `code` ni token'ga almashtiradi va foydalanuvchi darajasida ulanishni saqlaydi.
 * Mock rejimida exchangeCodeForToken mock token qaytaradi.
 */
export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.redirect(`${env.APP_BASE_URL}/login`);
    }

    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    if (!code) {
      return NextResponse.redirect(`${env.APP_BASE_URL}/integrations?meta=error`);
    }

    const data = await exchangeCodeForToken(code);
    await saveMetaConnection(user.id, data);

    return NextResponse.redirect(`${env.APP_BASE_URL}/integrations?meta=connected`);
  } catch {
    return NextResponse.redirect(`${env.APP_BASE_URL}/integrations?meta=error`);
  }
}
