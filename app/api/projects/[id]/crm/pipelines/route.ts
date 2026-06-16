import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { OwnershipError, assertProjectOwnership } from "@/lib/db/ownership";
import { getCrmContextForProject } from "@/lib/crm/connection";

/**
 * GET /api/projects/[id]/crm/pipelines — ulangan CRM'dagi pipeline/bosqichlar ro'yxati.
 * CRM ulanmagan bo'lsa 400 qaytaradi. Egalik har doim tekshiriladi.
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

export async function GET(
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

    const crm = await getCrmContextForProject(id);
    if (!crm) {
      return NextResponse.json({ error: "CRM ulanmagan" }, { status: 400 });
    }

    return NextResponse.json({ pipelines: await crm.adapter.listPipelines(crm.ctx) });
  } catch (err) {
    return errorResponse(err);
  }
}
