import { redirect } from "next/navigation";
import { getCurrentUser } from "./auth";
import { listUserProjects } from "./db/ownership";
import type { User } from "./db/schema";

/** Himoyalangan sahifa uchun: foydalanuvchi yoki /login'ga redirect. */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/**
 * Auth'dan keyingi yo'naltirish: loyihasi yo'q → /onboarding, bor → /dashboard.
 * Landing va auth callback'lardan chaqiriladi.
 */
export async function routeAfterAuth(): Promise<never> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const projects = await listUserProjects(user.id);
  if (projects.length === 0) redirect("/onboarding");
  redirect("/dashboard");
}
