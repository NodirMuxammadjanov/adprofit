import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { assertProjectOwnership, OwnershipError } from "@/lib/db/ownership";
import { db } from "@/lib/db";
import { leads } from "@/lib/db/schema";
import { enqueueLeadRetransfer, LeadRetransferError } from "@/lib/jobs/lead";
import { rateLimit } from "@/lib/rate-limit";

const paramsSchema = z.object({ id: z.string().uuid() });

// Bir foydalanuvchi uchun qayta-yuborish urinishlari chegarasi (navbatni
// toshirib yubormaslik uchun; endpoint autentifikatsiyalangan va idempotent).
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60_000;

/**
 * POST /api/leads/[id]/retransfer — muvaffaqiyatsiz (failed) lidni CRM'ga
 * qayta o'tkazishni navbatga qo'yadi.
 *
 * Xavfsizlik: foydalanuvchi autentifikatsiyadan o'tadi, lidning loyihasi
 * assertProjectOwnership bilan tekshiriladi (begona loyiha lidi qaytarilmaydi).
 * So'ng pg-boss lead.transfer ishi qayta yuboriladi — ish dedup va retry'ni
 * o'zi boshqaradi (idempotent: allaqachon o'tkazilgan bo'lsa "skipped").
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

    const rl = rateLimit(`retransfer:${user.id}`, RATE_LIMIT, RATE_WINDOW_MS);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Juda ko'p urinish. Birozdan so'ng qayta urinib ko'ring." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } },
      );
    }

    const { id } = paramsSchema.parse(await params);

    // Lid → loyiha (egalik tekshiruvi uchun).
    const [lead] = await db
      .select({ projectId: leads.projectId })
      .from(leads)
      .where(eq(leads.id, id))
      .limit(1);
    if (!lead) {
      return NextResponse.json({ error: "Lid topilmadi" }, { status: 404 });
    }
    await assertProjectOwnership(user.id, lead.projectId);

    // Egalik tasdiqlangandan keyin qayta o'tkazishni navbatga qo'yamiz.
    await enqueueLeadRetransfer(id, lead.projectId);

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof OwnershipError) {
      // Begona loyiha lidi — mavjudligini oshkor qilmaymiz.
      return NextResponse.json({ error: "Lid topilmadi" }, { status: 404 });
    }
    if (err instanceof LeadRetransferError) {
      const status = err.code === "no_form" ? 422 : 404;
      const message =
        err.code === "no_form"
          ? "Lid formasi noma'lum — qayta yuborib bo'lmaydi"
          : "Lid topilmadi";
      return NextResponse.json({ error: message }, { status });
    }
    if (err instanceof ZodError) {
      return NextResponse.json({ error: err.flatten() }, { status: 400 });
    }
    console.error("[leads/retransfer] kutilmagan xato:", err);
    return NextResponse.json(
      { error: "Qayta yuborib bo'lmadi, keyinroq urinib ko'ring" },
      { status: 500 },
    );
  }
}
