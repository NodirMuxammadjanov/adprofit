import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { assertProjectOwnership, OwnershipError } from "@/lib/db/ownership";
import { db } from "@/lib/db";
import { recommendations } from "@/lib/db/schema";

const bodySchema = z.object({
  status: z.enum(["new", "seen", "done", "dismissed"]),
});

/** PATCH /api/recommendations/[id] — tavsiya holatini yangilaydi (seen/done/dismissed). */
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

    const [rec] = await db
      .select({ projectId: recommendations.projectId })
      .from(recommendations)
      .where(eq(recommendations.id, id))
      .limit(1);
    if (!rec) {
      return NextResponse.json({ error: "Tavsiya topilmadi" }, { status: 404 });
    }
    await assertProjectOwnership(user.id, rec.projectId);

    const body = bodySchema.parse(await req.json());
    await db
      .update(recommendations)
      .set({ status: body.status, updatedAt: new Date() })
      .where(eq(recommendations.id, id));

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof OwnershipError) {
      return NextResponse.json({ error: "Tavsiya topilmadi" }, { status: 404 });
    }
    if (err instanceof ZodError) {
      return NextResponse.json({ error: err.flatten() }, { status: 400 });
    }
    throw err;
  }
}
