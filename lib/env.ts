/**
 * Markazlashgan muhit o'zgaruvchilari. Sirlar hardcode QILINMAYDI — faqat o'qiladi.
 * Server tomonida ishlaydi (worker + API). Frontendga faqat NEXT_PUBLIC_* chiqadi.
 */

function required(name: string): string {
  const v = process.env[name];
  if (!v) {
    // Build paytida bo'sh bo'lishi mumkin; runtime'da kerak bo'lganda tekshiriladi.
    return "";
  }
  return v;
}

export const env = {
  DATABASE_URL: required("DATABASE_URL"),
  APP_BASE_URL: process.env.APP_BASE_URL || "http://localhost:3000",
  ENCRYPTION_KEY: required("ENCRYPTION_KEY"),

  CLERK_WEBHOOK_SECRET: required("CLERK_WEBHOOK_SECRET"),

  TELEGRAM_BOT_TOKEN: required("TELEGRAM_BOT_TOKEN"),
  TELEGRAM_BOT_USERNAME: required("TELEGRAM_BOT_USERNAME"),

  META_APP_ID: required("META_APP_ID"),
  META_APP_SECRET: required("META_APP_SECRET"),
  META_OAUTH_REDIRECT_URI: required("META_OAUTH_REDIRECT_URI"),
  META_WEBHOOK_VERIFY_TOKEN: required("META_WEBHOOK_VERIFY_TOKEN"),

  BITRIX_CLIENT_ID: required("BITRIX_CLIENT_ID"),
  BITRIX_CLIENT_SECRET: required("BITRIX_CLIENT_SECRET"),
  BITRIX_OAUTH_REDIRECT_URI: required("BITRIX_OAUTH_REDIRECT_URI"),

  AMO_CLIENT_ID: required("AMO_CLIENT_ID"),
  AMO_CLIENT_SECRET: required("AMO_CLIENT_SECRET"),
  AMO_OAUTH_REDIRECT_URI: required("AMO_OAUTH_REDIRECT_URI"),

  /** Dev: real OAuth/Meta/CRM o'rniga mock/seed bilan ishlash (Meta App Review kutilayotganda). */
  MOCK_INTEGRATIONS: process.env.MOCK_INTEGRATIONS === "true",
} as const;

export function isMock(): boolean {
  return env.MOCK_INTEGRATIONS;
}
