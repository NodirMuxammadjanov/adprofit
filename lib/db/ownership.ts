import { and, eq } from "drizzle-orm";
import { db } from "./index";
import { projects, users } from "./schema";

/**
 * Ma'lumot izolyatsiyasi (RLS o'rnida) — markazlashgan.
 * Har bir loyiha-bog'liq so'rov SHU yerdan o'tadi: `project.user_id = currentUser.id`.
 */

export class OwnershipError extends Error {
  constructor(message = "Loyiha topilmadi yoki ruxsat yo'q") {
    super(message);
    this.name = "OwnershipError";
  }
}

/** Clerk user'idan ichki users.id ni topadi (upsert Phase 3'da). */
export async function getUserByClerkId(clerkUserId: string) {
  const [u] = await db.select().from(users).where(eq(users.clerkUserId, clerkUserId)).limit(1);
  return u ?? null;
}

/**
 * Loyiha joriy foydalanuvchiga tegishliligini tasdiqlaydi.
 * Tegishli bo'lmasa OwnershipError tashlaydi. Loyiha qatorini qaytaradi.
 */
export async function assertProjectOwnership(userId: string, projectId: string) {
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
    .limit(1);
  if (!project) throw new OwnershipError();
  return project;
}

/** Joriy foydalanuvchining barcha loyihalari (almashtirgich uchun). */
export async function listUserProjects(userId: string) {
  return db.select().from(projects).where(eq(projects.userId, userId));
}
