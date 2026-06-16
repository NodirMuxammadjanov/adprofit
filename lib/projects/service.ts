import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { projects, type Project } from "@/lib/db/schema";
import {
  assertProjectOwnership,
  listUserProjects,
} from "@/lib/db/ownership";

/**
 * Loyiha CRUD xizmat qatlami (Phase 4).
 * Har bir funksiya `userId` oladi — ma'lumot izolyatsiyasi har doim egalik orqali.
 */

export const createProjectSchema = z.object({
  name: z.string().min(1).max(120),
  currency: z.string().optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  currency: z.string().optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

/** Joriy foydalanuvchining barcha loyihalari. */
export async function listProjects(userId: string): Promise<Project[]> {
  return listUserProjects(userId);
}

/** Yangi loyiha yaratadi va qaytaradi. */
export async function createProject(
  userId: string,
  input: CreateProjectInput,
): Promise<Project> {
  const [project] = await db
    .insert(projects)
    .values({
      userId,
      name: input.name,
      currency: input.currency ?? null,
    })
    .returning();
  return project;
}

/** Egalik tekshirilgan loyihani qaytaradi (yo'q bo'lsa OwnershipError). */
export async function getProject(
  userId: string,
  projectId: string,
): Promise<Project> {
  return assertProjectOwnership(userId, projectId);
}

/** Egalik tekshirilgandan so'ng loyihani yangilaydi va qaytaradi. */
export async function updateProject(
  userId: string,
  projectId: string,
  patch: UpdateProjectInput,
): Promise<Project> {
  await assertProjectOwnership(userId, projectId);

  const set: Partial<Pick<Project, "name" | "currency">> & {
    updatedAt: Date;
  } = { updatedAt: new Date() };
  if (patch.name !== undefined) set.name = patch.name;
  if (patch.currency !== undefined) set.currency = patch.currency;

  const [project] = await db
    .update(projects)
    .set(set)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
    .returning();
  return project;
}

/** Egalik tekshirilgandan so'ng loyihani o'chiradi (bolalar cascade orqali). */
export async function deleteProject(
  userId: string,
  projectId: string,
): Promise<void> {
  await assertProjectOwnership(userId, projectId);
  await db
    .delete(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)));
}
