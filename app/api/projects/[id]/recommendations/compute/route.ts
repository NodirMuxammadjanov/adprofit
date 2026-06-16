import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { assertProjectOwnership, OwnershipError } from "@/lib/db/ownership";
import { runRecommendationsCompute } from "@/lib/recommendations/compute";

/**
 * POST /api/projects/[id]/recommendations/compute — svetofor tavsiyalarini qayta hisoblaydi.
 * Inline ishlaydi (tez, in-memory) — natija darrov qaytadi. Avtomatik yo'l: worker job.
 */
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

    const summary = await runRecommendationsCompute(id);
    return NextResponse.json({ ok: true, summary });
  } catch (err) {
    if (err instanceof OwnershipError) {
      return NextResponse.json({ error: "Loyiha topilmadi" }, { status: 404 });
    }
    throw err;
  }
}
