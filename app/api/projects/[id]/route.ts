import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { OwnershipError } from "@/lib/db/ownership";
import {
  deleteProject,
  updateProject,
  updateProjectSchema,
} from "@/lib/projects/service";

/**
 * /api/projects/[id] — bitta loyihani yangilash (PATCH) va o'chirish (DELETE).
 * Next 15: params — Promise, await qilinadi. Egalik har doim tekshiriladi.
 */

/** OwnershipError → 404, ZodError → 400. */
function errorResponse(err: unknown): NextResponse {
  if (err instanceof OwnershipError) {
    return NextResponse.json({ error: "Loyiha topilmadi" }, { status: 404 });
  }
  if (err instanceof ZodError) {
    return NextResponse.json({ error: err.flatten() }, { status: 400 });
  }
  throw err;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Avtorizatsiya talab qilinadi" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const patch = updateProjectSchema.parse(body);

    const project = await updateProject(user.id, id, patch);
    return NextResponse.json({ project });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Avtorizatsiya talab qilinadi" }, { status: 401 });
    }

    const { id } = await params;
    await deleteProject(user.id, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
