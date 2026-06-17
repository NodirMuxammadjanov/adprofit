import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { clientIp, markSeenOnce, rateLimit } from "@/lib/rate-limit";

/**
 * Telegram Login → Clerk sign-in.
 *
 * Oqim:
 *  1. Telegram Login Widget payload'ini oladi va HMAC-SHA256 hash'ini
 *     TELEGRAM_BOT_TOKEN bilan tekshiradi (Telegram login spetsifikatsiyasi).
 *  2. Clerk Backend SDK orqali foydalanuvchini topadi/yaratadi
 *     (externalId = "telegram:<id>").
 *  3. Sign-in token (ticket) yaratib qaytaradi — klient uni `useSignIn`
 *     bilan `strategy: "ticket"` orqali yakunlaydi.
 *
 * Eslatma: bu yo'l faqat Clerk va Telegram bot sozlanganda ishlaydi.
 * Sozlanmagan bo'lsa — 503 qaytadi (UI graceful fallback ko'rsatadi).
 */

// Telegram Login Widget payload. Maydonlar tashqi manbadan keladi —
// shaklini ishonmaymiz, zod bilan tekshiramiz.
const telegramAuthSchema = z.object({
  id: z.union([z.number(), z.string()]).transform((v) => String(v)),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  username: z.string().optional(),
  photo_url: z.string().url().optional(),
  auth_date: z.union([z.number(), z.string()]).transform((v) => Number(v)),
  hash: z.string().min(1),
});

type TelegramAuth = z.infer<typeof telegramAuthSchema>;

// Login widget eskirgan payload'larni bloklash uchun maksimal yosh (soniya).
// Telegram klientlari payload'ni darhol yetkazadi — qisqa oyna interception/
// replay derazasini keskin toraytiradi.
const MAX_AUTH_AGE_SECONDS = 5 * 60; // 5 daqiqa
// Soat farqi (clock skew) uchun ruxsat etilgan kelajak chetlanishi.
const MAX_FUTURE_SKEW_SECONDS = 60;
// Bir IP uchun ruxsat etilgan urinishlar (Clerk chaqiruvlarini cheklash).
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60_000;

/**
 * Telegram login hash'ini tekshiradi.
 * data_check_string = hash'dan tashqari barcha maydonlar "key=value"
 * ko'rinishida, kalitlar bo'yicha saralanib "\n" bilan birlashtirilgan.
 * secret_key = SHA256(bot_token). hash = HMAC-SHA256(data_check_string, secret_key).
 */
function isValidTelegramHash(data: TelegramAuth, botToken: string): boolean {
  const { hash, ...fields } = data;

  const dataCheckString = Object.entries(fields)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${key}=${value}`)
    .sort()
    .join("\n");

  const secretKey = crypto.createHash("sha256").update(botToken).digest();
  const computed = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  // Doimiy vaqtli taqqoslash (timing attack'ga qarshi).
  const a = Buffer.from(computed, "hex");
  const b = Buffer.from(hash, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const hasClerkKeys = Boolean(
    process.env.CLERK_SECRET_KEY &&
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  );

  if (!botToken || !hasClerkKeys) {
    return NextResponse.json(
      { error: "Telegram orqali kirish sozlanmagan" },
      { status: 503 },
    );
  }

  // 1. Payload'ni o'qish va tekshirish.
  let data: TelegramAuth;
  try {
    const body = await req.json();
    data = telegramAuthSchema.parse(body);
  } catch {
    return NextResponse.json({ error: "Noto'g'ri so'rov" }, { status: 400 });
  }

  // 2. Eskirgan YOKI kelajak sanali payload'ni rad qilish (qisqa oyna).
  const nowSeconds = Math.floor(Date.now() / 1000);
  const ageSeconds = nowSeconds - data.auth_date;
  if (
    !Number.isFinite(data.auth_date) ||
    ageSeconds > MAX_AUTH_AGE_SECONDS ||
    ageSeconds < -MAX_FUTURE_SKEW_SECONDS // kelajakdagi auth_date — soxta.
  ) {
    return NextResponse.json(
      { error: "Avtorizatsiya muddati tugagan" },
      { status: 401 },
    );
  }

  // 3. Hash'ni tekshirish (arzon — Clerk chaqiruvidan oldin tez rad etiladi).
  if (!isValidTelegramHash(data, botToken)) {
    return NextResponse.json(
      { error: "Imzo tekshiruvi muvaffaqiyatsiz" },
      { status: 401 },
    );
  }

  // 3b. Bir martalik: aynan shu (imzolangan) payload qayta ishlatilmasin.
  // Hash payload bo'yicha noyob; yaroqlilik oynasi davomida eslab qolamiz.
  if (!markSeenOnce(`tg:${data.hash}`, MAX_AUTH_AGE_SECONDS * 1000)) {
    return NextResponse.json(
      { error: "Avtorizatsiya allaqachon ishlatilgan" },
      { status: 401 },
    );
  }

  // 3c. Tezlik cheklash — yaroqli imzodan keyin, Clerk chaqiruvidan oldin.
  const rl = rateLimit(`tg:${clientIp(req)}`, RATE_LIMIT, RATE_WINDOW_MS);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Juda ko'p urinish. Birozdan so'ng qayta urinib ko'ring." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } },
    );
  }

  // 4. Clerk foydalanuvchisini topish/yaratish + sign-in token.
  try {
    const { clerkClient } = await import("@clerk/nextjs/server");
    const clerk = await clerkClient();

    const externalId = `telegram:${data.id}`;
    const existing = await clerk.users.getUserList({
      externalId: [externalId],
      limit: 1,
    });

    const user =
      existing.data[0] ??
      (await clerk.users.createUser({
        externalId,
        firstName: data.first_name,
        lastName: data.last_name,
        username: data.username,
        skipPasswordRequirement: true,
        skipPasswordChecks: true,
        publicMetadata: {
          telegramId: data.id,
          telegramUsername: data.username ?? null,
        },
      }));

    const signInToken = await clerk.signInTokens.createSignInToken({
      userId: user.id,
      expiresInSeconds: 60 * 5, // 5 daqiqa
    });

    // Klient ushbu ticket bilan `signIn.create({ strategy: "ticket" })` qiladi.
    return NextResponse.json({ ticket: signInToken.token });
  } catch (err) {
    console.error("[telegram-auth] Clerk sign-in failed:", err);
    return NextResponse.json(
      { error: "Kirib bo'lmadi, qayta urinib ko'ring" },
      { status: 502 },
    );
  }
}
