import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { metaConnections } from "@/lib/db/schema";
import { decrypt } from "@/lib/crypto";

/**
 * Foydalanuvchining Meta ulanishini o'qish va deshifrlangan tokenni olish.
 */

/** meta_connections qatorini qaytaradi yoki null. */
export async function getUserMetaConnection(userId: string) {
  const [row] = await db
    .select()
    .from(metaConnections)
    .where(eq(metaConnections.userId, userId))
    .limit(1);
  return row ?? null;
}

/** Ulanish tokenini deshifrlab qaytaradi yoki null. */
export async function getUserMetaToken(userId: string): Promise<string | null> {
  const row = await getUserMetaConnection(userId);
  if (!row) return null;
  return decrypt(row.accessToken);
}
