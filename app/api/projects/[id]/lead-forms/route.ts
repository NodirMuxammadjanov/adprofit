import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { assertProjectOwnership, OwnershipError } from "@/lib/db/ownership";
import { db } from "@/lib/db";
import { leadForms } from "@/lib/db/schema";

/** user yo'q → 401, OwnershipError → 404, ZodError → 400, aks holda rethrow. */
function errorResponse(err: unknown): NextResponse {
  if (err instanceof OwnershipError) {
    return NextResponse.json({ error: "Loyiha topilmadi" }, { status: 404 });
  }
  if (err instanceof ZodError) {
    return NextResponse.json({ error: err.flatten() }, { status: 400 });
  }
  throw err;
}

/** GET — loyihaning sozlangan lead formalari. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });
    const { id } = await params;
    await assertProjectOwnership(user.id, id);
    const rows = await db.select().from(leadForms).where(eq(leadForms.projectId, id));
    return NextResponse.json({ leadForms: rows });
  } catch (err) {
    return errorResponse(err);
  }
}

const bodySchema = z.object({
  metaFormId: z.string().min(1),
  formName: z.string().optional(),
  isActive: z.boolean().optional().default(true),
  fieldMapping: z.record(z.string(), z.string()).optional(),
  targetPipelineId: z.string().optional(),
  targetStageId: z.string().optional(),
});

/** POST — lead formani UPSERT qiladi (obuna + mapping + maqsadli pipeline/stage). */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });
    const { id } = await params;
    await assertProjectOwnership(user.id, id);

    const body = bodySchema.parse(await req.json());
    const [row] = await db
      .insert(leadForms)
      .values({
        projectId: id,
        metaFormId: body.metaFormId,
        formName: body.formName ?? null,
        isActive: body.isActive,
        fieldMapping: body.fieldMapping ?? null,
        targetPipelineId: body.targetPipelineId ?? null,
        targetStageId: body.targetStageId ?? null,
      })
      .onConflictDoUpdate({
        target: [leadForms.projectId, leadForms.metaFormId],
        set: {
          formName: body.formName ?? null,
          isActive: body.isActive,
          fieldMapping: body.fieldMapping ?? null,
          targetPipelineId: body.targetPipelineId ?? null,
          targetStageId: body.targetStageId ?? null,
          updatedAt: new Date(),
        },
      })
      .returning();

    return NextResponse.json({ leadForm: row });
  } catch (err) {
    return errorResponse(err);
  }
}
