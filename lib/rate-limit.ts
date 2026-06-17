/**
 * Juda yengil, instans-ichi (in-memory) himoya yordamchilari: tezlik cheklash
 * (fixed window) va bir martalik (replay) nazorati.
 *
 * ESLATMA — bu BEST-EFFORT: holat har bir server instansida alohida saqlanadi
 * va instans qayta ishga tushganda tozalanadi. Ko'p instansli/serverless
 * muhitda chinakam kafolat uchun durable store (Upstash/Vercel KV, Redis)
 * kerak. Bu yerda yangi bog'liqliklarsiz, asosiy abuzni susaytirish (Clerk
 * user-creation bosimi, navbatni toshirib yuborish) uchun yetarli darajada.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
// Map cheksiz o'smasligi uchun yumshoq chegara (eng eski yozuvlar tashlanadi).
const MAX_TRACKED_KEYS = 10_000;

export type RateLimitResult = {
  allowed: boolean;
  /** Cheklovga tushganda — necha soniyadan keyin qayta urinish mumkin. */
  retryAfterSeconds: number;
};

/**
 * Fixed-window tezlik cheklagichi. `key` (mas. IP yoki user id) bo'yicha
 * `windowMs` oynasida ko'pi bilan `limit` so'rovga ruxsat beradi.
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now: number = Date.now(),
): RateLimitResult {
  purgeExpiredBuckets(now);

  const existing = buckets.get(key);
  if (!existing || now >= existing.resetAt) {
    if (buckets.size >= MAX_TRACKED_KEYS) {
      // Eng eski (birinchi qo'shilgan) yozuvni tashlaymiz — xotira tiyilishi.
      const oldest = buckets.keys().next().value;
      if (oldest !== undefined) buckets.delete(oldest);
    }
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

function purgeExpiredBuckets(now: number): void {
  for (const [key, bucket] of buckets) {
    if (now >= bucket.resetAt) buckets.delete(key);
  }
}

// --- Bir martalik (replay) nazorati ----------------------------------------

const seen = new Map<string, number>(); // key -> expiresAt (ms)

/**
 * `key` (mas. payload hash'i) shu jarayonda birinchi marta ko'rilsa `true`
 * qaytaradi va uni `ttlMs` davomida eslab qoladi; takroran kelsa `false`
 * (replay). Eskirgan yozuvlar avtomatik tozalanadi.
 */
export function markSeenOnce(
  key: string,
  ttlMs: number,
  now: number = Date.now(),
): boolean {
  for (const [k, exp] of seen) {
    if (now >= exp) seen.delete(k);
  }
  if (seen.has(key)) return false;
  if (seen.size >= MAX_TRACKED_KEYS) {
    const oldest = seen.keys().next().value;
    if (oldest !== undefined) seen.delete(oldest);
  }
  seen.set(key, now + ttlMs);
  return true;
}

/** So'rovdan client IP'sini (best-effort) chiqaradi — rate-limit kaliti uchun. */
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}
