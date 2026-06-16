import { db } from "./db";
import { users, type User } from "./db/schema";
import { eq } from "drizzle-orm";

/**
 * Auth qatlami — Clerk.
 *
 * Production / kalitlar mavjud: Clerk sessiyasi → `users` jadvaliga upsert.
 * Dev (Clerk kalitlari yo'q + MOCK_INTEGRATIONS): seed'dagi demo user'ga tushadi,
 * shunda butun UI/oqim tashqi servissiz test qilinadi (Meta App Review kutilayotganda).
 */

export const DEMO_CLERK_ID = "user_seed_demo";

export function hasClerk(): boolean {
  return Boolean(
    process.env.CLERK_SECRET_KEY && process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  );
}

/** Clerk user'ini ichki `users` jadvaliga upsert qiladi. */
async function upsertUser(
  clerkUserId: string,
  email?: string | null,
  name?: string | null,
): Promise<User> {
  const [u] = await db
    .insert(users)
    .values({ clerkUserId, email: email ?? null, name: name ?? null })
    .onConflictDoUpdate({
      target: users.clerkUserId,
      set: { updatedAt: new Date(), ...(email ? { email } : {}), ...(name ? { name } : {}) },
    })
    .returning();
  return u;
}

/**
 * Joriy foydalanuvchini qaytaradi (yoki null). Clerk bo'lsa — sessiyadan + upsert.
 * Aks holda dev demo user.
 */
export async function getCurrentUser(): Promise<User | null> {
  if (hasClerk()) {
    const { auth, currentUser } = await import("@clerk/nextjs/server");
    const { userId } = await auth();
    if (!userId) return null;
    const cu = await currentUser();
    const email = cu?.primaryEmailAddress?.emailAddress ?? cu?.emailAddresses?.[0]?.emailAddress;
    const name = cu ? [cu.firstName, cu.lastName].filter(Boolean).join(" ") || null : null;
    return upsertUser(userId, email, name);
  }

  // Dev fallback — seed demo user
  const [u] = await db.select().from(users).where(eq(users.clerkUserId, DEMO_CLERK_ID)).limit(1);
  return u ?? null;
}

/** Joriy foydalanuvchi id'si yoki null (yengil, upsertsiz dev'da). */
export async function getCurrentUserId(): Promise<string | null> {
  const u = await getCurrentUser();
  return u?.id ?? null;
}
