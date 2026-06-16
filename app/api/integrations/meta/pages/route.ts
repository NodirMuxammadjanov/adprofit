import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getUserMetaToken } from "@/lib/meta/connection";
import { listPages } from "@/lib/meta/client";

/**
 * GET /api/integrations/meta/pages — joriy foydalanuvchining Facebook sahifalari.
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

  return NextResponse.json({ pages: await listPages(token) });
}
