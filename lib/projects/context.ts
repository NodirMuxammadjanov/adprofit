import { cookies } from "next/headers";
import { listUserProjects, assertProjectOwnership } from "@/lib/db/ownership";
import type { Project } from "@/lib/db/schema";

/**
 * Joriy loyiha konteksti — `adprofit_project` cookie orqali (D4).
 * Egalik har doim tekshiriladi; cookie yaroqsiz bo'lsa birinchi loyihaga tushadi.
 */

export const CURRENT_PROJECT_COOKIE = "adprofit_project";

/** Cookie'dagi loyihani egalik bilan tekshiradi; bo'lmasa birinchi loyiha; yo'q bo'lsa null. */
export async function getCurrentProject(userId: string): Promise<Project | null> {
  const store = await cookies();
  const cookieId = store.get(CURRENT_PROJECT_COOKIE)?.value;

  if (cookieId) {
    try {
      return await assertProjectOwnership(userId, cookieId);
    } catch {
      // yaroqsiz cookie — pastga tushamiz
    }
  }
  const projects = await listUserProjects(userId);
  return projects[0] ?? null;
}

export async function getCurrentProjectId(userId: string): Promise<string | null> {
  return (await getCurrentProject(userId))?.id ?? null;
}

/** Joriy loyihani cookie'ga yozadi (egalik chaqiruvchida tekshiriladi). */
export async function setCurrentProjectCookie(projectId: string): Promise<void> {
  const store = await cookies();
  store.set(CURRENT_PROJECT_COOKIE, projectId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}
