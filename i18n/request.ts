import { promises as fs } from "node:fs";
import path from "node:path";
import { getRequestConfig } from "next-intl/server";

export const defaultLocale = "uz" as const;
export const locales = ["uz", "ru"] as const;
export type Locale = (typeof locales)[number];

type Messages = { [key: string]: string | Messages };

const MESSAGES_ROOT = path.join(process.cwd(), "messages");

/**
 * Bitta locale uchun messages/<locale>/ ichidagi HAR bir .json faylni o'qib,
 * fayl nomini (kengaytmasiz) namespace sifatida ishlatib birlashtiradi.
 * Masalan messages/uz/nav.json → { nav: { ... } }.
 *
 * Shunday qilib yangi namespace fayli qo'shilsa, bu yerni tahrirlamasdan
 * avtomatik o'qiladi. Fayl bo'lmasa bo'sh obyekt qaytadi (graceful).
 */
async function loadLocaleMessages(locale: Locale): Promise<Messages> {
  const dir = path.join(MESSAGES_ROOT, locale);
  const messages: Messages = {};

  let entries: string[];
  try {
    entries = await fs.readdir(dir);
  } catch {
    // Locale papkasi hali yo'q — bo'sh xabarlar bilan davom etamiz.
    return messages;
  }

  const jsonFiles = entries.filter((name) => name.endsWith(".json")).sort();

  for (const file of jsonFiles) {
    const namespace = path.basename(file, ".json");
    try {
      const raw = await fs.readFile(path.join(dir, file), "utf8");
      const parsed = JSON.parse(raw) as unknown;
      // Bir namespace bir nechta faylda bo'lsa — chuqur birlashtiramiz.
      messages[namespace] = deepMerge(
        (messages[namespace] as Messages) ?? {},
        parsed,
      );
    } catch (err) {
      // Buzilgan/bo'sh faylni jim o'tkazib yubormaymiz: build'da ko'rinsin.
      console.error(`[i18n] Failed to load ${locale}/${file}:`, err);
    }
  }

  return messages;
}

/** Ikki obyektni chuqur birlashtiradi (massiv/skalar — ustun qiymat g'olib). */
function deepMerge(target: Messages, source: unknown): Messages {
  if (!isPlainObject(source)) return target;
  const out: Messages = { ...target };
  for (const [key, value] of Object.entries(source)) {
    const existing = out[key];
    if (isPlainObject(existing) && isPlainObject(value)) {
      out[key] = deepMerge(existing as Messages, value);
    } else {
      out[key] = value;
    }
  }
  return out;
}

function isPlainObject(value: unknown): value is Messages {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

export default getRequestConfig(async () => {
  // v1: yagona UI tili — o'zbekcha (rus tarjimalari mavjud, keyin yoqiladi).
  const locale = defaultLocale;
  return {
    locale,
    messages: await loadLocaleMessages(locale),
  };
});
