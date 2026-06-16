import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { assertProjectOwnership, OwnershipError } from "@/lib/db/ownership";
import { setCurrentProjectCookie } from "@/lib/projects/context";

/**
 * /api/projects/current — joriy loyihani almashtirish (POST).
 * Egalik tasdiqlanadi, so'ng cookie'ga yoziladi. Tegishli bo'lmasa 404.
 */

const setCurrentSchema = z.object({
  projectId: z.string(),
});

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

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Avtorizatsiya talab qilinadi" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { projectId } = setCurrentSchema.parse(body);

    await assertProjectOwnership(user.id, projectId);
    await setCurrentProjectCookie(projectId);

    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
