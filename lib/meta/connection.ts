import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { metaConnections } from "@/lib/db/schema";
import { decrypt } from "@/lib/crypto";

/**
 * Foydalanuvchining Meta ulanishini o'qish va deshifrlangan tokenni olish.
 */

/**
 * Ulanish holati: token muddati `token_expires_at` bo'yicha hisoblanadi.
 * - "active"  — token amal qilmoqda (yoki muddat ko'rsatilmagan).
 * - "expired" — token muddati o'tgan; sync to'xtaydi, qayta ulash kerak.
 */
export type ConnectionStatus = "active" | "expired";

/**
 * `token_expires_at` dan ulanish holatini chiqaradi. Sana yo'q bo'lsa —
 * holatni "active" deb hisoblaymiz (mas. mock rejim yoki muddatsiz token).
 */
export function deriveConnectionStatus(
  tokenExpiresAt: Date | null | undefined,
): ConnectionStatus {
  if (!tokenExpiresAt) return "active";
  return tokenExpiresAt.getTime() <= Date.now() ? "expired" : "active";
}

/** meta_connections qatorini qaytaradi yoki null. */
export async function getUserMetaConnection(userId: string) {
  const [row] = await db
    .select()
    .from(metaConnections)
    .where(eq(metaConnections.userId, userId))
    .limit(1);
  return row ?? null;
}

/**
 * Meta ulanishining holatini qaytaradi (active | expired). Ulanish yo'q bo'lsa null.
 * page.tsx token muddati tugaganini aniqlash uchun shu yerdan oladi.
 */
export async function getUserMetaConnectionStatus(
  userId: string,
): Promise<ConnectionStatus | null> {
  const row = await getUserMetaConnection(userId);
  if (!row) return null;
  return deriveConnectionStatus(row.tokenExpiresAt);
}

/** Ulanish tokenini deshifrlab qaytaradi yoki null. */
export async function getUserMetaToken(userId: string): Promise<string | null> {
  const row = await getUserMetaConnection(userId);
  if (!row) return null;
  return decrypt(row.accessToken);
}
