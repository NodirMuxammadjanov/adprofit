import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { OwnershipError, assertProjectOwnership } from "@/lib/db/ownership";
import { db } from "@/lib/db";
import { crmConnections } from "@/lib/db/schema";
import { enqueueCrmSync } from "@/lib/jobs/crm";

/**
 * POST /api/projects/[id]/crm/config — CRM pipeline/bosqich xaritalashini saqlaydi.
 * Saqlagandan so'ng CRM sync navbatga qo'yiladi (worker o'chiq bo'lsa ham xato bermaydi).
 */

const configSchema = z.object({
  pipelineId: z.string(),
  qualifiedStageId: z.string(),
  wonStageId: z.string(),
  revenueField: z.string().optional(),
});

/** OwnershipError → 404, ZodError → 400, user yo'q → 401. */
function errorResponse(err: unknown): NextResponse {
  if (err instanceof OwnershipError) {
    return NextResponse.json({ error: "Loyiha topilmadi" }, { status: 404 });
  }
  if (err instanceof ZodError) {
    return NextResponse.json({ error: err.flatten() }, { status: 400 });
  }
  throw err;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Avtorizatsiya talab qilinadi" }, { status: 401 });
    }

    const { id } = await params;
    await assertProjectOwnership(user.id, id);

    const body = await req.json().catch(() => ({}));
    const input = configSchema.parse(body);

    const [updated] = await db
      .update(crmConnections)
      .set({
        pipelineId: input.pipelineId,
        qualifiedStageId: input.qualifiedStageId,
        wonStageId: input.wonStageId,
        revenueField: input.revenueField ?? null,
        updatedAt: new Date(),
      })
      .where(eq(crmConnections.projectId, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Avval CRM'ni ulang" }, { status: 400 });
    }

    // Worker o'chiq bo'lishi mumkin — navbatga qo'yish xatosi javobni buzmasin.
    try {
      await enqueueCrmSync(id);
    } catch {
      // ignore: sync keyinroq qayta urinadi
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
