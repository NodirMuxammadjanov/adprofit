import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { OwnershipError, assertProjectOwnership } from "@/lib/db/ownership";
import { enqueueCrmSync } from "@/lib/jobs/crm";

/**
 * POST /api/projects/[id]/crm/sync — CRM sync'ni qo'lda navbatga qo'yadi.
 * Worker o'chiq bo'lsa ham javob qaytadi (navbatga qo'yish xatosi yutiladi).
 */

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

    // Worker o'chiq bo'lishi mumkin — navbatga qo'yish xatosi javobni buzmasin.
    try {
      await enqueueCrmSync(id);
    } catch {
      // ignore: sync keyinroq qayta urinadi
    }

    return NextResponse.json({ ok: true, queued: true });
  } catch (err) {
    return errorResponse(err);
  }
}
