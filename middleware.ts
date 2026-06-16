import { NextResponse, type NextRequest } from "next/server";

/**
 * Route himoyasi.
 * Clerk kalitlari mavjud bo'lsa — Clerk middleware himoyalangan route'larni qo'riqlaydi.
 * Aks holda (dev mock) — o'tkazib yuboradi (demo user bilan ishlanadi).
 */

const hasClerk = Boolean(
  process.env.CLERK_SECRET_KEY && process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
);

// Himoyalanmaydigan (ochiq) yo'llar
const PUBLIC_PATHS = ["/", "/login", "/signup", "/api/webhooks"];

function isPublic(path: string): boolean {
  return PUBLIC_PATHS.some((p) => path === p || path.startsWith(`${p}/`));
}

// Clerk middleware'ni faqat kalitlar bo'lsa yuklaymiz (dinamik).
async function clerkHandler(req: NextRequest) {
  const { clerkMiddleware, createRouteMatcher } = await import("@clerk/nextjs/server");
  const isProtected = createRouteMatcher([
    "/dashboard(.*)",
    "/recommendations(.*)",
    "/leads(.*)",
    "/integrations(.*)",
    "/settings(.*)",
    "/onboarding(.*)",
  ]);
  // clerkMiddleware bir marta yaratiladi (har so'rovda chaqirsa ham yengil).
  const handler = clerkMiddleware(async (auth, request) => {
    if (isProtected(request)) await auth.protect();
  });
  // @ts-expect-error — Clerk middleware Next handler imzosiga mos keladi
  return handler(req);
}

export async function middleware(req: NextRequest) {
  if (hasClerk) return clerkHandler(req);
  // Dev: hamma narsa ochiq
  if (!isPublic(req.nextUrl.pathname)) return NextResponse.next();
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"],
};
