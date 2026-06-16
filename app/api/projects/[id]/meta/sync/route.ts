import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { assertProjectOwnership, OwnershipError } from "@/lib/db/ownership";
import { enqueueMetaSync } from "@/lib/jobs/meta";

/**
 * POST /api/projects/[id]/meta/sync — "Sync now": Meta sync'ni qo'lda navbatga qo'yadi.
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

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Avtorizatsiya talab qilinadi" }, { status: 401 });
    }

    const { id } = await params;
    await assertProjectOwnership(user.id, id);

    try {
      await enqueueMetaSync(id);
    } catch (err) {
      console.error("[meta] enqueueMetaSync failed", err);
    }

    return NextResponse.json({ ok: true, queued: true });
  } catch (err) {
    return errorResponse(err);
  }
}
