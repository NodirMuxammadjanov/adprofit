import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getUserMetaToken } from "@/lib/meta/connection";
import { listAdAccounts } from "@/lib/meta/client";

/**
 * GET /api/integrations/meta/ad-accounts — joriy foydalanuvchining Meta reklama akkauntlari.
 * Meta ulanmagan bo'lsa 400 qaytaradi.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Avtorizatsiya talab qilinadi" }, { status: 401 });
  }

  const token = await getUserMetaToken(user.id);
  if (!token) {
    return NextResponse.json({ error: "Meta ulanmagan" }, { status: 400 });
  }

  return NextResponse.json({ adAccounts: await listAdAccounts(token) });
}
