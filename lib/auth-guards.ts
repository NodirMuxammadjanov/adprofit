import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "./auth";
import { getCurrentProject } from "./projects/context";
import { getProjectCrmConnection } from "./crm/connection";
import { db } from "./db";
import { projectMeta } from "./db/schema";
import type { User } from "./db/schema";

/** Himoyalangan sahifa uchun: foydalanuvchi yoki /login'ga redirect. */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/**
 * Onboarding "yadrosi" tugaganmi: loyihaga Meta reklama hisobi + Facebook Page
 * biriktirilgan VA CRM pipeline/bosqichlari sozlangan. Shu uchlik bo'lmasa
 * dashboard hali foydali emas — foydalanuvchini sehrgarga qaytaramiz.
 * (Lead transfer — oxirgi qadam, lekin dashboardni bloklamaydi, shuning uchun
 * routing qaroriga kirmaydi: foydalanuvchini abadiy qamab qo'ymaslik uchun.)
 */
async function isCoreOnboardingComplete(projectId: string): Promise<boolean> {
  const [pm] = await db
    .select({
      adAccountId: projectMeta.adAccountId,
      pageId: projectMeta.pageId,
    })
    .from(projectMeta)
    .where(eq(projectMeta.projectId, projectId))
    .limit(1);
  const metaDone = Boolean(pm?.adAccountId && pm?.pageId);
  if (!metaDone) return false;

  const crm = await getProjectCrmConnection(projectId);
  return Boolean(crm?.pipelineId && crm?.qualifiedStageId && crm?.wonStageId);
}

/**
 * Auth'dan keyingi yo'naltirish (va "finish setup" yo'li):
 * - loyihasi yo'q → /onboarding (1-qadam);
 * - loyihasi bor, lekin Meta/CRM yadrosi tugallanmagan → /onboarding (resume — sehrgar
 *   ulanish holatidan to'xtagan qadamdan davom ettiradi);
 * - hammasi tayyor → /dashboard.
 * Landing va auth callback'lardan chaqiriladi.
 */
export async function routeAfterAuth(): Promise<never> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const project = await getCurrentProject(user.id);
  if (!project) redirect("/onboarding");

  const complete = await isCoreOnboardingComplete(project.id);
  redirect(complete ? "/dashboard" : "/onboarding");
}
