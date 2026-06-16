import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { assertProjectOwnership, OwnershipError } from "@/lib/db/ownership";
import { db } from "@/lib/db";
import { projectMeta, projects } from "@/lib/db/schema";
import { getUserMetaConnection } from "@/lib/meta/connection";
import { enqueueMetaSync } from "@/lib/jobs/meta";

/**
 * POST /api/projects/[id]/meta — loyihaga Meta reklama akkaunti + sahifani biriktiradi.
 * UPSERT (project_meta.project_id unique) qiladi, kerak bo'lsa loyiha valyutasini yangilaydi,
 * so'ng dastlabki sync'ni navbatga qo'yadi.
 */

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

const bodySchema = z.object({
  adAccountId: z.string(),
  pageId: z.string().optional(),
  adAccountCurrency: z.string().optional(),
});

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

    const raw = await req.json().catch(() => ({}));
    const { adAccountId, pageId, adAccountCurrency } = bodySchema.parse(raw);

    const connection = await getUserMetaConnection(user.id);
    if (!connection) {
      return NextResponse.json({ error: "Meta ulanmagan" }, { status: 400 });
    }

    await db
      .insert(projectMeta)
      .values({
        projectId: id,
        metaConnectionId: connection.id,
        adAccountId,
        pageId: pageId ?? null,
        adAccountCurrency: adAccountCurrency ?? null,
      })
      .onConflictDoUpdate({
        target: projectMeta.projectId,
        set: {
          metaConnectionId: connection.id,
          adAccountId,
          pageId: pageId ?? null,
          adAccountCurrency: adAccountCurrency ?? null,
          updatedAt: new Date(),
        },
      });

    if (adAccountCurrency) {
      await db
        .update(projects)
        .set({ currency: adAccountCurrency, updatedAt: new Date() })
        .where(eq(projects.id, id));
    }

    try {
      await enqueueMetaSync(id);
    } catch (err) {
      console.error("[meta] enqueueMetaSync failed", err);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
