import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { assertProjectOwnership, OwnershipError } from "@/lib/db/ownership";
import { db } from "@/lib/db";
import { projectMeta } from "@/lib/db/schema";
import { getUserMetaToken } from "@/lib/meta/connection";
import { listLeadForms } from "@/lib/meta/client";

/** GET /api/projects/[id]/meta/forms — loyiha Page'idagi FB Lead Ads formalari. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });
    const { id } = await params;
    await assertProjectOwnership(user.id, id);

    const [pm] = await db
      .select()
      .from(projectMeta)
      .where(eq(projectMeta.projectId, id))
      .limit(1);
    if (!pm?.pageId) {
      return NextResponse.json({ error: "Avval Meta Page'ni tanlang" }, { status: 400 });
    }
    const token = await getUserMetaToken(user.id);
    if (!token) return NextResponse.json({ error: "Meta ulanmagan" }, { status: 400 });

    return NextResponse.json({ forms: await listLeadForms(token, pm.pageId) });
  } catch (err) {
    if (err instanceof OwnershipError) {
      return NextResponse.json({ error: "Loyiha topilmadi" }, { status: 404 });
    }
    throw err;
  }
}
